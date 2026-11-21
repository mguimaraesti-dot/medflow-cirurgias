import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

export const hospitalSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do hospital."),
  cnpj: optionalText,
  address: optionalText,
  phone: optionalText,
  admin_contact: optionalText,
  or_contact: optionalText,
  email: z.preprocess(
    (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    z.string().email("E-mail inválido.").optional()
  ),
  notes: optionalText,
  active: z
    .union([z.literal("on"), z.literal("true"), z.literal(true), z.undefined(), z.null()])
    .transform((v) => v === "on" || v === "true" || v === true),
});

export type HospitalInput = z.infer<typeof hospitalSchema>;
