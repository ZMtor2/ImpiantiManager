import { z } from "zod";

export const NetworkDeviceSchema = z.object({
  etichetta: z.string().min(1, "Etichetta richiesta"),
  tipoDispositivo: z.enum(["PC","POS","ROUTER","SWITCH","COLONNINA","EROGATORE","STAMPANTE","TELECAMERA","ALTRO"]),
  matricola: z.string().optional().nullable(),
  indirizzoIp: z.string().min(1, "Indirizzo IP richiesto").regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Formato IP non valido"),
  macAddress: z.string().optional().nullable(),
  subnetMask: z.string().optional().nullable(),
  gateway: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  equipmentId: z.string().optional().nullable(),
});

export type NetworkDeviceInput = z.infer<typeof NetworkDeviceSchema>;
