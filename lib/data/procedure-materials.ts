import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProcedureDefaultMaterialInput } from "@/lib/validation/procedure-materials";

/**
 * Kit de materiais padrão de um procedimento — a lista de materiais que o
 * médico costuma usar nesse procedimento. Não tem nome, versão ou
 * aprovação (era assim no antigo "Protocolo de materiais"); é só a lista
 * atual, que serve de sugestão ao criar uma cirurgia e pode ser atualizada
 * depois de cada cirurgia, se o que foi usado for diferente.
 */
export type ProcedureDefaultMaterial = {
  id: string;
  procedure_id: string;
  material_id: string;
  quantity: number;
  unit: string | null;
  preferred_supplier_id: string | null;
  notes: string | null;
  updated_at: string;
  material: { id: string; name: string; internal_code: string | null; tuss_code: string | null } | null;
  preferred_supplier: { id: string; company_name: string } | null;
};

const COLUMNS =
  "id,procedure_id,material_id,quantity,unit,preferred_supplier_id,notes,updated_at," +
  "material:materials_catalog(id,name,internal_code,tuss_code),preferred_supplier:suppliers(id,company_name)";

export async function listDefaultMaterials(supabase: SupabaseClient, procedureId: string) {
  const { data, error } = await supabase
    .from("procedure_default_materials")
    .select(COLUMNS)
    .eq("procedure_id", procedureId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as unknown as ProcedureDefaultMaterial[];
}

/**
 * Kits padrão de vários procedimentos combinados — usado quando a cirurgia
 * tem mais de um procedimento. Some os kits e, se o mesmo material
 * aparecer em mais de um procedimento, mantém só 1 linha (a de maior
 * quantidade), pra exibição/comparação na ficha da cirurgia.
 */
export async function listDefaultMaterialsForProcedures(
  supabase: SupabaseClient,
  procedureIds: string[]
) {
  if (procedureIds.length === 0) return [];
  const { data, error } = await supabase
    .from("procedure_default_materials")
    .select(COLUMNS)
    .in("procedure_id", procedureIds)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = data as unknown as ProcedureDefaultMaterial[];
  const byMaterial = new Map<string, ProcedureDefaultMaterial>();
  for (const row of rows) {
    const existing = byMaterial.get(row.material_id);
    if (!existing || row.quantity > existing.quantity) {
      byMaterial.set(row.material_id, row);
    }
  }
  return Array.from(byMaterial.values());
}

export async function addDefaultMaterial(
  supabase: SupabaseClient,
  procedureId: string,
  input: ProcedureDefaultMaterialInput
) {
  const { error } = await supabase
    .from("procedure_default_materials")
    .insert({ procedure_id: procedureId, ...input });
  if (error) throw error;
}

export async function removeDefaultMaterial(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("procedure_default_materials").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Substitui todo o kit padrão do procedimento pela lista informada — usado
 * quando o usuário confirma que quer que os materiais usados numa cirurgia
 * passem a ser o novo padrão.
 */
export async function replaceDefaultMaterials(
  supabase: SupabaseClient,
  procedureId: string,
  items: { material_id: string; quantity: number; unit: string | null; preferred_supplier_id: string | null }[]
) {
  const { error: deleteError } = await supabase
    .from("procedure_default_materials")
    .delete()
    .eq("procedure_id", procedureId);
  if (deleteError) throw deleteError;

  if (items.length === 0) return;

  const rows = items.map((item) => ({
    procedure_id: procedureId,
    material_id: item.material_id,
    quantity: item.quantity,
    unit: item.unit,
    preferred_supplier_id: item.preferred_supplier_id,
  }));
  const { error: insertError } = await supabase.from("procedure_default_materials").insert(rows);
  if (insertError) throw insertError;
}
