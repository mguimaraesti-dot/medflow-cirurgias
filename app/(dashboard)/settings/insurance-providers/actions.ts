"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  createInsuranceProvider,
  updateInsuranceProvider,
  setInsuranceProviderActive,
} from "@/lib/data/insurance-providers";
import { insuranceProviderSchema } from "@/lib/validation/insurance-providers";

export type InsuranceProviderFormState = {
  error?: string;
};

function parseForm(formData: FormData) {
  return insuranceProviderSchema.safeParse({
    name: formData.get("name"),
    cnpj: formData.get("cnpj"),
    code: formData.get("code"),
    contacts: formData.get("contacts"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    admin_rules: formData.get("admin_rules"),
    avg_authorization_days: formData.get("avg_authorization_days"),
    avg_payment_days: formData.get("avg_payment_days"),
    active: formData.get("active"),
  });
}

export async function createInsuranceProviderAction(
  _prevState: InsuranceProviderFormState,
  formData: FormData
): Promise<InsuranceProviderFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await createInsuranceProvider(supabase, parsed.data);
  } catch {
    return { error: "Não foi possível salvar a operadora. Tente novamente." };
  }

  revalidatePath("/settings/insurance-providers");
  return {};
}

export async function updateInsuranceProviderAction(
  id: string,
  _prevState: InsuranceProviderFormState,
  formData: FormData
): Promise<InsuranceProviderFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await updateInsuranceProvider(supabase, id, parsed.data);
  } catch {
    return { error: "Não foi possível salvar a operadora. Tente novamente." };
  }

  revalidatePath("/settings/insurance-providers");
  return {};
}

export async function toggleInsuranceProviderActiveAction(id: string, active: boolean) {
  const supabase = await createClient();
  await setInsuranceProviderActive(supabase, id, active);
  revalidatePath("/settings/insurance-providers");
}
