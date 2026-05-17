import { sendEmail as sendSmtpEmail, type EmailPayload, type EmailResult } from "@/lib/email/sender";

export type EmailProviderName = "smtp";

export interface EmailProvider {
  readonly name: EmailProviderName;
  send(payload: EmailPayload): Promise<EmailResult>;
}

class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp" as const;

  send(payload: EmailPayload) {
    return sendSmtpEmail(payload);
  }
}

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || "smtp";

  if (provider !== "smtp") {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }

  return new SmtpEmailProvider();
}

export function sendTransactionalEmail(payload: EmailPayload) {
  return getEmailProvider().send(payload);
}
