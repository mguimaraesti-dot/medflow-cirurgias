import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (typeof v !== "string" || v.trim() === "" ? undefined : v),
  z.string().optional()
);

const optionalUuid = z.preprocess(
  (v) => (typeof v !== "string" || v.trim() === "" ? undefined : v),
  z.string().uuid().optional()
);

export const procedureDefaultMaterialSchema = z.object({
  material_id: z.string().uuid("Selecione um material."),
  quantity: z.preprocess((v) => Number(v), z.number().positive().default(1)),
  unit: optionalText,
  specs: optionalText,
  preferred_supplier_id: optionalUuid,
  notes: optionalText,
});
export type ProcedureDefaultMaterialInput = z.infer<typeof procedureDefaultMaterialSchema>;
