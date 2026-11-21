import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Feriados exibidos na Agenda (/schedule) — informativo, nunca mexe em
 * contagem de cirurgia nem bloqueia agendamento (ver migration 0016).
 */
export type Holiday = {
  id: string;
  name: string;
  date: string;
  scope: "national" | "state" | "municipal";
  state: string | null;
  city: string | null;
  is_facultative: boolean;
  description: string | null;
};

const HOLIDAY_COLUMNS = "id,name,date,scope,state,city,is_facultative,description";

export async function listHolidays(
  supabase: SupabaseClient,
  filters: { from?: string; to?: string } = {}
): Promise<Holiday[]> {
  let query = supabase.from("holidays").select(HOLIDAY_COLUMNS).order("date", { ascending: true });
  if (filters.from) query = query.gte("date", filters.from);
  if (filters.to) query = query.lte("date", filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Holiday[];
}

export type HolidayInput = {
  name: string;
  date: string;
  scope: "national" | "state" | "municipal";
  state?: string;
  city?: string;
  is_facultative: boolean;
  description?: string;
};

export async function createHoliday(supabase: SupabaseClient, input: HolidayInput) {
  const { error } = await supabase.from("holidays").insert(input);
  if (error) throw error;
}

export async function updateHoliday(supabase: SupabaseClient, id: string, input: HolidayInput) {
  const { error } = await supabase.from("holidays").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteHoliday(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("holidays").delete().eq("id", id);
  if (error) throw error;
}
