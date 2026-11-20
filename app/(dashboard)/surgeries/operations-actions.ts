"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  createAuthorizationRequest,
  updateAuthorizationRequest,
  createOrReservation,
  updateOrReservation,
  getOrCreateChecklist,
  addPreoperativeItem,
  setPreoperativeItemStatus,
  removePreoperativeItem,
  addSurgeryMaterialItem,
  setSurgeryMaterialItemStatus,
  removeSurgeryMaterialItem,
  importProtocolVersionItems,
  type PreoperativeItem,
} from "@/lib/data/operations";
import {
  authorizationSchema,
  orReservationSchema,
  preoperativeItemSchema,
  surgeryMaterialItemSchema,
} from "@/lib/validation/operations";

function revalidateSurgery(surgeryId: string) {
  revalidatePath(`/surgeries/${surgeryId}`);
  revalidatePath("/kanban");
}

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
  const supabase = await createClient();
  await setPreoperativeItemStatus(supabase, itemId, status);
  revalidateSurgery(surgeryId);
}

export async function removePreoperativeItemAction(itemId: string, surgeryId: string) {
  const supabase = await createClient();
  await removePreoperativeItem(supabase, itemId);
  revalidateSurgery(surgeryId);
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
  const supabase = await createClient();
  await setSurgeryMaterialItemStatus(supabase, itemId, status);
  revalidateSurgery(surgeryId);
}

export async function removeSurgeryMaterialItemAction(itemId: string, surgeryId: string) {
  const supabase = await createClient();
  await removeSurgeryMaterialItem(supabase, itemId);
  revalidateSurgery(surgeryId);
}

export async function importProtocolVersionItemsAction(
  surgeryId: string,
  protocolVersionId: string
) {
  const supabase = await createClient();
  await importProtocolVersionItems(supabase, surgeryId, protocolVersionId);
  revalidateSurgery(surgeryId);
}
