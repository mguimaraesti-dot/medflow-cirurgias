"use server";

import { revalidatePath } from "next/cache";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
import {
  createPatient,
  updatePatient,
  deletePatient,
  findPatientByCpf,
  findPatientByNameAndBirth,
  type PatientUpdateInput,
} from "@/lib/data/patients";
import { countPatientDocuments, patientDocumentsStorage } from "@/lib/data/patient-documents";
import { patientSchema } from "@/lib/validation/patients";
import { isValidCpf, isValidPhone, onlyDigits } from "@/lib/br-format";
import { EMPTY_ADDRESS, type PatientAddress } from "@/lib/patient-address";
import { toDeleteErrorMessage } from "@/lib/delete-error";

export type PatientDuplicate = { id: string; full_name: string; kind: "cpf" | "name" };

export type PatientFormState = {
  error?: string;
  /** Já existe paciente com o mesmo CPF (bloqueia) ou mesmo nome+nascimento (pede confirmação). */
  duplicate?: PatientDuplicate;
  created?: { id: string; full_name: string };
};

const NO_PERMISSION = "Você não tem permissão para esta ação.";

function parseForm(formData: FormData) {
  const keys = [
    "full_name", "cpf", "birth_date", "phone", "whatsapp", "email",
    "address_cep", "address_street", "address_number", "address_complement",
    "address_neighborhood", "address_city", "address_state",
    "insurance_provider_id", "insurance_card_number", "insurance_card_validity", "insurance_plan", "insurance_accommodation", "admin_notes",
  ];
  return patientSchema.safeParse(Object.fromEntries(keys.map((k) => [k, formData.get(k)])));
}

type Parsed = ReturnType<typeof patientSchema.parse>;

function buildAddress(p: Parsed): PatientAddress | null {
  const address: PatientAddress = {
    ...EMPTY_ADDRESS,
    cep: p.address_cep ?? "",
    street: p.address_street ?? "",
    number: p.address_number ?? "",
    complement: p.address_complement ?? "",
    neighborhood: p.address_neighborhood ?? "",
    city: p.address_city ?? "",
    state: p.address_state ?? "",
  };
  return Object.values(address).every((v) => v === "") ? null : address;
}

function toRow(formData: FormData, p: Parsed): PatientUpdateInput {
  const isParticular = formData.get("attendance_type") !== "convenio";
  return {
    full_name: p.full_name,
    cpf: p.cpf ?? null,
    birth_date: p.birth_date ?? null,
    phone: p.phone ?? null,
    whatsapp: p.whatsapp ?? null,
    email: p.email ?? null,
    address: buildAddress(p),
    admin_notes: p.admin_notes ?? null,
    // Particular: campos de convênio somem do formulário — força null para
    // limpar de verdade quem era convênio e virou particular.
    insurance_provider_id: isParticular ? null : (p.insurance_provider_id ?? null),
    insurance_card_number: isParticular ? null : (p.insurance_card_number ?? null),
    insurance_card_validity: isParticular ? null : (p.insurance_card_validity ?? null),
    insurance_plan: isParticular ? null : (p.insurance_plan ?? null),
    insurance_accommodation: isParticular ? null : (p.insurance_accommodation ?? null),
  };
}

/** Regras que dependem do valor anterior (edição) — valores legados não bloqueiam salvar outras mudanças. */
function validateFormats(formData: FormData, p: Parsed, current?: { cpf: string | null; phone: string | null; whatsapp: string | null }) {
  const changed = (next: string | undefined, prev: string | null | undefined) =>
    !current || onlyDigits(next) !== onlyDigits(prev);
  if (p.cpf && changed(p.cpf, current?.cpf) && !isValidCpf(p.cpf)) return "CPF inválido.";
  if (p.phone && changed(p.phone, current?.phone) && !isValidPhone(p.phone)) return "Celular inválido. Informe DDD + número.";
  if (p.whatsapp && changed(p.whatsapp, current?.whatsapp) && !isValidPhone(p.whatsapp)) {
    return "Telefone de contato inválido. Informe DDD + número.";
  }
  if (p.address_cep && p.address_cep.length !== 8) return "CEP inválido.";
  if (formData.get("attendance_type") === "convenio" && !p.insurance_provider_id) {
    return "Selecione a operadora de saúde.";
  }
  return null;
}

function toUserMessage(e: unknown) {
  const message = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  if (message.includes("patients_cpf_key")) return "Já existe um paciente cadastrado com esse CPF.";
  return "Não foi possível salvar o paciente. Tente novamente.";
}

/** Procura duplicidade. CPF igual bloqueia; sem CPF, nome+nascimento iguais pedem confirmação. */
async function detectDuplicate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  p: Parsed,
  excludeId?: string
): Promise<PatientDuplicate | null> {
  if (p.cpf) {
    const found = await findPatientByCpf(supabase, p.cpf, excludeId);
    return found ? { ...found, kind: "cpf" } : null;
  }
  if (p.birth_date) {
    const found = await findPatientByNameAndBirth(supabase, p.full_name, p.birth_date, excludeId);
    return found ? { ...found, kind: "name" } : null;
  }
  return null;
}

function duplicateMessage(d: PatientDuplicate) {
  return d.kind === "cpf"
    ? `Já existe um paciente com esse CPF: ${d.full_name}.`
    : `Já existe um paciente com o mesmo nome e data de nascimento: ${d.full_name}.`;
}

/** Consulta rápida (ao sair do campo CPF) — evita descobrir o duplicado só ao salvar. */
export async function checkPatientCpfAction(
  cpf: string,
  excludeId?: string
): Promise<{ duplicate: { id: string; full_name: string } | null }> {
  try {
    await requireActionPermission("patients", "view");
  } catch {
    return { duplicate: null };
  }
  const digits = onlyDigits(cpf);
  if (!isValidCpf(digits)) return { duplicate: null };
  try {
    const supabase = await createClient();
    return { duplicate: await findPatientByCpf(supabase, digits, excludeId) };
  } catch {
    return { duplicate: null };
  }
}

export async function createPatientAction(
  _prevState: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await requireActionPermission("patients");
  } catch {
    return { error: NO_PERMISSION };
  }
  const formatError = validateFormats(formData, parsed.data);
  if (formatError) return { error: formatError };

  const supabase = await createClient();
  try {
    const duplicate = await detectDuplicate(supabase, parsed.data);
    if (duplicate && (duplicate.kind === "cpf" || formData.get("confirm_duplicate") !== "1")) {
      return { error: duplicateMessage(duplicate), duplicate };
    }
    const created = await createPatient(supabase, toRow(formData, parsed.data));
    revalidatePath("/surgeries/patients");
    return { created };
  } catch (e) {
    return { error: toUserMessage(e) };
  }
}

export async function updatePatientAction(
  id: string,
  _prevState: PatientFormState,
  formData: FormData
): Promise<PatientFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await requireActionPermission("patients");
  } catch {
    return { error: NO_PERMISSION };
  }

  const supabase = await createClient();
  try {
    const { data: current } = await supabase
      .from("patients")
      .select("cpf,phone,whatsapp")
      .eq("id", id)
      .maybeSingle();
    const formatError = validateFormats(formData, parsed.data, current ?? { cpf: null, phone: null, whatsapp: null });
    if (formatError) return { error: formatError };

    const duplicate = await detectDuplicate(supabase, parsed.data, id);
    if (duplicate && (duplicate.kind === "cpf" || formData.get("confirm_duplicate") !== "1")) {
      return { error: duplicateMessage(duplicate), duplicate };
    }
    await updatePatient(supabase, id, toRow(formData, parsed.data));
  } catch (e) {
    return { error: toUserMessage(e) };
  }

  revalidatePath("/surgeries/patients");
  revalidatePath(`/surgeries/patients/${id}`);
  return {};
}

/**
 * Desfaz um cadastro recém-criado quando o envio dos documentos falhou —
 * assim "salvar paciente + anexos" é tudo-ou-nada, sem paciente pela metade
 * nem arquivo órfão. Só age sobre paciente criado há poucos minutos, sem
 * cirurgias (a FK impede o contrário).
 */
export async function discardNewPatientAction(patientId: string): Promise<{ error?: string }> {
  try {
    await requireActionPermission("patients");
  } catch {
    return { error: NO_PERMISSION };
  }
  try {
    const admin = createAdminClient();
    const { data: patient } = await admin.from("patients").select("id,created_at").eq("id", patientId).maybeSingle();
    if (!patient) return {};
    if (Date.now() - new Date(patient.created_at).getTime() > 30 * 60 * 1000) {
      return { error: "Cadastro antigo demais para ser desfeito automaticamente." };
    }
    const { data: docs } = await admin.from("patient_documents").select("id,file_path").eq("patient_id", patientId);
    if (docs && docs.length > 0) {
      await patientDocumentsStorage().remove(docs.map((d) => d.file_path));
      await admin.from("patient_documents").delete().eq("patient_id", patientId);
    }
    const { error } = await admin.from("patients").delete().eq("id", patientId);
    if (error) throw error;
    revalidatePath("/surgeries/patients");
    return {};
  } catch {
    return { error: "Não foi possível desfazer o cadastro." };
  }
}

export async function deletePatientAction(id: string): Promise<{ error?: string }> {
  try {
    await requireActionPermission("patients");
  } catch {
    return { error: NO_PERMISSION };
  }

  const supabase = await createClient();

  try {
    if ((await countPatientDocuments(id).catch(() => 0)) > 0) {
      return { error: "Este paciente tem documentos anexados. Exclua os documentos antes de excluir o paciente." };
    }
    await deletePatient(supabase, id);
  } catch (e) {
    return {
      error: toDeleteErrorMessage(e, "este paciente tem cirurgias cadastradas", {
        suggestDeactivate: false,
      }),
    };
  }

  revalidatePath("/surgeries/patients");
  return {};
}
