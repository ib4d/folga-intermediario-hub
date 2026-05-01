import { z } from "zod";

// PÁGINA 1 — DATOS BÁSICOS
export const page1Schema = z.object({
  email: z.string().email("Formato de correo inválido"),
  firstName: z.string().min(2, "Campo obligatorio"),
  lastName: z.string().min(2, "Campo obligatorio"),
  gender: z.enum(["Hombre", "Mujer"]),
  dateOfBirth: z.string().refine((d) => !isNaN(Date.parse(d)), "Fecha inválida"),
  birthPlace: z.string().min(2, "Campo obligatorio"),
  birthCountry: z.string().min(2, "Campo obligatorio"),
  citizenship: z.string().min(2, "Campo obligatorio"),
  nationality: z.string().min(2, "Campo obligatorio"),
  heightCm: z.coerce.number().min(100).max(250),
});

// PÁGINA 2 — CONTACTO
export const page2Schema = z.object({
  phone: z.string().min(7, "Teléfono inválido"),
  whatsapp: z.string().optional(),
  country: z.enum([
    "Colombia", "Perú", "Guatemala", "Venezuela", "Cuba",
    "Bolivia", "Ecuador", "Brasil", "México", "Argentina", "Otro",
  ]),
  currentCity: z.string().min(2, "Campo obligatorio"),
  polishAddress: z.string().optional(),
  polishCity: z.string().optional(),
  locationStatus: z.enum(["EN_POLONIA", "EN_ORIGEN", "EN_TRANSITO"]),
});

// PÁGINA 3 — DATOS PASAPORTE
export const page3Schema = z.object({
  passportNumber: z.string().min(5, "Número de pasaporte requerido"),
  passportCountry: z.string().min(2, "Campo obligatorio"),
  passportIssueDate: z.string().optional(),
  passportExpiry: z.string().refine((d) => !isNaN(Date.parse(d)), "Fecha inválida"),
  passportHasVisa: z.enum(["Sí", "No"]),
});

// PÁGINA 4 — DOCUMENTOS POLACOS (si aplica)
export const page4Schema = z.object({
  hasPesel: z.enum(["Sí", "No"]),
  peselNumber: z.string().optional(),
  hasKartaPobytu: z.enum(["Sí", "No"]),
  kartaPobytuExpiry: z.string().optional(),
  hasVoivodatoDecision: z.enum(["Sí", "No", "En proceso"]).optional(),
  voivodatoNumber: z.string().optional(),
  voivodatoDecisionDate: z.string().optional(),
});

// PÁGINA 5 — HISTORIAL LABORAL
export const page5Schema = z.object({
  hasWorkedForFolga: z.enum(["Sí", "No"]),
  previousFolgaDate: z.string().optional(),
  currentOccupation: z.string().optional(),
  workExperience: z.string().optional(),
});

// PÁGINA 6 — DISPONIBILIDAD Y LOGÍSTICA
export const page6Schema = z.object({
  availableFrom: z.string().optional(),
  travelMethod: z.enum(["Avión", "Tren", "Coche propio", "Otro"]).optional(),
  needsAccommodation: z.enum(["Sí", "No"]).optional(),
  canTravelToKutno: z.enum(["Sí", "No", "Necesito apoyo"]).optional(),
});

// PÁGINA 7 — PAGO 400 PLN
export const page7Schema = z.object({
  understands400pln: z.literal("Sí", {
    message: "Debes confirmar el pago para continuar",
  }),
  paymentMethod: z.enum(["Transferencia bancaria", "Efectivo en oficina", "Por confirmar"]).optional(),
});

// PÁGINA 8 — CONSENTIMIENTO GDPR / RODO
export const page8Schema = z.object({
  gdprConsent: z.literal("true", {
    message: "Debes aceptar el tratamiento de datos para continuar",
  }),
  dataAccuracy: z.literal("true", {
    message: "Debes confirmar la veracidad de los datos",
  }),
});

// Schema completo
export const fullRegistrationSchema = page1Schema
  .merge(page2Schema)
  .merge(page3Schema)
  .merge(page4Schema)
  .merge(page5Schema)
  .merge(page6Schema)
  .merge(page7Schema)
  .merge(page8Schema);

export type RegistrationData = z.infer<typeof fullRegistrationSchema>;
