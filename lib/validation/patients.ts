import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional()
);

const optionalDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional()
);

const optionalUuid = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().uuid().optional()
);

export const patientSchema = z.object({
  full_name: z.string().trim().min(1, "Informe o nome completo."),
  cpf: optionalText,
  birth_date: optionalDate,
  phone: optionalText,
  whatsapp: optionalText,
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().email("E-mail inválido.").optional()
  ),
  address: optionalText,
  insurance_provider_id: optionalUuid,
  insurance_card_number: optionalText,
  insurance_card_validity: optionalDate,
  admin_notes: optionalText,
});

export type PatientInput = z.infer<typeof patientSchema>;
