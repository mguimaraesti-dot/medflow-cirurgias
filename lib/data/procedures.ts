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

export async function listActiveProceduresForSelect(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("procedures")
    .select("id,name")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return data as Pick<Procedure, "id" | "name">[];
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

/**
 * procedure_protocols.procedure_id tem "on delete cascade" — ou seja, se
 * deixássemos o banco cuidar sozinho, apagar um procedimento com
 * protocolos apagaria os protocolos junto, sem avisar. Por isso
 * verificamos aqui antes e bloqueamos com uma mensagem clara, em vez de
 * confiar só no erro de chave estrangeira (que não dispara nesse caso).
 */
export async function hasProcedureProtocols(supabase: SupabaseClient, id: string) {
  const { count, error } = await supabase
    .from("procedure_protocols")
    .select("id", { count: "exact", head: true })
    .eq("procedure_id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function deleteProcedure(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("procedures").delete().eq("id", id);
  if (error) throw error;
}
