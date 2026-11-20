"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createPatient, updatePatient, type PatientUpdateInput } from "@/lib/data/patients";
import { patientSchema } from "@/lib/validation/patients";

export type PatientFormState = {
  error?: string;
};

function parseForm(formData: FormData) {
  return patientSchema.safeParse({
    full_name: formData.get("full_name"),
    cpf: formData.get("cpf"),
    birth_date: formData.get("birth_date"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    address: formData.get("address"),
    insurance_provider_id: formData.get("insurance_provider_id"),
    insurance_card_number: formData.get("insurance_card_number"),
    insurance_card_validity: formData.get("insurance_card_validity"),
    admin_notes: formData.get("admin_notes"),
  });
}

// Quando o tipo de atendimento é "particular", os campos de convênio não
// são renderizados no formulário — além de não serem enviados, forçamos
// explicitamente null aqui para o caso de edição (sem isso, um paciente
// que já era convênio e virou particular manteria os dados antigos, já
// que campos ausentes no FormData não apagam a coluna, só ficam intocados).
function clearInsuranceIfParticular(formData: FormData, data: PatientUpdateInput): PatientUpdateInput {
  if (formData.get("attendance_type") === "particular") {
    return {
      ...data,
      insurance_provider_id: null,
      insurance_card_number: null,
      insurance_card_validity: null,
    };
  }
  return data;
}

function toUserMessage(e: unknown) {
  const message = e instanceof Error ? e.message : "";
  if (message.includes("patients_cpf_key")) {
    return "Já existe um paciente cadastrado com esse CPF.";
  }
  return "Não foi possível salvar o paciente. Tente novamente.";
}

export async function createPatientAction(
  _prevState: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await createPatient(supabase, clearInsuranceIfParticular(formData, parsed.data));
  } catch (e) {
    return { error: toUserMessage(e) };
  }

  revalidatePath("/surgeries/patients");
  return {};
}

export async function updatePatientAction(
  id: string,
  _prevState: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await updatePatient(supabase, id, clearInsuranceIfParticular(formData, parsed.data));
  } catch (e) {
    return { error: toUserMessage(e) };
  }

  revalidatePath("/surgeries/patients");
  return {};
}
