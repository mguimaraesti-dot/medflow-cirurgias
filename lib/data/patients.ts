import type { SupabaseClient } from "@supabase/supabase-js";

import type { PatientInput } from "@/lib/validation/patients";

export type Patient = {
  id: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  insurance_provider_id: string | null;
  insurance_card_number: string | null;
  insurance_card_validity: string | null;
  admin_notes: string | null;
  created_at: string;
  insurance_provider: { id: string; name: string } | null;
};

const SELECT_COLUMNS =
  "id,full_name,cpf,birth_date,phone,whatsapp,email,address,insurance_provider_id,insurance_card_number,insurance_card_validity,admin_notes,created_at,insurance_provider:insurance_providers(id,name)";

export async function listPatients(supabase: SupabaseClient, search?: string) {
  let query = supabase
    .from("patients")
    .select(SELECT_COLUMNS)
    .order("full_name", { ascending: true });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,cpf.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Patient[];
}

export async function createPatient(supabase: SupabaseClient, input: PatientInput) {
  const { error } = await supabase.from("patients").insert(input);
  if (error) throw error;
}

export async function updatePatient(supabase: SupabaseClient, id: string, input: PatientInput) {
  const { error } = await supabase.from("patients").update(input).eq("id", id);
  if (error) throw error;
}
