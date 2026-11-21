"use server";

import { revalidatePath } from "next/cache";

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

export async function removeSurgeryMaterialItemAction(itemId: string, surgeryId: string) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  await removeSurgeryMaterialItem(supabase, itemId);
  revalidateSurgery(surgeryId);
}

export async function importProcedureDefaultMaterialsAction(
  surgeryId: string,
  procedureIds: string[]
) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  await importProcedureDefaultMaterials(supabase, surgeryId, procedureIds);
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
