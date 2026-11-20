import type { SupabaseClient } from "@supabase/supabase-js";

import type { SurgeryInput } from "@/lib/validation/surgeries";

export type WorkflowStage = {
  id: string;
  code: string;
  name: string;
  sort_order: number;
};

export type SurgeryListItem = {
  id: string;
  code: string;
  stage_id: string;
  attendance_type: "particular" | "convenio";
  priority: "low" | "normal" | "high" | "urgent";
  expected_date: string | null;
  confirmed_date: string | null;
  status: string;
  patient: { id: string; full_name: string } | null;
  hospital: { id: string; name: string } | null;
  primary_procedure: { id: string; name: string } | null;
};

export type Surgery = SurgeryListItem & {
  patient_id: string;
  hospital_id: string;
  insurance_provider_id: string | null;
  insurance_provider: { id: string; name: string } | null;
  primary_procedure_id: string;
  indication_date: string;
  confirmed_time: string | null;
  admin_notes: string | null;
  cancelled_reason: string | null;
  created_at: string;
};

export type SurgeryRequirement = {
  id: string;
  surgery_id: string;
  requirement_key: "authorization" | "materials" | "or_reservation" | "preoperative";
  is_mandatory: boolean;
  is_satisfied: boolean;
  waived: boolean;
  waived_reason: string | null;
  updated_at: string;
};

export type StageHistoryEntry = {
  id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  reason: string | null;
  changed_at: string;
  from_stage: { name: string } | null;
  to_stage: { name: string } | null;
};

const LIST_COLUMNS =
  "id,code,stage_id,attendance_type,priority,expected_date,confirmed_date,status," +
  "patient:patients(id,full_name),hospital:hospitals(id,name),primary_procedure:procedures(id,name)";

const DETAIL_COLUMNS =
  LIST_COLUMNS +
  ",patient_id,hospital_id,insurance_provider_id,insurance_provider:insurance_providers(id,name)," +
  "primary_procedure_id,indication_date,confirmed_time,admin_notes,cancelled_reason,created_at";

export async function listWorkflowStages(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("workflow_stages")
    .select("id,code,name,sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as WorkflowStage[];
}

export async function listKanbanSurgeries(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("surgeries")
    .select(LIST_COLUMNS)
    .eq("status", "active")
    .order("priority", { ascending: false })
    .order("expected_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data as unknown as SurgeryListItem[];
}

export async function listSurgeriesForSelect(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("surgeries")
    .select("id,code")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as { id: string; code: string }[];
}

export async function listSurgeries(supabase: SupabaseClient, search?: string) {
  let query = supabase
    .from("surgeries")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("code", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as SurgeryListItem[];
}

export async function getSurgery(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("surgeries")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as Surgery;
}

export async function createSurgery(supabase: SupabaseClient, input: SurgeryInput) {
  const { data: firstStage, error: stageError } = await supabase
    .from("workflow_stages")
    .select("id")
    .eq("code", "new_indication")
    .single();
  if (stageError) throw stageError;

  const { data, error } = await supabase
    .from("surgeries")
    .insert({ ...input, stage_id: firstStage.id })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function updateSurgery(supabase: SupabaseClient, id: string, input: SurgeryInput) {
  const { error } = await supabase.from("surgeries").update(input).eq("id", id);
  if (error) throw error;
}

export async function moveSurgeryStage(
  supabase: SupabaseClient,
  id: string,
  stageId: string
) {
  const { error } = await supabase.from("surgeries").update({ stage_id: stageId }).eq("id", id);
  if (error) throw error;
}

export async function cancelSurgery(supabase: SupabaseClient, id: string, reason: string) {
  const { error } = await supabase
    .from("surgeries")
    .update({ status: "cancelled", cancelled_reason: reason })
    .eq("id", id);
  if (error) throw error;
}

export async function listStageHistory(supabase: SupabaseClient, surgeryId: string) {
  const { data, error } = await supabase
    .from("surgery_stage_history")
    .select("id,from_stage_id,to_stage_id,reason,changed_at,from_stage:workflow_stages!from_stage_id(name),to_stage:workflow_stages!to_stage_id(name)")
    .eq("surgery_id", surgeryId)
    .order("changed_at", { ascending: true });
  if (error) throw error;
  return data as unknown as StageHistoryEntry[];
}

export async function listRequirements(supabase: SupabaseClient, surgeryId: string) {
  const { data, error } = await supabase
    .from("surgery_requirements")
    .select("id,surgery_id,requirement_key,is_mandatory,is_satisfied,waived,waived_reason,updated_at")
    .eq("surgery_id", surgeryId)
    .order("requirement_key", { ascending: true });
  if (error) throw error;
  return data as SurgeryRequirement[];
}

export async function updateRequirement(
  supabase: SupabaseClient,
  id: string,
  input: { is_satisfied: boolean; waived: boolean; waived_reason?: string }
) {
  const { error } = await supabase
    .from("surgery_requirements")
    .update({
      is_satisfied: input.is_satisfied,
      waived: input.waived,
      waived_reason: input.waived_reason ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}

export type ParticularFinancialRecord = {
  id: string;
  surgery_id: string;
  expected_value: number | null;
  agreed_value: number | null;
  notes: string | null;
};

export async function getFinancialRecord(supabase: SupabaseClient, surgeryId: string) {
  const { data, error } = await supabase
    .from("financial_records")
    .select("id,surgery_id,expected_value,agreed_value,notes")
    .eq("surgery_id", surgeryId)
    .maybeSingle();
  if (error) throw error;
  return data as ParticularFinancialRecord | null;
}

export async function upsertParticularFinancialRecord(
  supabase: SupabaseClient,
  surgeryId: string,
  input: { expected_value?: number; agreed_value?: number; notes?: string }
) {
  const existing = await getFinancialRecord(supabase, surgeryId);
  if (existing) {
    const { error } = await supabase
      .from("financial_records")
      .update({
        expected_value: input.expected_value ?? null,
        agreed_value: input.agreed_value ?? null,
        notes: input.notes ?? null,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("financial_records").insert({
      surgery_id: surgeryId,
      attendance_type: "particular",
      expected_value: input.expected_value ?? null,
      agreed_value: input.agreed_value ?? null,
      notes: input.notes ?? null,
    });
    if (error) throw error;
  }
}
