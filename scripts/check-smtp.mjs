import "dotenv/config";

import { randomUUID } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

const SMTP_TIMEOUT_MS = 20_000;

function requireValue(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function getConfig() {
  const host = requireValue("SMTP_HOST");
  const user = requireValue("SMTP_USER");
  const pass = process.env.SMTP_PASS;
  const from = requireValue("SMTP_FROM");
  const port = Number(process.env.SMTP_PORT || "587");

  if (!pass) throw new Error("SMTP_PASS is required.");
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port.");
  }

  return {
    host,
    user,
    pass,
    from,
    fromName: process.env.SMTP_FROM_NAME?.trim() || "ORI CRUIT HUB",
    port,
    secure: process.env.SMTP_SECURE === "true" || (!process.env.SMTP_SECURE && port === 465),
  };
}

function getRecipient() {
  const recipient = process.argv[2]?.trim();
  if (!recipient) {
    throw new Error("Usage: npm run check:smtp -- recipient@example.com");
  }
  return recipient;
}

function cleanHeader(value) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function formatAddress(email, name) {
  const cleanedEmail = cleanHeader(email);
  return name ? `${cleanHeader(name)} <${cleanedEmail}>` : `<${cleanedEmail}>`;
}

function sanitizeResponse(response) {
  return response.replace(/\r?\n/g, " ").slice(0, 220);
}

function smtpCode(response) {
  const match = response.match(/^(\d{3})/m);
  return match ? Number(match[1]) : 0;
}

function openConnection(config) {
  return new Promise((resolve, reject) => {
    const onConnect = (socket) => {
      socket.setTimeout(SMTP_TIMEOUT_MS);
      resolve(socket);
    };

    if (config.secure) {
      const socket = tls.connect(
        { host: config.host, port: config.port, servername: config.host },
        () => onConnect(socket),
      );
      socket.once("error", reject);
      return;
    }

    const socket = net.createConnection(
      { host: config.host, port: config.port },
      () => onConnect(socket),
    );
    socket.once("error", reject);
  });
}

function waitForResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("timeout", onTimeout);
    };

    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1] || "";
      if (/^\d{3} /.test(lastLine)) {
        cleanup();
        resolve(buffer);
      }
    };

    const onError = (error) => {
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

async function expectResponse(socket, codes, step) {
  const response = await waitForResponse(socket);
  const code = smtpCode(response);
  if (!codes.includes(code)) {
    throw new Error(`${step}: ${sanitizeResponse(response)}`);
  }
  return response;
}

async function sendCommand(socket, command, codes, step) {
  socket.write(`${command}\r\n`);
  return expectResponse(socket, codes, step);
}

function upgradeToTls(socket, host) {
  return new Promise((resolve, reject) => {
    const tlsSocket = tls.connect({ socket, servername: host }, () => {
      tlsSocket.setTimeout(SMTP_TIMEOUT_MS);
      resolve(tlsSocket);
    });
    tlsSocket.once("error", reject);
  });
}

async function authenticate(socket, config) {
  const plainToken = Buffer.from(`\0${config.user}\0${config.pass}`, "utf8").toString("base64");

  try {
    await sendCommand(socket, `AUTH PLAIN ${plainToken}`, [235], "AUTH PLAIN");
    return;
  } catch {
    await sendCommand(socket, "AUTH LOGIN", [334], "AUTH LOGIN");
    await sendCommand(socket, Buffer.from(config.user, "utf8").toString("base64"), [334], "AUTH USER");
    await sendCommand(socket, Buffer.from(config.pass, "utf8").toString("base64"), [235], "AUTH PASS");
  }
}

async function sendTestEmail(config, recipient) {
  let socket = await openConnection(config);
  try {
    await expectResponse(socket, [220], "GREETING");
    let ehloResponse = await sendCommand(socket, `EHLO ${config.host}`, [250], "EHLO");

    if (!config.secure && /STARTTLS/im.test(ehloResponse)) {
      await sendCommand(socket, "STARTTLS", [220], "STARTTLS");
      socket = await upgradeToTls(socket, config.host);
      ehloResponse = await sendCommand(socket, `EHLO ${config.host}`, [250], "EHLO TLS");
    }

    if (!/AUTH/im.test(ehloResponse)) {
      throw new Error("SMTP_AUTH_UNAVAILABLE");
    }

    await authenticate(socket, config);
    await sendCommand(socket, `MAIL FROM:<${config.from}>`, [250], "MAIL FROM");
    await sendCommand(socket, `RCPT TO:<${recipient}>`, [250, 251], "RCPT TO");

    const messageId = `<${randomUUID()}@${config.host}>`;
    const body = [
      `From: ${formatAddress(config.from, config.fromName)}`,
      `To: ${formatAddress(recipient)}`,
      "Subject: ORI CRUIT HUB SMTP test",
      `Message-ID: ${messageId}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "This is a production SMTP configuration test from ORI CRUIT HUB.",
      "",
      "If you received this email, SMTP delivery is working.",
    ].join("\r\n");

    await sendCommand(socket, "DATA", [354], "DATA");
    socket.write(`${body}\r\n.\r\n`);
    await expectResponse(socket, [250], "MESSAGE BODY");
    await sendCommand(socket, "QUIT", [221], "QUIT");
    socket.end();
    return messageId;
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

const recipient = getRecipient();
const messageId = await sendTestEmail(getConfig(), recipient);
console.log("SMTP test sent successfully.");
console.log(`Message ID: ${messageId}`);
