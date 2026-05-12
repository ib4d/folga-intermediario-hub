declare module "nodemailer" {
  interface TransportOptions {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  }

  interface SendMailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }

  interface SendMailResult {
    messageId: string;
  }

  interface Transporter {
    sendMail(options: SendMailOptions): Promise<SendMailResult>;
  }

  export function createTransport(options: TransportOptions): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}
