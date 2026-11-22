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
  preferred_supplier_id: optionalUuid,
  notes: optionalText,
});
export type ProcedureDefaultMaterialInput = z.infer<typeof procedureDefaultMaterialSchema>;

export const procedureKitSchema = z
  .array(
    z.object({
      material_id: z.string().uuid("Material inválido."),
      quantity: z.number({ message: "Informe a quantidade." }).positive("A quantidade deve ser maior que zero."),
      unit: z.string().trim().max(30).nullable().transform((v) => (v ? v : null)),
      preferred_supplier_id: z.string().uuid().nullable(),
    })
  )
  .refine((items) => new Set(items.map((i) => i.material_id)).size === items.length, "Há material repetido no kit.");
