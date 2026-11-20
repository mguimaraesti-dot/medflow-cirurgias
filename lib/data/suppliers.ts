import type { SupabaseClient } from "@supabase/supabase-js";

import type { SupplierInput } from "@/lib/validation/suppliers";

export type Supplier = {
  id: string;
  company_name: string;
  trade_name: string | null;
  cnpj: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

export async function listSuppliers(supabase: SupabaseClient, search?: string) {
  let query = supabase
    .from("suppliers")
    .select(
      "id,company_name,trade_name,cnpj,contact_name,phone,email,address,notes,active,created_at"
    )
    .order("company_name", { ascending: true });

  if (search) {
    query = query.or(`company_name.ilike.%${search}%,trade_name.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Supplier[];
}

/** Lista só os fornecedores ativos — para usar em selects (ex: vincular a um material). */
export async function listActiveSuppliersForSelect(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("suppliers")
    .select("id,company_name")
    .eq("active", true)
    .order("company_name", { ascending: true });
  if (error) throw error;
  return data as Pick<Supplier, "id" | "company_name">[];
}

export async function createSupplier(supabase: SupabaseClient, input: SupplierInput) {
  const { error } = await supabase.from("suppliers").insert(input);
  if (error) throw error;
}

export async function updateSupplier(supabase: SupabaseClient, id: string, input: SupplierInput) {
  const { error } = await supabase.from("suppliers").update(input).eq("id", id);
  if (error) throw error;
}

export async function setSupplierActive(supabase: SupabaseClient, id: string, active: boolean) {
  const { error } = await supabase.from("suppliers").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteSupplier(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw error;
}
