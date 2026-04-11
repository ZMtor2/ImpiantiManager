import { z } from "zod";

export const PlantSchema = z.object({
  codice: z.string().optional().nullable(),
  alias: z.string().optional().nullable(),
  indirizzo: z.string().min(1, "Indirizzo richiesto"),
  citta: z.string().min(1, "Città richiesta"),
  provincia: z.string().length(2, "Inserire sigla provincia (2 lettere)").transform(v => v.toUpperCase()),
  cap: z.string().optional().nullable(),
  compagniaId: z.string().min(1, "Compagnia richiesta"),
  codiceImpiantoCompagnia: z.string().optional().nullable(),
  ispettoreZona: z.string().optional().nullable(),
  proprietarioId: z.string().optional().nullable(),
  gestoreId: z.string().optional().nullable(),
  clienteManutenzione: z.enum(["PROPRIETARIO", "GESTORE"]).optional().nullable(),
  tipoImpianto: z.enum(["STRADALE","AUTOSTRADALE","PRIVATO","INDUSTRIALE","NAUTICO","AEROPORTUALE"]).default("STRADALE"),
  stato: z.enum(["ATTIVO","INATTIVO","DISMESSO"]).default("ATTIVO"),
  numeroAutorizzazione: z.string().optional().nullable(),
  dataApertura: z.string().optional().nullable(),
  noteGenerali: z.string().optional().nullable(),
});

export type PlantInput = z.infer<typeof PlantSchema>;
