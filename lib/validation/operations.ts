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

export const authorizationSchema = z.object({
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
});
export type AuthorizationInput = z.infer<typeof authorizationSchema>;

export const orReservationSchema = z.object({
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
});
export type OrReservationInput = z.infer<typeof orReservationSchema>;

export const preoperativeItemSchema = z.object({
  description: z.string().trim().min(1, "Descreva o item."),
  due_date: optionalDate,
  notes: optionalText,
});
export type PreoperativeItemInput = z.infer<typeof preoperativeItemSchema>;

export const surgeryMaterialItemSchema = z.object({
  material_id: z.string().uuid("Selecione um material."),
  supplier_id: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().uuid().optional()
  ),
  quantity: z.preprocess((v) => Number(v), z.number().positive().default(1)),
  unit: optionalText,
  notes: optionalText,
});
export type SurgeryMaterialItemInput = z.infer<typeof surgeryMaterialItemSchema>;
