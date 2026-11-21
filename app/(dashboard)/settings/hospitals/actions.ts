"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  createHospital,
  updateHospital,
  setHospitalActive,
  deleteHospital,
} from "@/lib/data/hospitals";
import { hospitalSchema } from "@/lib/validation/hospitals";
import { toDeleteErrorMessage } from "@/lib/delete-error";

export type HospitalFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  created?: { id: string; name: string };
};

function parseForm(formData: FormData) {
  return hospitalSchema.safeParse({
    name: formData.get("name"),
    cnpj: formData.get("cnpj"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    admin_contact: formData.get("admin_contact"),
    or_contact: formData.get("or_contact"),
    email: formData.get("email"),
    notes: formData.get("notes"),
    active: formData.get("active"),
  });
}

export async function createHospitalAction(
  _prevState: HospitalFormState,
  formData: FormData
): Promise<HospitalFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  let created;
  try {
    created = await createHospital(supabase, parsed.data);
  } catch {
    return { error: "Não foi possível salvar o hospital. Tente novamente." };
  }

  revalidatePath("/settings/hospitals");
  return { created };
}

export async function updateHospitalAction(
  id: string,
  _prevState: HospitalFormState,
  formData: FormData
): Promise<HospitalFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await updateHospital(supabase, id, parsed.data);
  } catch {
    return { error: "Não foi possível salvar o hospital. Tente novamente." };
  }

  revalidatePath("/settings/hospitals");
  return {};
}

export async function toggleHospitalActiveAction(id: string, active: boolean) {
  const supabase = await createClient();
  await setHospitalActive(supabase, id, active);
  revalidatePath("/settings/hospitals");
}

export async function deleteHospitalAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await deleteHospital(supabase, id);
  } catch (e) {
    return { error: toDeleteErrorMessage(e, "este hospital está vinculado a cirurgias cadastradas") };
  }
  revalidatePath("/settings/hospitals");
  return {};
}
