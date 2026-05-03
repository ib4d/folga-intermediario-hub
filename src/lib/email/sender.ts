/**
 * Folga Hub Email Service
 * structured for future SMTP/SendGrid/Resend integration
 */

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

export async function sendEmail(payload: EmailPayload) {
  console.log(`[Email Service] Attempting to send email to: ${payload.to}`);
  console.log(`[Email Service] Subject: ${payload.subject}`);
  
  // In a real implementation, you would use nodemailer, resend, or aws-ses here.
  // Example with a mock delay:
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`[Email Service] Email sent successfully to ${payload.to}`);
      resolve({ success: true, messageId: `msg_${Math.random().toString(36).substring(7)}` });
    }, 500);
  });
}

/**
 * Pre-defined templates
 */
export const EmailTemplates = {
  COLD_OUTREACH: {
    id: "cold-outreach",
    subject: "¿Sigue tu equipo gestionando candidatos en Excel y WhatsApp?",
  },
  DEMO_INVITE: {
    id: "demo-invite",
    subject: "Tu demo personalizada de Folga Hub",
  },
  WELCOME: {
    id: "welcome",
    subject: "Bienvenido a Folga Hub - Vamos a configurar tu organización",
  }
};
