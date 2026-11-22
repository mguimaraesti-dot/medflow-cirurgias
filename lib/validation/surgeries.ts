import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (typeof v !== "string" || v.trim() === "" ? undefined : v),
  z.string().optional()
);

const optionalDate = z.preprocess(
  (v) => (typeof v !== "string" || v.trim() === "" ? undefined : v),
  z.string().optional()
);

const optionalTime = z.preprocess(
  (v) => (typeof v !== "string" || v.trim() === "" ? undefined : v),
  z.string().optional()
);

const optionalUuid = z.preprocess(
  (v) => (typeof v !== "string" || v.trim() === "" ? undefined : v),
  z.string().uuid().optional()
);

export const ADMIN_NOTES_MAX = 500;

export const surgerySchema = z.object({
  patient_id: z.string().uuid("Selecione um paciente."),
  hospital_id: z.string().uuid("Selecione um hospital."),
  insurance_provider_id: optionalUuid,
  attendance_type: z.enum(["particular", "convenio"]),
  indication_date: optionalDate,
  expected_date: optionalDate,
  confirmed_date: optionalDate,
  confirmed_time: optionalTime,
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  admin_notes: z.preprocess(
    (v) => (typeof v !== "string" || v.trim() === "" ? undefined : v),
    z.string().max(ADMIN_NOTES_MAX, `Observações: no máximo ${ADMIN_NOTES_MAX} caracteres.`).optional()
  ),
}).superRefine((data, ctx) => {
  // Regras de consistência (valem também no servidor, não só na tela).
  if (data.attendance_type === "convenio" && !data.insurance_provider_id) {
    ctx.addIssue({ code: "custom", path: ["insurance_provider_id"], message: "Selecione a operadora do convênio." });
  }
  if (data.confirmed_time && !data.confirmed_date) {
    ctx.addIssue({ code: "custom", path: ["confirmed_time"], message: "Informe a data confirmada para usar o horário confirmado." });
  }
  if (data.confirmed_date && data.indication_date && data.confirmed_date < data.indication_date) {
    ctx.addIssue({ code: "custom", path: ["confirmed_date"], message: "A data confirmada não pode ser anterior à data da solicitação." });
  }
});

export type SurgeryInput = z.infer<typeof surgerySchema>;

// Os procedimentos da cirurgia não são mais uma coluna em `surgeries` —
// viram linhas em `surgery_procedures`, validadas separadamente porque vêm
// de `FormData.getAll("procedure_ids")` (múltiplos valores, não um campo
// único que o surgerySchema consiga mapear direto).
export const surgeryProceduresSchema = z
  .object({
    procedure_ids: z.array(z.string().uuid()).min(1, "Selecione ao menos um procedimento."),
    primary_procedure_id: z.string().uuid("Selecione qual é o procedimento principal."),
  })
  .refine((data) => data.procedure_ids.includes(data.primary_procedure_id), {
    message: "O procedimento principal precisa estar entre os selecionados.",
    path: ["primary_procedure_id"],
  });

export type SurgeryProceduresInput = z.infer<typeof surgeryProceduresSchema>;

export const requirementUpdateSchema = z.object({
  is_satisfied: z.boolean(),
  waived: z.boolean(),
  waived_reason: optionalText,
});

export const particularFinancialSchema = z.object({
  expected_value: z.preprocess(
    (v) => (typeof v !== "string" || v.trim() === "" ? undefined : Number(v)),
    z.number().nonnegative().optional()
  ),
  agreed_value: z.preprocess(
    (v) => (typeof v !== "string" || v.trim() === "" ? undefined : Number(v)),
    z.number().nonnegative().optional()
  ),
  notes: optionalText,
});
