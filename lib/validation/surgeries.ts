import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional()
);

const optionalDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional()
);

const optionalTime = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional()
);

const optionalUuid = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().uuid().optional()
);

export const surgerySchema = z.object({
  patient_id: z.string().uuid("Selecione um paciente."),
  hospital_id: z.string().uuid("Selecione um hospital."),
  insurance_provider_id: optionalUuid,
  attendance_type: z.enum(["particular", "convenio"]),
  primary_procedure_id: z.string().uuid("Selecione o procedimento principal."),
  indication_date: optionalDate,
  expected_date: optionalDate,
  confirmed_date: optionalDate,
  confirmed_time: optionalTime,
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  admin_notes: optionalText,
});

export type SurgeryInput = z.infer<typeof surgerySchema>;

export const requirementUpdateSchema = z.object({
  is_satisfied: z.boolean(),
  waived: z.boolean(),
  waived_reason: optionalText,
});

export const particularFinancialSchema = z.object({
  expected_value: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : Number(v)),
    z.number().nonnegative().optional()
  ),
  agreed_value: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : Number(v)),
    z.number().nonnegative().optional()
  ),
  notes: optionalText,
});
