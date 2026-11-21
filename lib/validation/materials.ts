import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

export const materialSchema = z.object({
  internal_code: optionalText,
  name: z.string().trim().min(1, "Informe o nome do material."),
  category: optionalText,
  description: optionalText,
  unit: optionalText,
  notes: optionalText,
  tuss_code: optionalText,
  manufacturer: optionalText,
  model: optionalText,
  anvisa_registration: optionalText,
  active: z
    .union([z.literal("on"), z.literal("true"), z.literal(true), z.undefined(), z.null()])
    .transform((v) => v === "on" || v === "true" || v === true),
});

export type MaterialInput = z.infer<typeof materialSchema>;

export const materialSupplierSchema = z.object({
  material_id: z.string().uuid(),
  supplier_id: z.string().uuid("Selecione um fornecedor."),
  preferred: z
    .union([z.literal("on"), z.literal("true"), z.literal(true), z.undefined(), z.null()])
    .transform((v) => v === "on" || v === "true" || v === true),
});
