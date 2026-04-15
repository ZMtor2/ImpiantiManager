import { z } from "zod";

export const AnagraficaContactSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, "Nome richiesto"),
  ruolo: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  note: z.string().optional().nullable(),
});

export const AnagraficaSchema = z.object({
  ragioneSociale: z.string().min(1, "Ragione sociale richiesta"),
  partitaIva: z.string().optional().nullable(),
  codiceFiscale: z.string().optional().nullable(),
  indirizzo: z.string().optional().nullable(),
  citta: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  cap: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  contatti: z.array(AnagraficaContactSchema).default([]),
});

export type AnagraficaInput = z.infer<typeof AnagraficaSchema>;
export type AnagraficaContactInput = z.infer<typeof AnagraficaContactSchema>;
