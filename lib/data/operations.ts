import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AuthorizationInput,
  OrReservationInput,
  PreoperativeItemInput,
  SurgeryMaterialItemInput,
} from "@/lib/validation/operations";

// ----------------------------------------------------------------------------
// Autorização
// ----------------------------------------------------------------------------

export type AuthorizationRequest = {
  id: string;
  surgery_id: string;
  insurance_provider_id: string | null;
  protocol_number: string | null;
  requested_procedure: string | null;
  status: string;
  sent_at: string | null;
  returned_at: string | null;
  approved_at: string | null;
  validity_date: string | null;
  denial_reason: string | null;
  created_at: string;
};

export type AuthorizationHistoryEntry = {
  id: string;
  status: string;
  notes: string | null;
  changed_at: string;
};

export type AuthorizationHistoryWithContext = AuthorizationHistoryEntry & {
  authorization_id: string;
  changed_by: string | null;
};

export async function getAuthorizationRequest(supabase: SupabaseClient, surgeryId: string) {
  const { data, error } = await supabase
    .from("authorization_requests")
    .select("*")
    .eq("surgery_id", surgeryId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as AuthorizationRequest | null;
}

export async function listAuthorizationHistory(supabase: SupabaseClient, authorizationId: string) {
  const { data, error } = await supabase
    .from("authorization_history")
    .select("id,status,notes,changed_at")
    .eq("authorization_id", authorizationId)
    .order("changed_at", { ascending: true });
  if (error) throw error;
  return data as AuthorizationHistoryEntry[];
}

/**
 * Todo o histórico de status de autorização da cirurgia (pode abranger mais
 * de uma solicitação, caso tenha sido reenviada após negativa).
 */
export async function listAuthorizationHistoryForSurgery(
  supabase: SupabaseClient,
  surgeryId: string
) {
  const { data: requests, error: requestsError } = await supabase
    .from("authorization_requests")
    .select("id")
    .eq("surgery_id", surgeryId);
  if (requestsError) throw requestsError;

  const ids = (requests ?? []).map((r) => r.id as string);
  if (ids.length === 0) return [] as AuthorizationHistoryWithContext[];

  const { data, error } = await supabase
    .from("authorization_history")
    .select("id,authorization_id,status,notes,changed_by,changed_at")
    .in("authorization_id", ids)
    .order("changed_at", { ascending: true });
  if (error) throw error;
  return data as AuthorizationHistoryWithContext[];
}

export async function createAuthorizationRequest(
  supabase: SupabaseClient,
  surgeryId: string,
  insuranceProviderId: string | null,
  input: AuthorizationInput
) {
  const { error } = await supabase.from("authorization_requests").insert({
    surgery_id: surgeryId,
    insurance_provider_id: insuranceProviderId,
    ...input,
  });
  if (error) throw error;
}

export async function updateAuthorizationRequest(
  supabase: SupabaseClient,
  id: string,
  input: AuthorizationInput
) {
  const { error } = await supabase.from("authorization_requests").update(input).eq("id", id);
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Reserva de centro cirúrgico
// ----------------------------------------------------------------------------

export type OrReservation = {
  id: string;
  surgery_id: string;
  hospital_id: string;
  expected_date: string | null;
  requested_date: string | null;
  confirmed_date: string | null;
  confirmed_time: string | null;
  room: string | null;
  status: string;
  change_reason: string | null;
};

export async function getOrReservation(supabase: SupabaseClient, surgeryId: string) {
  const { data, error } = await supabase
    .from("or_reservations")
    .select("*")
    .eq("surgery_id", surgeryId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as OrReservation | null;
}

export async function createOrReservation(
  supabase: SupabaseClient,
  surgeryId: string,
  hospitalId: string,
  input: OrReservationInput
) {
  const { error } = await supabase
    .from("or_reservations")
    .insert({ surgery_id: surgeryId, hospital_id: hospitalId, ...input });
  if (error) throw error;
}

export async function updateOrReservation(
  supabase: SupabaseClient,
  id: string,
  input: OrReservationInput
) {
  const { error } = await supabase.from("or_reservations").update(input).eq("id", id);
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Pré-operatório
// ----------------------------------------------------------------------------

export type PreoperativeItem = {
  id: string;
  checklist_id: string;
  description: string;
  due_date: string | null;
  status: "pending" | "in_progress" | "done" | "waived";
  notes: string | null;
  completed_at: string | null;
};

export async function getOrCreateChecklist(supabase: SupabaseClient, surgeryId: string) {
  const { data: existing, error: existingError } = await supabase
    .from("preoperative_checklists")
    .select("id")
    .eq("surgery_id", surgeryId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from("preoperative_checklists")
    .insert({ surgery_id: surgeryId })
    .select("id")
    .single();
  if (error) {
    // corrida: outra requisição já criou o checklist entre o select e o
    // insert — a constraint única garante que não há duplicata, só
    // reaproveitamos o registro que já existe.
    if (error.code === "23505") {
      const { data: retry, error: retryError } = await supabase
        .from("preoperative_checklists")
        .select("id")
        .eq("surgery_id", surgeryId)
        .single();
      if (retryError) throw retryError;
      return retry.id as string;
    }
    throw error;
  }
  return data.id as string;
}

export async function listPreoperativeItems(supabase: SupabaseClient, checklistId: string) {
  const { data, error } = await supabase
    .from("preoperative_items")
    .select("id,checklist_id,description,due_date,status,notes,completed_at")
    .eq("checklist_id", checklistId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data as PreoperativeItem[];
}

export async function addPreoperativeItem(
  supabase: SupabaseClient,
  checklistId: string,
  input: PreoperativeItemInput
) {
  const { error } = await supabase
    .from("preoperative_items")
    .insert({ checklist_id: checklistId, ...input });
  if (error) throw error;
}

export async function setPreoperativeItemStatus(
  supabase: SupabaseClient,
  id: string,
  status: PreoperativeItem["status"]
) {
  const { error } = await supabase
    .from("preoperative_items")
    .update({
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function removePreoperativeItem(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("preoperative_items").delete().eq("id", id);
  if (error) throw error;
}

// Pré-operatório simplificado: em vez de um checklist livre, a cirurgia
// tem um único item fixo representando a avaliação pré-anestésica —
// "precisa?", e se sim, data da consulta e se já foi realizada.
export const PREANESTHETIC_EVALUATION_DESCRIPTION = "Avaliação pré-anestésica";

export async function savePreanestheticEvaluation(
  supabase: SupabaseClient,
  checklistId: string,
  existingItemId: string | null,
  input: { needed: boolean; consultDate: string | null; done: boolean }
) {
  const status: PreoperativeItem["status"] = !input.needed ? "waived" : input.done ? "done" : "pending";
  const payload = {
    checklist_id: checklistId,
    description: PREANESTHETIC_EVALUATION_DESCRIPTION,
    due_date: input.needed ? input.consultDate : null,
    status,
    completed_at: status === "done" ? new Date().toISOString() : null,
  };

  if (existingItemId) {
    const { error } = await supabase.from("preoperative_items").update(payload).eq("id", existingItemId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("preoperative_items").insert(payload);
  if (error) throw error;
}

// ----------------------------------------------------------------------------
// Materiais da cirurgia
// ----------------------------------------------------------------------------

export type SurgeryMaterialItem = {
  id: string;
  surgery_id: string;
  material_id: string;
  supplier_id: string | null;
  quantity: number;
  unit: string | null;
  status: string;
  notes: string | null;
  material: { id: string; name: string } | null;
  supplier: { id: string; company_name: string } | null;
};

export async function listSurgeryMaterialItems(supabase: SupabaseClient, surgeryId: string) {
  const { data, error } = await supabase
    .from("surgery_material_items")
    .select(
      "id,surgery_id,material_id,supplier_id,quantity,unit,status,notes,material:materials_catalog(id,name),supplier:suppliers(id,company_name)"
    )
    .eq("surgery_id", surgeryId)
    .neq("status", "removed")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as unknown as SurgeryMaterialItem[];
}

export async function addSurgeryMaterialItem(
  supabase: SupabaseClient,
  surgeryId: string,
  input: SurgeryMaterialItemInput
) {
  const { error } = await supabase
    .from("surgery_material_items")
    .insert({ surgery_id: surgeryId, ...input });
  if (error) throw error;
}

export async function setSurgeryMaterialItemStatus(
  supabase: SupabaseClient,
  id: string,
  status: string
) {
  const { error } = await supabase
    .from("surgery_material_items")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function removeSurgeryMaterialItem(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("surgery_material_items")
    .update({ status: "removed" })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Carrega na cirurgia o kit de materiais padrão cadastrado no(s)
 * procedimento(s) (substitui o antigo "importar de um protocolo
 * aprovado"). Quando a cirurgia tem mais de um procedimento, os kits são
 * somados e, se o mesmo material aparecer em mais de um, entra uma única
 * vez (fica com a maior quantidade pedida entre os procedimentos).
 */
export async function importProcedureDefaultMaterials(
  supabase: SupabaseClient,
  surgeryId: string,
  procedureIds: string[]
) {
  const { data: items, error } = await supabase
    .from("procedure_default_materials")
    .select("material_id,quantity,unit,preferred_supplier_id")
    .in("procedure_id", procedureIds);
  if (error) throw error;
  if (!items || items.length === 0) return 0;

  const byMaterial = new Map<string, (typeof items)[number]>();
  for (const item of items) {
    const existing = byMaterial.get(item.material_id);
    if (!existing || item.quantity > existing.quantity) {
      byMaterial.set(item.material_id, item);
    }
  }

  const rows = Array.from(byMaterial.values()).map((item) => ({
    surgery_id: surgeryId,
    material_id: item.material_id,
    supplier_id: item.preferred_supplier_id,
    quantity: item.quantity,
    unit: item.unit,
    status: "requested",
  }));

  const { error: insertError } = await supabase.from("surgery_material_items").insert(rows);
  if (insertError) throw insertError;
  return rows.length;
}
