import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional()
);

const optionalUuid = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().uuid().optional()
);

export const protocolSchema = z.object({
  procedure_id: z.string().uuid("Selecione o procedimento."),
  hospital_id: optionalUuid,
  name: z.string().trim().min(1, "Dê um nome ao protocolo."),
});
export type ProtocolInput = z.infer<typeof protocolSchema>;

export const protocolItemSchema = z.object({
  material_id: z.string().uuid("Selecione um material."),
  quantity: z.preprocess((v) => Number(v), z.number().positive().default(1)),
  unit: optionalText,
  specs: optionalText,
  preferred_supplier_id: optionalUuid,
  notes: optionalText,
});
export type ProtocolItemInput = z.infer<typeof protocolItemSchema>;
