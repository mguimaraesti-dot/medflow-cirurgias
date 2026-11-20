import type { SupabaseClient } from "@supabase/supabase-js";

import type { HospitalInput } from "@/lib/validation/hospitals";

export type Hospital = {
  id: string;
  name: string;
  cnpj: string | null;
  address: string | null;
  phone: string | null;
  admin_contact: string | null;
  or_contact: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

export async function listHospitals(supabase: SupabaseClient, search?: string) {
  let query = supabase
    .from("hospitals")
    .select("id,name,cnpj,address,phone,admin_contact,or_contact,email,notes,active,created_at")
    .order("name", { ascending: true });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Hospital[];
}

export async function getHospital(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from("hospitals").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Hospital;
}

export async function createHospital(supabase: SupabaseClient, input: HospitalInput) {
  const { error } = await supabase.from("hospitals").insert(input);
  if (error) throw error;
}

export async function updateHospital(
  supabase: SupabaseClient,
  id: string,
  input: HospitalInput
) {
  const { error } = await supabase.from("hospitals").update(input).eq("id", id);
  if (error) throw error;
}

export async function setHospitalActive(supabase: SupabaseClient, id: string, active: boolean) {
  const { error } = await supabase.from("hospitals").update({ active }).eq("id", id);
  if (error) throw error;
}
