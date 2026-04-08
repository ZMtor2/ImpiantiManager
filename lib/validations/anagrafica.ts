import { z } from "zod";

export const AnagraficaContactSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, "Nome richiesto"),
  ruolo: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  note: z.string().optional(),
});

export const AnagraficaSchema = z.object({
  ragioneSociale: z.string().min(1, "Ragione sociale richiesta"),
  partitaIva: z.string().optional().nullable(),
  codiceFiscale: z.string().optional().nullable(),
  indirizzo: z.string().optional(),
  citta: z.string().optional(),
  provincia: z.string().optional(),
  cap: z.string().optional(),
  note: z.string().optional(),
  contatti: z.array(AnagraficaContactSchema).default([]),
});

export type AnagraficaInput = z.infer<typeof AnagraficaSchema>;
export type AnagraficaContactInput = z.infer<typeof AnagraficaContactSchema>;
