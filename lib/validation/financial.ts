import { z } from "zod";

// Mesmo padrão de null-vs-string-vazia já corrigido em patients/hospitals/
// insurance-providers/suppliers: `v === null` também conta como "não
// informado" (campo ausente do FormData), não só string vazia.
const optionalText = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalDate = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalNumber = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : Number(v)),
  z.number().nonnegative().optional()
);

const requiredNumber = z.preprocess(
  (v) => (typeof v === "string" ? Number(v) : v),
  z.number().nonnegative()
);

export const convenioValuesSchema = z.object({
  expected_value: optionalNumber,
  authorized_value: optionalNumber,
  discount_value: optionalNumber,
  adjusted_value: optionalNumber,
  payment_method: optionalText,
  notes: optionalText,
});

export const generateInstallmentsSchema = z.object({
  total_amount: requiredNumber,
  count: z.preprocess((v) => (typeof v === "string" ? Number(v) : v), z.number().int().min(1).max(60)),
  first_due_date: z.string().min(1, "Informe a data da primeira parcela."),
});

export const installmentPaymentSchema = z.object({
  amount: requiredNumber,
  received_at: z.string().min(1, "Informe a data do recebimento."),
});

export const insuranceBillingSchema = z.object({
  tuss_code: optionalText,
  guide_number: optionalText,
  protocol_number: optionalText,
  billed_at: optionalDate,
  expected_payment_date: optionalDate,
  received_at: optionalDate,
  received_value: optionalNumber,
  notes: optionalText,
});

export const createGlosaSchema = z.object({
  guide_number: optionalText,
  billed_value: optionalNumber,
  glosa_value: requiredNumber,
  reason: optionalText,
  glosa_date: z.string().min(1, "Informe a data da glosa."),
});

export const glosaAppealSchema = z.object({
  appeal_date: z.string().min(1, "Informe a data do recurso."),
  justification: optionalText,
});

export const glosaResolveSchema = z.object({
  status: z.enum(["recovered", "upheld"]),
  recovered_value: optionalNumber,
  recovered_at: optionalDate,
});
