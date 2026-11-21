import type { SupabaseClient } from "@supabase/supabase-js";

import type { MaterialInput } from "@/lib/validation/materials";

export type Material = {
  id: string;
  internal_code: string | null;
  name: string;
  category: string | null;
  description: string | null;
  unit: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  /** Código TUSS (Tabela 19 — materiais/OPME), quando encontrado na busca. */
  tuss_code: string | null;
  manufacturer: string | null;
  model: string | null;
  anvisa_registration: string | null;
};

const COLUMNS =
  "id,internal_code,name,category,description,unit,notes,active,created_at,tuss_code,manufacturer,model,anvisa_registration" as const;

export type MaterialSupplierRow = {
  id: string;
  supplier_id: string;
  preferred: boolean;
  notes: string | null;
  supplier: { id: string; company_name: string; active: boolean } | null;
};

export async function listMaterials(supabase: SupabaseClient, search?: string) {
  let query = supabase
    .from("materials_catalog")
    .select(COLUMNS)
    .order("name", { ascending: true });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Material[];
}

export async function listActiveMaterialsForSelect(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("materials_catalog")
    .select("id,name")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return data as Pick<Material, "id" | "name">[];
}

export async function getMaterial(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("materials_catalog")
    .select(COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Material;
}

export async function createMaterial(supabase: SupabaseClient, input: MaterialInput) {
  const { data, error } = await supabase
    .from("materials_catalog")
    .insert(input)
    .select("id,name")
    .single();
  if (error) throw error;
  return data as { id: string; name: string };
}

export async function updateMaterial(supabase: SupabaseClient, id: string, input: MaterialInput) {
  const { error } = await supabase.from("materials_catalog").update(input).eq("id", id);
  if (error) throw error;
}

export async function setMaterialActive(supabase: SupabaseClient, id: string, active: boolean) {
  const { error } = await supabase.from("materials_catalog").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteMaterial(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("materials_catalog").delete().eq("id", id);
  if (error) throw error;
}

export async function listMaterialSuppliers(supabase: SupabaseClient, materialId: string) {
  const { data, error } = await supabase
    .from("material_suppliers")
    .select("id,supplier_id,preferred,notes,supplier:suppliers(id,company_name,active)")
    .eq("material_id", materialId)
    .order("preferred", { ascending: false });
  if (error) throw error;
  return data as unknown as MaterialSupplierRow[];
}

export async function addMaterialSupplier(
  supabase: SupabaseClient,
  materialId: string,
  supplierId: string,
  preferred: boolean
) {
  const { error } = await supabase
    .from("material_suppliers")
    .insert({ material_id: materialId, supplier_id: supplierId, preferred });
  if (error) throw error;
}

export async function removeMaterialSupplier(supabase: SupabaseClient, linkId: string) {
  const { error } = await supabase.from("material_suppliers").delete().eq("id", linkId);
  if (error) throw error;
}
