import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProcedureInput } from "@/lib/validation/procedures";

export type Procedure = {
  id: string;
  internal_code: string | null;
  name: string;
  specialty: string | null;
  description: string | null;
  admin_notes: string | null;
  active: boolean;
  created_at: string;
};

export async function listProcedures(supabase: SupabaseClient, search?: string) {
  let query = supabase
    .from("procedures")
    .select("id,internal_code,name,specialty,description,admin_notes,active,created_at")
    .order("name", { ascending: true });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Procedure[];
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
