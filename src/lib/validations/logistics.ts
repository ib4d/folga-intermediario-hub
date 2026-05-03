import { z } from "zod";

export const logisticsEventSchema = z.object({
  candidateId: z.string().min(1, "Candidato es obligatorio"),
  transportType: z.enum(["AVION", "TREN", "COCHE_EMPRESA", "PROPIO"]),
  arrivalDate: z.string().min(1, "Fecha de llegada es obligatoria"),
  terminal: z.string().min(1, "Terminal/Estación es obligatoria"),
  flightOrTrain: z.string().optional(),
  pickedUpBy: z.string().optional(),
  notes: z.string().optional(),
});

export type LogisticsEventData = z.infer<typeof logisticsEventSchema>;
