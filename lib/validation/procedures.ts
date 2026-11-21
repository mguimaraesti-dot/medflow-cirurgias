import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (typeof v !== "string" || v.trim() === "" ? undefined : v),
  z.string().optional()
);

const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v) => (typeof v !== "string" || v.trim() === "" ? undefined : v),
    z.enum(values).optional()
  );

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(true), z.undefined(), z.null()])
  .transform((v) => v === "on" || v === "true" || v === true);

export const procedureSchema = z.object({
  internal_code: optionalText,
  name: z.string().trim().min(1, "Informe o nome do procedimento."),
  tuss_code: optionalText,
  specialty: optionalText,
  anatomical_region: optionalText,
  classification: optionalEnum(["diagnostico", "terapeutico", "ambos"]),
  procedure_type: optionalEnum(["endoscopico", "cirurgico"]),
  location: optionalText,
  description: optionalText,
  admin_notes: optionalText,
  requires_anesthesia: checkbox,
  requires_hospitalization: checkbox,
  requires_opme: checkbox,
  requires_special_equipment: checkbox,
  requires_authorization: checkbox,
  active: checkbox,
});

export type ProcedureInput = z.infer<typeof procedureSchema>;
