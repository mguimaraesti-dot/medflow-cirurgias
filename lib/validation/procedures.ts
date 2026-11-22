import { z } from "zod";

// Especialidade, região, classificação, tipo e os "requisitos" do procedimento
// saíram do cadastro; as colunas continuam no banco e não são mais alteradas
// por este formulário (editar um procedimento não apaga o que já estava salvo).
const optionalText = z.preprocess(
  (v) => (typeof v !== "string" || v.trim() === "" ? undefined : v),
  z.string().optional()
);

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(true), z.undefined(), z.null()])
  .transform((v) => v === "on" || v === "true" || v === true);

export const procedureSchema = z.object({
  internal_code: optionalText,
  name: z.string().trim().min(1, "Informe o nome do procedimento."),
  tuss_code: optionalText,
  location: optionalText,
  description: optionalText,
  admin_notes: optionalText,
  active: checkbox,
});

export type ProcedureInput = z.infer<typeof procedureSchema>;
