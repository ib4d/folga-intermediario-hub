/**
 * AI Copy Generator
 * Generates personalized outreach messages for leads
 */

export interface LeadContext {
  name: string;
  company?: string;
  source?: string;
  painPoints?: string[];
}

export function generateOutreachMessage(lead: LeadContext, step: number = 1): string {
  const companyName = lead.company || "tu agencia";
  
  if (step === 1) {
    return `Hola ${lead.name},

He visto que en ${companyName} estáis escalando vuestro reclutamiento internacional. 

Normalmente, el mayor cuello de botella en este punto es el caos de gestionar documentos por WhatsApp y Excel. Hemos creado ORI CRUIT HUB para automatizar precisamente eso: lectura de pasaportes por IA y control logístico centralizado.

¿Te interesaría ver cómo podrías ahorrar unas 10 horas semanales por reclutador con una breve demo?

Un saludo,
[Tu Nombre]`;
  }

  if (step === 2) {
    return `Hola de nuevo ${lead.name},

Te escribo para compartirte algo breve: el 90% de los errores en trámites migratorios vienen de errores al transcribir nombres o números de pasaporte.

Nuestra IA de OCR elimina ese riesgo extrayendo los datos automáticamente. ¿Te gustaría probarlo con un par de documentos reales de ${companyName}?

Saludos,
[Tu Nombre]`;
  }

  return "Hola, seguimos en contacto.";
}
