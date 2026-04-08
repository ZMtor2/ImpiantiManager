import { z } from "zod";

export const CompagniaSchema = z.object({
  nome: z.string().min(1, "Nome richiesto"),
  note: z.string().optional(),
});

export type CompagniaInput = z.infer<typeof CompagniaSchema>;
