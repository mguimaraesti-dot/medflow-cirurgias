"use server";

import { syncSurgeryComposition } from "@/lib/data/compositions";
import { revalidatePath } from "next/cache";
import { normalizeMaterialName } from "@/lib/text/material-name";

import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
import {
  createAuthorizationRequest,
  updateAuthorizationRequest,
  createOrReservation,
  updateOrReservation,
  getOrCreateChecklist,
  addPreoperativeItem,
  setPreoperativeItemStatus,
  removePreoperativeItem,
  savePreanestheticEvaluation,
  addSurgeryMaterialItem,
  setSurgeryMaterialItemStatus,
  removeSurgeryMaterialItem,
  setSurgeryMaterialItemQuantity,
  updateSurgeryMaterialItem,
  validateAllSurgeryMaterialItems,
  importProcedureDefaultMaterials,
  listSurgeryMaterialItems,
  type PreoperativeItem,
} from "@/lib/data/operations";
import { replaceDefaultMaterials } from "@/lib/data/procedure-materials";
import {
  authorizationSchema,
  orReservationSchema,
  preoperativeItemSchema,
  preanestheticEvaluationSchema,
  surgeryMaterialItemSchema,
} from "@/lib/validation/operations";

function revalidateSurgery(surgeryId: string) {
  revalidatePath(`/surgeries/${surgeryId}`);
  revalidatePath("/kanban");
}

const forbiddenFormError = { error: "Você não tem permissão para esta ação." };

// ----------------------------------------------------------------------------
// Autorização
// ----------------------------------------------------------------------------

export type AuthorizationFormState = { error?: string };

function parseAuthorizationForm(formData: FormData) {
  return authorizationSchema.safeParse({
    protocol_number: formData.get("protocol_number"),
    requested_procedure: formData.get("requested_procedure"),
    status: formData.get("status"),
    sent_at: formData.get("sent_at"),
    returned_at: formData.get("returned_at"),
    approved_at: formData.get("approved_at"),
    validity_date: formData.get("validity_date"),
    denial_reason: formData.get("denial_reason"),
  });
}

export async function createAuthorizationAction(
  surgeryId: string,
  insuranceProviderId: string | null,
  _prevState: AuthorizationFormState,
  formData: FormData
): Promise<AuthorizationFormState> {
  const parsed = parseAuthorizationForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("surgeries");
  } catch {
    return forbiddenFormError;
  }

  const supabase = await createClient();
  try {
    await createAuthorizationRequest(supabase, surgeryId, insuranceProviderId, parsed.data);
  } catch {
    return { error: "Não foi possível registrar a autorização." };
  }
  revalidateSurgery(surgeryId);
  return {};
}

export async function updateAuthorizationAction(
  authorizationId: string,
  surgeryId: string,
  _prevState: AuthorizationFormState,
  formData: FormData
): Promise<AuthorizationFormState> {
  const parsed = parseAuthorizationForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("surgeries");
  } catch {
    return forbiddenFormError;
  }

  const supabase = await createClient();
  try {
    await updateAuthorizationRequest(supabase, authorizationId, parsed.data);
  } catch {
    return { error: "Não foi possível salvar a autorização." };
  }
  revalidateSurgery(surgeryId);
  return {};
}

// ----------------------------------------------------------------------------
// Reserva de centro cirúrgico
// ----------------------------------------------------------------------------

export type OrReservationFormState = { error?: string };

function parseOrReservationForm(formData: FormData) {
  return orReservationSchema.safeParse({
    expected_date: formData.get("expected_date"),
    requested_date: formData.get("requested_date"),
    confirmed_date: formData.get("confirmed_date"),
    confirmed_time: formData.get("confirmed_time"),
    room: formData.get("room"),
    status: formData.get("status"),
    change_reason: formData.get("change_reason"),
  });
}

export async function createOrReservationAction(
  surgeryId: string,
  hospitalId: string,
  _prevState: OrReservationFormState,
  formData: FormData
): Promise<OrReservationFormState> {
  const parsed = parseOrReservationForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("surgeries");
  } catch {
    return forbiddenFormError;
  }

  const supabase = await createClient();
  try {
    await createOrReservation(supabase, surgeryId, hospitalId, parsed.data);
  } catch {
    return { error: "Não foi possível registrar a reserva." };
  }
  revalidateSurgery(surgeryId);
  return {};
}

export async function updateOrReservationAction(
  reservationId: string,
  surgeryId: string,
  _prevState: OrReservationFormState,
  formData: FormData
): Promise<OrReservationFormState> {
  const parsed = parseOrReservationForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("surgeries");
  } catch {
    return forbiddenFormError;
  }

  const supabase = await createClient();
  try {
    await updateOrReservation(supabase, reservationId, parsed.data);
  } catch {
    return { error: "Não foi possível salvar a reserva." };
  }
  revalidateSurgery(surgeryId);
  return {};
}

// ----------------------------------------------------------------------------
// Pré-operatório
// ----------------------------------------------------------------------------

export type PreoperativeFormState = { error?: string };

export async function addPreoperativeItemAction(
  surgeryId: string,
  _prevState: PreoperativeFormState,
  formData: FormData
): Promise<PreoperativeFormState> {
  const parsed = preoperativeItemSchema.safeParse({
    description: formData.get("description"),
    due_date: formData.get("due_date"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("surgeries");
  } catch {
    return forbiddenFormError;
  }

  const supabase = await createClient();
  try {
    const checklistId = await getOrCreateChecklist(supabase, surgeryId);
    await addPreoperativeItem(supabase, checklistId, parsed.data);
  } catch {
    return { error: "Não foi possível adicionar o item." };
  }
  revalidateSurgery(surgeryId);
  return {};
}

export async function setPreoperativeItemStatusAction(
  itemId: string,
  surgeryId: string,
  status: PreoperativeItem["status"]
) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  await setPreoperativeItemStatus(supabase, itemId, status);
  revalidateSurgery(surgeryId);
}

export async function removePreoperativeItemAction(itemId: string, surgeryId: string) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  await removePreoperativeItem(supabase, itemId);
  revalidateSurgery(surgeryId);
}

export async function savePreanestheticEvaluationAction(
  surgeryId: string,
  existingItemId: string | null,
  _prevState: PreoperativeFormState,
  formData: FormData
): Promise<PreoperativeFormState> {
  const parsed = preanestheticEvaluationSchema.safeParse({
    needed: formData.get("needed"),
    consult_date: formData.get("consult_date"),
    done: formData.get("done"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("surgeries");
  } catch {
    return forbiddenFormError;
  }

  const supabase = await createClient();
  try {
    const checklistId = await getOrCreateChecklist(supabase, surgeryId);
    await savePreanestheticEvaluation(supabase, checklistId, existingItemId, {
      needed: parsed.data.needed === "yes",
      consultDate: parsed.data.consult_date ?? null,
      done: parsed.data.done,
    });
  } catch {
    return { error: "Não foi possível salvar a avaliação pré-anestésica." };
  }
  revalidateSurgery(surgeryId);
  return {};
}

// ----------------------------------------------------------------------------
// Materiais da cirurgia
// ----------------------------------------------------------------------------

export type SurgeryMaterialFormState = { error?: string };

export async function addSurgeryMaterialItemAction(
  surgeryId: string,
  _prevState: SurgeryMaterialFormState,
  formData: FormData
): Promise<SurgeryMaterialFormState> {
  const parsed = surgeryMaterialItemSchema.safeParse({
    material_id: formData.get("material_id"),
    supplier_id: formData.get("supplier_id"),
    quantity: formData.get("quantity") || 1,
    unit: formData.get("unit"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("surgeries");
  } catch {
    return forbiddenFormError;
  }

  const supabase = await createClient();
  try {
    await addSurgeryMaterialItem(supabase, surgeryId, parsed.data);
  } catch {
    return { error: "Não foi possível adicionar o material." };
  }
  await syncSurgeryComposition(supabase, surgeryId);
  revalidateSurgery(surgeryId);
  return {};
}

export async function setSurgeryMaterialItemStatusAction(
  itemId: string,
  surgeryId: string,
  status: string
) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  await setSurgeryMaterialItemStatus(supabase, itemId, status);
  revalidateSurgery(surgeryId);
}

export async function updateSurgeryMaterialQuantityAction(
  itemId: string,
  surgeryId: string,
  quantity: number
): Promise<{ error?: string }> {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 9999) {
    return { error: "Informe uma quantidade válida." };
  }
  try {
    await requireActionPermission("surgeries");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }
  const supabase = await createClient();
  try {
    await setSurgeryMaterialItemQuantity(supabase, itemId, quantity);
  } catch {
    return { error: "Não foi possível atualizar a quantidade." };
  }
  await syncSurgeryComposition(supabase, surgeryId);
  revalidateSurgery(surgeryId);
  return {};
}

export async function removeSurgeryMaterialItemAction(itemId: string, surgeryId: string) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  await removeSurgeryMaterialItem(supabase, itemId);
  await syncSurgeryComposition(supabase, surgeryId);
  revalidateSurgery(surgeryId);
}

export async function importProcedureDefaultMaterialsAction(
  surgeryId: string,
  procedureIds: string[]
) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  await importProcedureDefaultMaterials(supabase, surgeryId, procedureIds);
  await syncSurgeryComposition(supabase, surgeryId);
  revalidateSurgery(surgeryId);
}

/**
 * Confirmação explícita do usuário: os materiais usados nesta cirurgia
 * passam a ser o novo kit padrão do procedimento (substitui o anterior).
 */
export async function updateProcedureDefaultMaterialsAction(
  procedureId: string,
  surgeryId: string
) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  const items = await listSurgeryMaterialItems(supabase, surgeryId);
  await replaceDefaultMaterials(
    supabase,
    procedureId,
    items.map((item) => ({
      material_id: item.material_id,
      quantity: item.quantity,
      unit: item.unit,
      preferred_supplier_id: item.supplier_id,
    }))
  );
  revalidateSurgery(surgeryId);
  revalidatePath(`/catalog/procedures/${procedureId}`);
}

// ----------------------------------------------------------------------------
// Edição estruturada de materiais (tela de edição da cirurgia)
// ----------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function guardSurgeryEdit() {
  try {
    await requireActionPermission("surgeries");
    return true;
  } catch {
    return false;
  }
}

/** Adiciona um material à cirurgia (informado manualmente => já validado). */
export async function addSurgeryMaterialStructuredAction(
  surgeryId: string,
  input: { material_id: string; quantity: number; notes?: string }
): Promise<{ error?: string }> {
  if (!(await guardSurgeryEdit())) return { error: "Você não tem permissão para esta ação." };
  if (!UUID_RE.test(surgeryId) || !UUID_RE.test(input.material_id)) return { error: "Material inválido." };
  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 9999) return { error: "Informe uma quantidade válida." };
  const supabase = await createClient();
  try {
    const { error } = await supabase.from("surgery_material_items").insert({
      surgery_id: surgeryId,
      material_id: input.material_id,
      quantity,
      notes: input.notes?.trim() ? input.notes.trim().slice(0, 300) : null,
      validated: true,
    });
    if (error) throw error;
  } catch {
    return { error: "Não foi possível adicionar o material." };
  }
  await syncSurgeryComposition(supabase, surgeryId);
  revalidateSurgery(surgeryId);
  return {};
}

export async function updateSurgeryMaterialStructuredAction(
  itemId: string,
  surgeryId: string,
  patch: { quantity?: number; notes?: string | null; validated?: boolean }
): Promise<{ error?: string }> {
  if (!(await guardSurgeryEdit())) return { error: "Você não tem permissão para esta ação." };
  if (!UUID_RE.test(itemId) || !UUID_RE.test(surgeryId)) return { error: "Item inválido." };
  const clean: { quantity?: number; notes?: string | null; validated?: boolean } = {};
  if (patch.quantity !== undefined) {
    if (!Number.isFinite(patch.quantity) || patch.quantity <= 0 || patch.quantity > 9999) {
      return { error: "Informe uma quantidade válida." };
    }
    clean.quantity = patch.quantity;
  }
  if (patch.notes !== undefined) clean.notes = patch.notes?.trim() ? patch.notes.trim().slice(0, 300) : null;
  if (patch.validated !== undefined) clean.validated = Boolean(patch.validated);
  const supabase = await createClient();
  try {
    await updateSurgeryMaterialItem(supabase, itemId, clean);
  } catch {
    return { error: "Não foi possível salvar a alteração." };
  }
  if (clean.quantity !== undefined) await syncSurgeryComposition(supabase, surgeryId);
  revalidateSurgery(surgeryId);
  return {};
}

export async function validateAllSurgeryMaterialsAction(surgeryId: string): Promise<{ error?: string }> {
  if (!(await guardSurgeryEdit())) return { error: "Você não tem permissão para esta ação." };
  if (!UUID_RE.test(surgeryId)) return { error: "Cirurgia inválida." };
  const supabase = await createClient();
  try {
    await validateAllSurgeryMaterialItems(supabase, surgeryId);
  } catch {
    return { error: "Não foi possível validar os materiais." };
  }
  revalidateSurgery(surgeryId);
  return {};
}

/**
 * Atualiza dados de um material do catálogo (código TUSS e, quando vierem da
 * tabela TUSS, descrição/fabricante/modelo/ANVISA) a partir da tabela de
 * Materiais e OPME da cirurgia. Altera o cadastro do material — vale para
 * todas as cirurgias —, por isso exige permissão de edição em Materiais.
 */
export async function updateMaterialCatalogAction(
  materialId: string,
  patch: {
    tuss_code?: string | null;
    name?: string;
    manufacturer?: string | null;
    model?: string | null;
    anvisa_registration?: string | null;
  }
): Promise<{ error?: string }> {
  try {
    await requireActionPermission("surgeries");
    await requireActionPermission("materials");
  } catch {
    return { error: "Você não tem permissão para alterar o cadastro do material." };
  }
  if (!UUID_RE.test(materialId)) return { error: "Material inválido." };
  const update: Record<string, string | null> = {};
  if (patch.tuss_code !== undefined) {
    const code = patch.tuss_code?.replace(/\s+/g, " ").trim() ?? "";
    if (code.length > 30) return { error: "Código muito longo (máximo de 30 caracteres)." };
    update.tuss_code = code || null;
  }
  if (patch.name !== undefined) {
    const name = normalizeMaterialName(patch.name);
    if (!name) return { error: "Informe a descrição do material." };
    update.name = name.slice(0, 300);
  }
  const text = (v: string | null | undefined) => (v?.trim() ? v.trim().slice(0, 200) : null);
  if (patch.manufacturer !== undefined) update.manufacturer = text(patch.manufacturer);
  if (patch.model !== undefined) update.model = text(patch.model);
  if (patch.anvisa_registration !== undefined) update.anvisa_registration = text(patch.anvisa_registration);
  if (Object.keys(update).length === 0) return {};
  const supabase = await createClient();
  const { error } = await supabase.from("materials_catalog").update(update).eq("id", materialId);
  if (error) return { error: "Não foi possível atualizar o material." };
  revalidatePath("/catalog/materials");
  revalidatePath("/catalog/compositions");
  revalidatePath("/surgeries", "layout");
  return {};
}
