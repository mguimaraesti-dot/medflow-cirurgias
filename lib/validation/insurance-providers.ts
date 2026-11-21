import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalInt = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}, z.number().int().nonnegative().optional());

export const insuranceProviderSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da operadora."),
  cnpj: optionalText,
  code: optionalText,
  contacts: optionalText,
  email: z.preprocess(
    (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    z.string().email("E-mail inválido.").optional()
  ),
  phone: optionalText,
  admin_rules: optionalText,
  avg_authorization_days: optionalInt,
  avg_payment_days: optionalInt,
  active: z
    .union([z.literal("on"), z.literal("true"), z.literal(true), z.undefined(), z.null()])
    .transform((v) => v === "on" || v === "true" || v === true),
});

export type InsuranceProviderInput = z.infer<typeof insuranceProviderSchema>;
