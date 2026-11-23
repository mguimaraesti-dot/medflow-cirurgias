import { z } from "zod";

// `v === null` acontece quando o campo nem existe mais no FormData (ex:
// campos de convênio somem do formulário quando o atendimento vira
// "particular") — sem esse tratamento, o zod reclama "expected string,
// received null" em vez de tratar como "não informado".
const blankToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optionalText = z.preprocess(blankToUndefined, z.string().trim().optional());

const optionalUuid = z.preprocess(blankToUndefined, z.string().uuid().optional());

const optionalDigits = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/\D/g, "") || undefined : undefined),
  z.string().optional()
);

const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

const optionalBirthDate = z.preprocess(
  blankToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento inválida.")
    .refine((d) => d >= "1900-01-01", "Data de nascimento inválida.")
    .refine((d) => d <= todayIso(), "A data de nascimento não pode ser futura.")
    .optional()
);

const optionalDate = z.preprocess(blankToUndefined, z.string().optional());

export const patientSchema = z.object({
  full_name: z.string().trim().min(1, "Informe o nome completo."),
  // Guardados só com dígitos (formato já usado nos cadastros existentes).
  // A validade (dígitos verificadores / tamanho) é conferida na action, que
  // sabe se o valor mudou em relação ao cadastro atual.
  cpf: optionalDigits,
  birth_date: optionalBirthDate,
  phone: optionalDigits,
  whatsapp: optionalDigits,
  email: z.preprocess(blankToUndefined, z.string().trim().email("E-mail inválido.").optional()),
  address_cep: optionalDigits,
  address_street: optionalText,
  address_number: optionalText,
  address_complement: optionalText,
  address_neighborhood: optionalText,
  address_city: optionalText,
  address_state: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined),
    z.string().length(2, "UF inválida.").optional()
  ),
  insurance_provider_id: optionalUuid,
  insurance_card_number: optionalText,
  insurance_card_validity: optionalDate,
  insurance_plan: optionalText,
  insurance_accommodation: optionalText,
  admin_notes: optionalText,
});

export type PatientInput = z.infer<typeof patientSchema>;
