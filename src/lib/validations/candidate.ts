import { z } from "zod";

export const candidateSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  gender: z.enum(["M", "F", "UNSPECIFIED"]).optional(),
  country: z.string().default("COL"),
  citizenship: z.string().optional(),
  nationality: z.string().optional(),
  locationStatus: z
    .enum(["EN_ORIGEN", "EN_TRANSITO", "EN_POLONIA"])
    .default("EN_ORIGEN"),
  recruitmentSource: z
    .enum(["WHATSAPP", "EMAIL", "REFERRAL", "GOOGLE_ADS", "WEBSITE", "OTHER"])
    .optional(),
  recruiterId: z.string().optional(),
  notes: z.string().optional(),
});

export const candidateUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  gender: z.enum(["M", "F", "UNSPECIFIED"]).optional(),
  dateOfBirth: z.string().optional(),
  birthPlace: z.string().optional(),
  birthCountry: z.string().optional(),
  citizenship: z.string().optional(),
  nationality: z.string().optional(),
  heightCm: z.coerce.number().int().positive().optional(),
  country: z.string().optional(),
  locationStatus: z
    .enum(["EN_ORIGEN", "EN_TRANSITO", "EN_POLONIA"])
    .optional(),
  polishAddress: z.string().optional(),
  polishCity: z.string().optional(),
  passportNumber: z.string().optional(),
  passportIssueDate: z.string().optional(),
  passportExpiry: z.string().optional(),
  passportBiometric: z.boolean().optional(),
  kartaPobytuNumber: z.string().optional(),
  kartaPobytuIssueDate: z.string().optional(),
  kartaPobytuExpiry: z.string().optional(),
  kartaPobytuType: z.string().optional(),
  peselNumber: z.string().optional(),
  voivodatoNumber: z.string().optional(),
  voivodatoIssueDate: z.string().optional(),
  voivodatoExpiry: z.string().optional(),
  voivodatoStatus: z.string().optional(),
  recruitmentSource: z
    .enum(["WHATSAPP", "EMAIL", "REFERRAL", "GOOGLE_ADS", "WEBSITE", "OTHER"])
    .optional(),
  recruiterId: z.string().optional(),
  arrivalDate: z.string().optional(),
  accommodation: z.string().optional(),
  accommodationNotes: z.string().optional(),
  arrivalNotes: z.string().optional(),
  notes: z.string().optional(),
  paid400pln: z.boolean().optional(),
  paymentDate: z.string().optional(),
  gdprConsent: z.boolean().optional(),
});

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
    errorMap: () => ({ message: "Debes aceptar el consentimiento GDPR" }),
  } as any),
});

export type CandidateFormData = z.infer<typeof candidateSchema>;
export type CandidateUpdateData = z.infer<typeof candidateUpdateSchema>;
export type FullRegistrationData = z.infer<typeof fullRegistrationSchema>;