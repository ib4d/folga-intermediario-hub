import { randomUUID } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

/**
 * ORI CRUIT HUB Email Service
 * Supports direct SMTP delivery through environment configuration.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
  allowInsecure: boolean;
}

type SmtpConnection = net.Socket | tls.TLSSocket;

const SMTP_TIMEOUT_MS = 20_000;

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  const parsedPort = Number(process.env.SMTP_PORT || "587");
  const port = Number.isFinite(parsedPort) ? parsedPort : 587;
  const secure =
    process.env.SMTP_SECURE === "true" ||
    (!process.env.SMTP_SECURE && port === 465);
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(host);

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: process.env.SMTP_FROM?.trim() || user,
    fromName: process.env.SMTP_FROM_NAME?.trim() || "ORI CRUIT HUB",
    allowInsecure: isLocalHost || process.env.SMTP_ALLOW_INSECURE === "true",
  };
}

function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string) {
  const cleaned = cleanHeader(value);
  if (/^[\x20-\x7E]*$/.test(cleaned)) return cleaned;
  return `=?UTF-8?B?${Buffer.from(cleaned, "utf8").toString("base64")}?=`;
}

function formatAddress(email: string, name?: string) {
  const cleanedEmail = cleanHeader(email);
  return name ? `${encodeHeader(name)} <${cleanedEmail}>` : `<${cleanedEmail}>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(value: string) {
  return escapeHtml(value)
    .split(/\r?\n/)
    .map((line) => (line ? `<p>${line}</p>` : "<br>"))
    .join("\n");
}

function normalizeRecipients(to: string) {
  return to
    .split(/[;,]/)
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

function createMessage(payload: EmailPayload, config: SmtpConfig, recipients: string[]) {
  const boundary = `folga-${randomUUID()}`;
  const messageId = `<${randomUUID()}@${config.host}>`;
  const textBody = payload.body.replace(/\r?\n/g, "\r\n");
  const htmlBody = textToHtml(payload.body).replace(/\r?\n/g, "\r\n");
  const headers = [
    `From: ${formatAddress(config.from, config.fromName)}`,
    `To: ${recipients.map((recipient) => formatAddress(recipient)).join(", ")}`,
    `Subject: ${encodeHeader(payload.subject)}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const body = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    textBody,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    htmlBody,
    `--${boundary}--`,
    "",
  ];

  return {
    messageId,
    data: [...headers, "", ...body].join("\r\n").replace(/^\./gm, ".."),
  };
}

function smtpCode(response: string) {
  const match = response.match(/^(\d{3})/m);
  return match ? Number(match[1]) : 0;
}

function sanitizeSmtpResponse(response: string) {
  return response.replace(/\r?\n/g, " ").slice(0, 220);
}

function waitForResponse(socket: SmtpConnection): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("timeout", onTimeout);
    };

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1] || "";

      if (/^\d{3} /.test(lastLine)) {
        cleanup();
        resolve(buffer);
      }
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onTimeout = () => {
      cleanup();
      reject(new Error("SMTP_TIMEOUT"));
    };

    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
  });
}

async function expectResponse(
  socket: SmtpConnection,
  acceptedCodes: number[],
  step: string
) {
  const response = await waitForResponse(socket);
  const code = smtpCode(response);

  if (!acceptedCodes.includes(code)) {
    throw new Error(`${step}: ${sanitizeSmtpResponse(response)}`);
  }

  return response;
}

async function sendCommand(
  socket: SmtpConnection,
  command: string,
  acceptedCodes: number[],
  step: string
) {
  socket.write(`${command}\r\n`);
  return expectResponse(socket, acceptedCodes, step);
}

function openConnection(config: SmtpConfig): Promise<SmtpConnection> {
  return new Promise((resolve, reject) => {
    const onConnect = (socket: SmtpConnection) => {
      socket.setTimeout(SMTP_TIMEOUT_MS);
      resolve(socket);
    };

    const onError = (error: Error) => reject(error);

    if (config.secure) {
      const socket = tls.connect(
        { host: config.host, port: config.port, servername: config.host },
        () => onConnect(socket)
      );
      socket.once("error", onError);
      return;
    }

    const socket = net.createConnection(
      { host: config.host, port: config.port },
      () => onConnect(socket)
    );
    socket.once("error", onError);
  });
}

function upgradeToTls(socket: SmtpConnection, host: string): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const tlsSocket = tls.connect({ socket, servername: host }, () => {
      tlsSocket.setTimeout(SMTP_TIMEOUT_MS);
      resolve(tlsSocket);
    });
    tlsSocket.once("error", reject);
  });
}

async function authenticate(socket: SmtpConnection, config: SmtpConfig) {
  const plainToken = Buffer.from(`\0${config.user}\0${config.pass}`, "utf8").toString("base64");

  try {
    await sendCommand(socket, `AUTH PLAIN ${plainToken}`, [235], "AUTH PLAIN");
    return;
  } catch {
    await sendCommand(socket, "AUTH LOGIN", [334], "AUTH LOGIN");
    await sendCommand(
      socket,
      Buffer.from(config.user, "utf8").toString("base64"),
      [334],
      "AUTH USER"
    );
    await sendCommand(
      socket,
      Buffer.from(config.pass, "utf8").toString("base64"),
      [235],
      "AUTH PASS"
    );
  }
}

async function sendViaSmtp(payload: EmailPayload, config: SmtpConfig): Promise<EmailResult> {
  const recipients = normalizeRecipients(payload.to);
  if (recipients.length === 0) {
    return { success: false, error: "EMAIL_RECIPIENT_REQUIRED" };
  }

  let socket: SmtpConnection | null = null;

  try {
    socket = await openConnection(config);
    await expectResponse(socket, [220], "GREETING");

    let ehloResponse = await sendCommand(socket, `EHLO ${config.host}`, [250], "EHLO");

    if (!config.secure && /STARTTLS/im.test(ehloResponse)) {
      await sendCommand(socket, "STARTTLS", [220], "STARTTLS");
      socket = await upgradeToTls(socket, config.host);
      ehloResponse = await sendCommand(socket, `EHLO ${config.host}`, [250], "EHLO TLS");
    }

    if (!config.secure && !config.allowInsecure && !("encrypted" in socket && socket.encrypted)) {
      throw new Error("SMTP_STARTTLS_UNAVAILABLE");
    }

    if (!/AUTH/im.test(ehloResponse)) {
      throw new Error("SMTP_AUTH_UNAVAILABLE");
    }

    await authenticate(socket, config);
    await sendCommand(socket, `MAIL FROM:<${config.from}>`, [250], "MAIL FROM");

    for (const recipient of recipients) {
      await sendCommand(socket, `RCPT TO:<${recipient}>`, [250, 251], "RCPT TO");
    }

    const message = createMessage(payload, config, recipients);
    await sendCommand(socket, "DATA", [354], "DATA");
    socket.write(`${message.data}\r\n.\r\n`);
    await expectResponse(socket, [250], "MESSAGE BODY");
    await sendCommand(socket, "QUIT", [221], "QUIT");
    socket.end();

    return { success: true, messageId: message.messageId };
  } catch (error) {
    socket?.destroy();
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMTP_SEND_FAILED",
    };
  }
}

export async function sendEmail(payload: EmailPayload) {
  const config = getSmtpConfig();

  console.info("[Email Service] Email requested", {
    to: payload.to,
    subject: payload.subject,
    smtpConfigured: Boolean(config),
  });

  if (!config) {
    return {
      success: false,
      error: "SMTP_NOT_CONFIGURED",
    } satisfies EmailResult;
  }

  return sendViaSmtp(payload, config);
}

/**
 * Pre-defined templates
 */
export const EmailTemplates = {
  COLD_OUTREACH: {
    id: "cold-outreach",
    subject: "Tu equipo sigue gestionando candidatos en Excel y WhatsApp?",
  },
  DEMO_INVITE: {
    id: "demo-invite",
    subject: "Tu demo personalizada de ORI CRUIT HUB",
  },
  WELCOME: {
    id: "welcome",
    subject: "Bienvenido a ORI CRUIT HUB - Vamos a configurar tu organizacion",
  },
};
