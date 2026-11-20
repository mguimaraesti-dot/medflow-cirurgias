"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  createProtocol,
  createProtocolVersion,
  setProtocolVersionStatus,
  addProtocolItem,
  removeProtocolItem,
  type ProtocolVersion,
} from "@/lib/data/protocols";
import { protocolSchema, protocolItemSchema } from "@/lib/validation/protocols";

export type ProtocolFormState = { error?: string };

export async function createProtocolAction(
  _prevState: ProtocolFormState,
  formData: FormData
): Promise<ProtocolFormState> {
  const parsed = protocolSchema.safeParse({
    procedure_id: formData.get("procedure_id"),
    hospital_id: formData.get("hospital_id"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  let protocolId: string;
  try {
    const result = await createProtocol(supabase, parsed.data);
    protocolId = result.id;
  } catch {
    return { error: "Não foi possível criar o protocolo." };
  }

  revalidatePath("/protocols");
  redirect(`/protocols/${protocolId}`);
}

export async function createProtocolVersionAction(
  protocolId: string,
  cloneFromVersionId?: string
) {
  const supabase = await createClient();
  const version = await createProtocolVersion(supabase, protocolId, cloneFromVersionId);
  revalidatePath(`/protocols/${protocolId}`);
  redirect(`/protocols/${protocolId}/versions/${version.id}`);
}

export async function setProtocolVersionStatusAction(
  versionId: string,
  protocolId: string,
  status: ProtocolVersion["status"]
) {
  const supabase = await createClient();
  await setProtocolVersionStatus(supabase, versionId, status);
  revalidatePath(`/protocols/${protocolId}`);
  revalidatePath(`/protocols/${protocolId}/versions/${versionId}`);
}

export type ProtocolItemFormState = { error?: string };

export async function addProtocolItemAction(
  versionId: string,
  protocolId: string,
  _prevState: ProtocolItemFormState,
  formData: FormData
): Promise<ProtocolItemFormState> {
  const parsed = protocolItemSchema.safeParse({
    material_id: formData.get("material_id"),
    quantity: formData.get("quantity") || 1,
    unit: formData.get("unit"),
    specs: formData.get("specs"),
    preferred_supplier_id: formData.get("preferred_supplier_id"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await addProtocolItem(supabase, versionId, parsed.data);
  } catch {
    return { error: "Não foi possível adicionar o item." };
  }

  revalidatePath(`/protocols/${protocolId}/versions/${versionId}`);
  return {};
}

export async function removeProtocolItemAction(
  itemId: string,
  protocolId: string,
  versionId: string
) {
  const supabase = await createClient();
  await removeProtocolItem(supabase, itemId);
  revalidatePath(`/protocols/${protocolId}/versions/${versionId}`);
}
