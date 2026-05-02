import { z } from "zod";

export const fullRegistrationSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(6, "Teléfono requerido"),
  gender: z.enum(["M", "F", "UNSPECIFIED"]).default("UNSPECIFIED"),
  dateOfBirth: z.string().optional(),
  birthPlace: z.string().optional(),
  citizenship: z.string().optional(),
  country: z.string().default("COL"),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  peselNumber: z.string().optional(),
  recruitmentSource: z
    .enum(["WHATSAPP", "EMAIL", "REFERRAL", "GOOGLE_ADS", "WEBSITE", "OTHER"])
    .optional(),
  accommodation: z.string().optional(),
  arrivalNotes: z.string().optional(),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar el consentimiento GDPR/RODO" }),
  } as any),
});

export type FullRegistrationData = z.infer<typeof fullRegistrationSchema>;