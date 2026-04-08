import { z } from "zod";

export const EquipmentProductSchema = z.object({
  id: z.string().optional(),
  lato: z.string().min(1),
  numeroPistola: z.number().int().positive(),
  tipoCarburante: z.enum(["BENZINA","DIESEL","GPL","METANO","ADBLUE","ELETTRICO","ALTRO"]),
});

export const BankingTerminalSchema = z.object({
  codiceTerminale: z.string().optional().nullable(),
  bancaCircuito: z.string().optional().nullable(),
  tipoConnessione: z.string().optional().nullable(),
  framingMessaggi: z.enum(["BT","TESTATA_IP"]).optional().nullable(),
  indirizzoIp: z.string().optional().nullable(),
  porta: z.number().int().optional().nullable(),
});

export const PetroleumTerminalSchema = z.object({
  codiceTerminale: z.string().optional().nullable(),
  protocolloComunicazione: z.string().optional().nullable(),
  indirizzoIp: z.string().optional().nullable(),
  porta: z.number().int().optional().nullable(),
});

export const GestionaleRouteSchema = z.object({
  id: z.string().optional(),
  reteDestinazione: z.string().min(1),
  gateway: z.string().min(1),
  interfaccia: z.string().optional().nullable(),
  descrizione: z.string().optional().nullable(),
});

export const SchedaMacchinaSchema = z.object({
  indirizzoIpPc: z.string().optional().nullable(),
  usernameSistema: z.string().optional().nullable(),
  passwordSistema: z.string().optional().nullable(),
  passwordPumapro: z.string().optional().nullable(),
  passwordAdmin: z.string().optional().nullable(),
  tipoAccessoRemoto: z.string().optional().nullable(),
  portaAccessoRemoto: z.number().int().optional().nullable(),
  subnetMask: z.string().optional().nullable(),
  gateway: z.string().optional().nullable(),
  dnsPrimario: z.string().optional().nullable(),
  dnsSecondario: z.string().optional().nullable(),
  tipoRete: z.string().optional().nullable(),
  versioneSoftware: z.string().optional().nullable(),
  numeroLicenza: z.string().optional().nullable(),
  scadenzaLicenza: z.string().optional().nullable(),
  rotte: z.array(GestionaleRouteSchema).default([]),
});

export const EquipmentSchema = z.object({
  tipo: z.enum(["EROGATORE","SERBATOIO","COLONNINA_PAGAMENTO","GESTIONALE","CENTRALINA_LIVELLO","POMPA","ALTRO"]),
  tipoErogatore: z.enum(["MONOPRODOTTO","MULTIPRODOTTO","SELF_SERVICE","AUTOMATICO"]).optional().nullable(),
  marca: z.string().optional().nullable(),
  modello: z.string().optional().nullable(),
  matricola: z.string().optional().nullable(),
  annoInstallazione: z.number().int().optional().nullable(),
  stato: z.enum(["FUNZIONANTE","GUASTO","IN_MANUTENZIONE","DISMESSO"]).default("FUNZIONANTE"),
  posizione: z.string().optional().nullable(),
  modalitaConnessione: z.enum(["RETE_IP","SERIALE_GESTIONALE","STANDALONE"]).optional().nullable(),
  note: z.string().optional().nullable(),
  tipoCarburante: z.enum(["BENZINA","DIESEL","GPL","METANO","ADBLUE","ELETTRICO","ALTRO"]).optional().nullable(),
  capacitaLitri: z.number().optional().nullable(),
  pistole: z.array(EquipmentProductSchema).optional(),
  terminaleBank: BankingTerminalSchema.optional().nullable(),
  terminalePetrolio: PetroleumTerminalSchema.optional().nullable(),
  schedaMacchina: SchedaMacchinaSchema.optional().nullable(),
});

export type EquipmentInput = z.infer<typeof EquipmentSchema>;
export type EquipmentProductInput = z.infer<typeof EquipmentProductSchema>;
export type SchedaMacchinaInput = z.infer<typeof SchedaMacchinaSchema>;
export type GestionaleRouteInput = z.infer<typeof GestionaleRouteSchema>;
