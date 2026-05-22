import { z } from "zod";
import { RecruitmentSource } from "@prisma/client";

export const candidateRegistrationSchema = z.object({
  firstName: z.string().min(2, "El nombre es obligatorio"),
  lastName: z.string().min(2, "El apellido es obligatorio"),
  email: z.string().email("Email invalido").nullable().or(z.literal("")),
  phone: z.string().min(6, "Telefono invalido"),
  gender: z.string().min(1, "Seleccione genero"),
  dateOfBirth: z.string().min(1, "Fecha de nacimiento obligatoria"),
  birthPlace: z.string().min(2, "Lugar de nacimiento obligatorio"),
  birthCountry: z.string().min(2, "Pais de nacimiento obligatorio"),
  citizenship: z.string().min(2, "Ciudadania obligatoria"),
  nationality: z.string().min(2, "Nacionalidad obligatoria"),
  country: z.string().min(2, "Pais actual obligatorio"),
  locationStatus: z.enum(["EN_ORIGEN", "EN_TRANSITO", "EN_POLONIA"]),
  polishAddress: z.string().optional(),
  polishCity: z.string().optional(),

  // Passport
  passportNumber: z.string().min(5, "Numero de pasaporte obligatorio"),
  passportIssueDate: z.string().optional(),
  passportExpiry: z.string().min(1, "Fecha de expiracion obligatoria"),
  passportBiometric: z.boolean().default(false),

  // Karta Pobytu
  kartaPobytuNumber: z.string().optional(),
  kartaPobytuIssueDate: z.string().optional(),
  kartaPobytuExpiry: z.string().optional(),
  kartaPobytuType: z.string().optional(),

  // Other IDs
  peselNumber: z.string().optional(),

  // Voivodato
  voivodatoNumber: z.string().optional(),
  voivodatoIssueDate: z.string().optional(),
  voivodatoExpiry: z.string().optional(),
  voivodatoStatus: z.string().optional(),

  // Recruitment
  recruitmentSource: z.nativeEnum(RecruitmentSource).optional(),

  // Arrival
  arrivalDate: z.string().optional(),
  arrivalNotes: z.string().optional(),
  accommodation: z.string().optional(),
  accommodationNotes: z.string().optional(),

  // Payment
  paid400pln: z.boolean().default(false),
  paymentDate: z.string().optional(),

  // Consent
  gdprConsent: z.boolean().refine((value) => value === true, {
    message: "Debe aceptar los terminos de GDPR para continuar",
  }),
});

export type CandidateRegistrationData = z.infer<typeof candidateRegistrationSchema>;
