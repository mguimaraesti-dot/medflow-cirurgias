"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
import {
  createSupplier,
  updateSupplier,
  setSupplierActive,
  deleteSupplier,
} from "@/lib/data/suppliers";
import { supplierSchema } from "@/lib/validation/suppliers";
import { toDeleteErrorMessage } from "@/lib/delete-error";

export type SupplierFormState = {
  error?: string;
};

function parseForm(formData: FormData) {
  return supplierSchema.safeParse({
    company_name: formData.get("company_name"),
    trade_name: formData.get("trade_name"),
    cnpj: formData.get("cnpj"),
    contact_name: formData.get("contact_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    notes: formData.get("notes"),
    active: formData.get("active"),
  });
}

export async function createSupplierAction(
  _prevState: SupplierFormState,
  formData: FormData
): Promise<SupplierFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("suppliers");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  try {
    await createSupplier(supabase, parsed.data);
  } catch {
    return { error: "Não foi possível salvar o fornecedor. Tente novamente." };
  }

  revalidatePath("/suppliers");
  return {};
}

export async function updateSupplierAction(
  id: string,
  _prevState: SupplierFormState,
  formData: FormData
): Promise<SupplierFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("suppliers");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  try {
    await updateSupplier(supabase, id, parsed.data);
  } catch {
    return { error: "Não foi possível salvar o fornecedor. Tente novamente." };
  }

  revalidatePath("/suppliers");
  return {};
}

export async function toggleSupplierActiveAction(id: string, active: boolean) {
  await requireActionPermission("suppliers");
  const supabase = await createClient();
  await setSupplierActive(supabase, id, active);
  revalidatePath("/suppliers");
}

export async function deleteSupplierAction(id: string): Promise<{ error?: string }> {
  try {
    await requireActionPermission("suppliers");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }
  const supabase = await createClient();
  try {
    await deleteSupplier(supabase, id);
  } catch (e) {
    return {
      error: toDeleteErrorMessage(e, "este fornecedor está vinculado a materiais cadastrados"),
    };
  }
  revalidatePath("/suppliers");
  return {};
}
