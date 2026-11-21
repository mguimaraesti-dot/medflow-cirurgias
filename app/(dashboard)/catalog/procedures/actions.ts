"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  createProcedure,
  updateProcedure,
  setProcedureActive,
  deleteProcedure,
} from "@/lib/data/procedures";
import { procedureSchema } from "@/lib/validation/procedures";
import { toDeleteErrorMessage } from "@/lib/delete-error";
import {
  addDefaultMaterial,
  removeDefaultMaterial,
  listDefaultMaterials,
  type ProcedureDefaultMaterial,
} from "@/lib/data/procedure-materials";
import { procedureDefaultMaterialSchema } from "@/lib/validation/procedure-materials";
import { searchTussProcedures, type TussResult } from "@/lib/tuss";

export type ProcedureFormState = {
  error?: string;
};

function parseForm(formData: FormData) {
  return procedureSchema.safeParse({
    internal_code: formData.get("internal_code"),
    name: formData.get("name"),
    tuss_code: formData.get("tuss_code"),
    specialty: formData.get("specialty"),
    anatomical_region: formData.get("anatomical_region"),
    classification: formData.get("classification"),
    procedure_type: formData.get("procedure_type"),
    location: formData.get("location"),
    description: formData.get("description"),
    admin_notes: formData.get("admin_notes"),
    requires_anesthesia: formData.get("requires_anesthesia"),
    requires_hospitalization: formData.get("requires_hospitalization"),
    requires_opme: formData.get("requires_opme"),
    requires_special_equipment: formData.get("requires_special_equipment"),
    requires_authorization: formData.get("requires_authorization"),
    active: formData.get("active"),
  });
}

function toUserMessage(e: unknown) {
  const message = e instanceof Error ? e.message : "";
  if (message.includes("procedures_internal_code_key")) {
    return "Já existe um procedimento com esse código interno.";
  }
  return "Não foi possível salvar o procedimento. Tente novamente.";
}

export async function createProcedureAction(
  _prevState: ProcedureFormState,
  formData: FormData
): Promise<ProcedureFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await createProcedure(supabase, parsed.data);
  } catch (e) {
    return { error: toUserMessage(e) };
  }

  revalidatePath("/catalog/procedures");
  return {};
}

export async function updateProcedureAction(
  id: string,
  _prevState: ProcedureFormState,
  formData: FormData
): Promise<ProcedureFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await updateProcedure(supabase, id, parsed.data);
  } catch (e) {
    return { error: toUserMessage(e) };
  }

  revalidatePath("/catalog/procedures");
  return {};
}

export async function toggleProcedureActiveAction(id: string, active: boolean) {
  const supabase = await createClient();
  await setProcedureActive(supabase, id, active);
  revalidatePath("/catalog/procedures");
}

export async function deleteProcedureAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  try {
    await deleteProcedure(supabase, id);
  } catch (e) {
    return { error: toDeleteErrorMessage(e, "este procedimento está vinculado a cirurgias cadastradas") };
  }

  revalidatePath("/catalog/procedures");
  return {};
}

// ----------------------------------------------------------------------------
// Materiais padrão do procedimento (kit que o médico costuma usar)
// ----------------------------------------------------------------------------

export type DefaultMaterialFormState = { error?: string };

// Usado pelo painel lateral de "Materiais padrão" na própria listagem de
// procedimentos, que busca os itens sob demanda ao abrir (em vez de
// carregar o kit de todos os procedimentos de uma vez na listagem).
export async function getDefaultMaterialsAction(procedureId: string): Promise<ProcedureDefaultMaterial[]> {
  const supabase = await createClient();
  return listDefaultMaterials(supabase, procedureId);
}

export async function addDefaultMaterialAction(
  procedureId: string,
  _prevState: DefaultMaterialFormState,
  formData: FormData
): Promise<DefaultMaterialFormState> {
  const parsed = procedureDefaultMaterialSchema.safeParse({
    material_id: formData.get("material_id"),
    preferred_supplier_id: formData.get("supplier_id"),
    quantity: formData.get("quantity") || 1,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await addDefaultMaterial(supabase, procedureId, parsed.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("procedure_default_materials_procedure_id_material_id_key")) {
      return { error: "Esse material já está no kit padrão deste procedimento." };
    }
    return { error: "Não foi possível adicionar o material." };
  }

  revalidatePath(`/catalog/procedures/${procedureId}`);
  revalidatePath("/catalog/procedures");
  return {};
}

export async function removeDefaultMaterialAction(id: string, procedureId: string) {
  const supabase = await createClient();
  await removeDefaultMaterial(supabase, id);
  revalidatePath(`/catalog/procedures/${procedureId}`);
  revalidatePath("/catalog/procedures");
}

// ----------------------------------------------------------------------------
// Busca de código TUSS na base pública da ANS
// ----------------------------------------------------------------------------

export async function searchTussCodesAction(
  query: string
): Promise<{ results?: TussResult[]; error?: string }> {
  try {
    const results = await searchTussProcedures(query);
    return { results };
  } catch {
    return {
      error: "Não foi possível consultar a tabela TUSS agora. Você pode digitar o código manualmente.",
    };
  }
}
