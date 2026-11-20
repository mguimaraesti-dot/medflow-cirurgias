import type { SupabaseClient } from "@supabase/supabase-js";

import type { InsuranceProviderInput } from "@/lib/validation/insurance-providers";

export type InsuranceProvider = {
  id: string;
  name: string;
  cnpj: string | null;
  code: string | null;
  contacts: string | null;
  email: string | null;
  phone: string | null;
  admin_rules: string | null;
  avg_authorization_days: number | null;
  avg_payment_days: number | null;
  active: boolean;
  created_at: string;
};

export async function listInsuranceProviders(supabase: SupabaseClient, search?: string) {
  let query = supabase
    .from("insurance_providers")
    .select(
      "id,name,cnpj,code,contacts,email,phone,admin_rules,avg_authorization_days,avg_payment_days,active,created_at"
    )
    .order("name", { ascending: true });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as InsuranceProvider[];
}

export async function listActiveInsuranceProvidersForSelect(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("insurance_providers")
    .select("id,name")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return data as Pick<InsuranceProvider, "id" | "name">[];
}

export async function createInsuranceProvider(
  supabase: SupabaseClient,
  input: InsuranceProviderInput
) {
  const { error } = await supabase.from("insurance_providers").insert(input);
  if (error) throw error;
}

export async function updateInsuranceProvider(
  supabase: SupabaseClient,
  id: string,
  input: InsuranceProviderInput
) {
  const { error } = await supabase.from("insurance_providers").update(input).eq("id", id);
  if (error) throw error;
}

export async function setInsuranceProviderActive(
  supabase: SupabaseClient,
  id: string,
  active: boolean
) {
  const { error } = await supabase.from("insurance_providers").update({ active }).eq("id", id);
  if (error) throw error;
}
