"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  createMaterial,
  updateMaterial,
  setMaterialActive,
  deleteMaterial,
  addMaterialSupplier,
  removeMaterialSupplier,
} from "@/lib/data/materials";
import { materialSchema, materialSupplierSchema } from "@/lib/validation/materials";
import { toDeleteErrorMessage } from "@/lib/delete-error";
import { searchTussMaterials, type TussResult } from "@/lib/tuss";

export type MaterialFormState = {
  error?: string;
  created?: { id: string; name: string };
};

function parseForm(formData: FormData) {
  return materialSchema.safeParse({
    internal_code: formData.get("internal_code"),
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
    unit: formData.get("unit"),
    notes: formData.get("notes"),
    tuss_code: formData.get("tuss_code"),
    manufacturer: formData.get("manufacturer"),
    model: formData.get("model"),
    anvisa_registration: formData.get("anvisa_registration"),
    active: formData.get("active"),
  });
}

export async function searchTussMaterialsAction(
  query: string
): Promise<{ results?: TussResult[]; error?: string }> {
  try {
    const results = await searchTussMaterials(query);
    return { results };
  } catch {
    return {
      error: "Não foi possível consultar a tabela TUSS agora. Você pode informar os dados manualmente.",
    };
  }
}

function toUserMessage(e: unknown) {
  const message = e instanceof Error ? e.message : "";
  if (message.includes("materials_catalog_internal_code_key")) {
    return "Já existe um material com esse código interno.";
  }
  return "Não foi possível salvar o material. Tente novamente.";
}

export async function createMaterialAction(
  _prevState: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  let created;
  try {
    created = await createMaterial(supabase, parsed.data);
  } catch (e) {
    return { error: toUserMessage(e) };
  }

  revalidatePath("/catalog/materials");
  return { created };
}

export async function updateMaterialAction(
  id: string,
  _prevState: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await updateMaterial(supabase, id, parsed.data);
  } catch (e) {
    return { error: toUserMessage(e) };
  }

  revalidatePath("/catalog/materials");
  return {};
}

export async function toggleMaterialActiveAction(id: string, active: boolean) {
  const supabase = await createClient();
  await setMaterialActive(supabase, id, active);
  revalidatePath("/catalog/materials");
}

export async function deleteMaterialAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await deleteMaterial(supabase, id);
  } catch (e) {
    return {
      error: toDeleteErrorMessage(e, "este material está vinculado a cirurgias cadastradas"),
    };
  }
  revalidatePath("/catalog/materials");
  return {};
}

export type MaterialSupplierFormState = {
  error?: string;
};

export async function addMaterialSupplierAction(
  materialId: string,
  _prevState: MaterialSupplierFormState,
  formData: FormData
): Promise<MaterialSupplierFormState> {
  const parsed = materialSupplierSchema.safeParse({
    material_id: materialId,
    supplier_id: formData.get("supplier_id"),
    preferred: formData.get("preferred"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await addMaterialSupplier(
      supabase,
      parsed.data.material_id,
      parsed.data.supplier_id,
      parsed.data.preferred
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("material_suppliers_material_id_supplier_id_key")) {
      return { error: "Esse fornecedor já está vinculado a este material." };
    }
    return { error: "Não foi possível vincular o fornecedor." };
  }

  revalidatePath("/catalog/materials");
  return {};
}

export async function removeMaterialSupplierAction(linkId: string) {
  const supabase = await createClient();
  await removeMaterialSupplier(supabase, linkId);
  revalidatePath("/catalog/materials");
}
