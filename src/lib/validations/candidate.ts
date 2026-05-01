import { z } from "zod";

export const candidateSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres").max(100),
  lastName: z.string().min(2, "Mínimo 2 caracteres").max(100),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  country: z.enum(["Colombia", "Perú", "Guatemala", "Venezuela", "Cuba", "Otro"]),
  locationStatus: z.enum(["EN_POLONIA", "EN_ORIGEN", "EN_TRANSITO"]).default("EN_ORIGEN"),
  passportNumber: z.string().optional(),
  peselNumber: z.string().optional(),
  voivodatoNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type CandidateInput = z.infer<typeof candidateSchema>;
