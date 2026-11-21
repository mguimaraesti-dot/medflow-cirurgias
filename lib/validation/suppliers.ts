import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

export const supplierSchema = z.object({
  company_name: z.string().trim().min(1, "Informe a razão social."),
  trade_name: optionalText,
  cnpj: optionalText,
  contact_name: optionalText,
  phone: optionalText,
  email: z.preprocess(
    (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    z.string().email("E-mail inválido.").optional()
  ),
  address: optionalText,
  notes: optionalText,
  active: z
    .union([z.literal("on"), z.literal("true"), z.literal(true), z.undefined(), z.null()])
    .transform((v) => v === "on" || v === "true" || v === true),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
