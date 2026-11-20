import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

export const procedureSchema = z.object({
  internal_code: optionalText,
  name: z.string().trim().min(1, "Informe o nome do procedimento."),
  specialty: optionalText,
  description: optionalText,
  admin_notes: optionalText,
  active: z
    .union([z.literal("on"), z.literal("true"), z.literal(true), z.undefined(), z.null()])
    .transform((v) => v === "on" || v === "true" || v === true),
});

export type ProcedureInput = z.infer<typeof procedureSchema>;
