import { z } from "zod";

// Campos que podem não existir no formulário (ex: só renderizados
// condicionalmente conforme o status) chegam como `null` via FormData.get(),
// não como string vazia — por isso tratamos qualquer valor que não seja uma
// string não-vazia como ausente.
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

export const authorizationSchema = z
  .object({
    protocol_number: optionalText,
    requested_procedure: optionalText,
    status: z.enum([
      "not_requested",
      "sent",
      "in_review",
      "pending_docs",
      "approved",
      "partially_approved",
      "denied",
      "expired",
      "cancelled",
    ]),
    sent_at: optionalDate,
    returned_at: optionalDate,
    approved_at: optionalDate,
    validity_date: optionalDate,
    denial_reason: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.status === "denied" && !data.denial_reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["denial_reason"],
        message: "Informe o motivo da negativa.",
      });
    }
  });
export type AuthorizationInput = z.infer<typeof authorizationSchema>;

export const orReservationSchema = z
  .object({
    expected_date: optionalDate,
    requested_date: optionalDate,
    confirmed_date: optionalDate,
    confirmed_time: optionalTime,
    room: optionalText,
    status: z.enum([
      "not_requested",
      "requested",
      "awaiting_confirmation",
      "confirmed",
      "rescheduled",
      "cancelled",
    ]),
    change_reason: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.status === "confirmed") {
      if (!data.room) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["room"], message: "Informe a sala." });
      }
      if (!data.confirmed_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmed_date"],
          message: "Informe a data confirmada.",
        });
      }
      if (!data.confirmed_time) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmed_time"],
          message: "Informe o horário.",
        });
      }
    }
  });
export type OrReservationInput = z.infer<typeof orReservationSchema>;

export const preoperativeItemSchema = z.object({
  description: z.string().trim().min(1, "Descreva o item."),
  due_date: optionalDate,
  notes: optionalText,
});
export type PreoperativeItemInput = z.infer<typeof preoperativeItemSchema>;

// Pré-operatório simplificado: a única pergunta que importa é se a
// cirurgia precisa de avaliação/consulta pré-anestésica.
export const preanestheticEvaluationSchema = z.object({
  needed: z.enum(["yes", "no"]),
  consult_date: optionalDate,
  done: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});
export type PreanestheticEvaluationInput = z.infer<typeof preanestheticEvaluationSchema>;

export const surgeryMaterialItemSchema = z.object({
  material_id: z.string().uuid("Selecione um material."),
  supplier_id: z.preprocess(
    (v) => (typeof v !== "string" || v.trim() === "" ? undefined : v),
    z.string().uuid().optional()
  ),
  quantity: z.preprocess((v) => Number(v), z.number().positive().default(1)),
  unit: optionalText,
  notes: optionalText,
});
export type SurgeryMaterialItemInput = z.infer<typeof surgeryMaterialItemSchema>;
