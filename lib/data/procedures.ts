import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProcedureInput } from "@/lib/validation/procedures";

export type Procedure = {
  id: string;
  internal_code: string | null;
  name: string;
  tuss_code: string | null;
  specialty: string | null;
  anatomical_region: string | null;
  classification: "diagnostico" | "terapeutico" | "ambos" | null;
  procedure_type: "endoscopico" | "cirurgico" | null;
  location: string | null;
  description: string | null;
  admin_notes: string | null;
  requires_anesthesia: boolean;
  requires_hospitalization: boolean;
  requires_opme: boolean;
  requires_special_equipment: boolean;
  requires_authorization: boolean;
  active: boolean;
  created_at: string;
};

const PROCEDURE_COLUMNS =
  "id,internal_code,name,tuss_code,specialty,anatomical_region,classification,procedure_type,location,description,admin_notes,requires_anesthesia,requires_hospitalization,requires_opme,requires_special_equipment,requires_authorization,active,created_at" as const;

export async function listProcedures(supabase: SupabaseClient, search?: string) {
  let query = supabase
    .from("procedures")
    .select(PROCEDURE_COLUMNS)
    .order("name", { ascending: true });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Procedure[];
}

export async function listActiveProceduresForSelect(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("procedures")
    .select("id,name")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return data as Pick<Procedure, "id" | "name">[];
}

export async function getProcedure(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("procedures")
    .select(PROCEDURE_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Procedure;
}

export async function createProcedure(supabase: SupabaseClient, input: ProcedureInput) {
  const { error } = await supabase.from("procedures").insert(input);
  if (error) throw error;
}

export async function updateProcedure(
  supabase: SupabaseClient,
  id: string,
  input: ProcedureInput
) {
  const { error } = await supabase.from("procedures").update(input).eq("id", id);
  if (error) throw error;
}

export async function setProcedureActive(supabase: SupabaseClient, id: string, active: boolean) {
  const { error } = await supabase.from("procedures").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteProcedure(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("procedures").delete().eq("id", id);
  if (error) throw error;
}
