import type { SupabaseClient } from "@supabase/supabase-js";

import { addSurgeryMaterialItem } from "@/lib/data/operations";
import {
  buildCompositionSignature,
  procedureSetKey,
  suggestCompositionName,
  type SignatureMaterial,
} from "@/lib/compositions/signature";

export type CompositionStatus = "reused" | "new" | "variant" | "unavailable";

export type CompositionInfo = {
  id: string;
  number: number;
  uses: number;
  materials: { material_id: string; name: string; quantity: number }[];
};

type ProcRow = { id: string; tuss_code: string | null; name?: string };

async function loadProcedures(supabase: SupabaseClient, ids: string[]): Promise<ProcRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("procedures").select("id,tuss_code,name").in("id", ids);
  if (error) throw error;
  return (data ?? []) as ProcRow[];
}

/** Composições já cadastradas cujo CONJUNTO de procedimentos é exatamente este. */
export async function listCompositionsForProcedures(
  supabase: SupabaseClient,
  procedureIds: string[]
): Promise<CompositionInfo[]> {
  if (procedureIds.length === 0) return [];
  const procs = await loadProcedures(supabase, procedureIds);
  const wanted = procedureSetKey(procs);

  const { data: links, error } = await supabase
    .from("procedure_composition_procedures")
    .select("composition_id")
    .in("procedure_id", procedureIds);
  if (error) throw error;
  const candidateIds = [...new Set((links ?? []).map((l) => l.composition_id as string))];
  if (candidateIds.length === 0) return [];

  const { data: comps, error: compError } = await supabase
    .from("procedure_compositions")
    .select(
      "id,number,procedures:procedure_composition_procedures(procedure:procedures(id,tuss_code))," +
        "materials:procedure_composition_materials(material_id,quantity,material:materials_catalog(name))"
    )
    .in("id", candidateIds)
    .order("number", { ascending: true });
  if (compError) throw compError;

  type CompRow = {
    id: string;
    number: number;
    procedures: { procedure: ProcRow | null }[];
    materials: { material_id: string; quantity: number; material: { name: string } | null }[];
  };
  const rows = (comps ?? []) as unknown as CompRow[];
  const matching = rows.filter(
    (c) =>
      procedureSetKey(c.procedures.map((p) => p.procedure).filter((p): p is ProcRow => Boolean(p))) === wanted
  );
  if (matching.length === 0) return [];

  const { data: usage } = await supabase
    .from("surgeries")
    .select("composition_id")
    .in("composition_id", matching.map((c) => c.id));
  const uses = new Map<string, number>();
  for (const u of usage ?? []) {
    const id = u.composition_id as string;
    uses.set(id, (uses.get(id) ?? 0) + 1);
  }

  return matching.map((c) => ({
    id: c.id,
    number: Number(c.number),
    uses: uses.get(c.id) ?? 0,
    materials: c.materials.map((m) => ({
      material_id: m.material_id,
      name: m.material?.name ?? "—",
      quantity: Number(m.quantity),
    })),
  }));
}

/** Diz o que aconteceria com esta combinação, sem gravar nada. */
export async function previewComposition(
  supabase: SupabaseClient,
  procedureIds: string[],
  materials: SignatureMaterial[]
): Promise<{ status: CompositionStatus; number?: number; uses?: number; variants: number }> {
  if (procedureIds.length === 0 || materials.length === 0) return { status: "unavailable", variants: 0 };
  const procs = await loadProcedures(supabase, procedureIds);
  const signature = buildCompositionSignature(procs, materials);
  const { data, error } = await supabase
    .from("procedure_compositions")
    .select("id,number")
    .eq("signature", signature)
    .maybeSingle();
  if (error) throw error;
  const sameSet = await listCompositionsForProcedures(supabase, procedureIds);
  if (data) {
    const found = sameSet.find((c) => c.id === data.id);
    return { status: "reused", number: Number(data.number), uses: found?.uses ?? 0, variants: sameSet.length };
  }
  return { status: sameSet.length > 0 ? "variant" : "new", variants: sameSet.length };
}

/**
 * Encontra a composição com esta assinatura ou cria uma nova. Nunca duplica
 * (assinatura única no banco; em corrida, relê a existente).
 */
export async function resolveComposition(
  supabase: SupabaseClient,
  procedureIds: string[],
  primaryProcedureId: string | null,
  materials: SignatureMaterial[]
): Promise<{ id: string; number: number; reused: boolean } | null> {
  if (procedureIds.length === 0 || materials.length === 0) return null;
  const procs = await loadProcedures(supabase, procedureIds);
  const signature = buildCompositionSignature(procs, materials);

  const find = async () => {
    const { data, error } = await supabase
      .from("procedure_compositions")
      .select("id,number")
      .eq("signature", signature)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const existing = await find();
  if (existing) return { id: existing.id as string, number: Number(existing.number), reused: true };

  const { data: created, error: insertError } = await supabase
    .from("procedure_compositions")
    .insert({
      signature,
      primary_procedure_id: primaryProcedureId,
      name: suggestCompositionName(
        procs.map((p) => ({ name: p.name ?? "", is_primary: p.id === primaryProcedureId }))
      ),
    })
    .select("id,number")
    .single();
  if (insertError) {
    const raced = await find();
    if (raced) return { id: raced.id as string, number: Number(raced.number), reused: true };
    throw insertError;
  }

  const compositionId = created.id as string;
  const merged = new Map<string, number>();
  for (const m of materials) merged.set(m.material_id, (merged.get(m.material_id) ?? 0) + (m.quantity > 0 ? m.quantity : 1));

  const { error: procError } = await supabase.from("procedure_composition_procedures").insert(
    [...new Set(procedureIds)].map((id) => ({
      composition_id: compositionId,
      procedure_id: id,
      is_primary: id === primaryProcedureId,
    }))
  );
  const { error: matError } = await supabase.from("procedure_composition_materials").insert(
    [...merged.entries()].map(([material_id, quantity]) => ({ composition_id: compositionId, material_id, quantity }))
  );
  if (procError || matError) {
    await supabase.from("procedure_compositions").delete().eq("id", compositionId);
    throw procError ?? matError;
  }
  return { id: compositionId, number: Number(created.number), reused: false };
}

/**
 * Recalcula a composição da cirurgia a partir dos procedimentos e materiais
 * ATUAIS e a vincula. Best-effort: nunca deve quebrar o fluxo principal
 * (ex.: migração ainda não aplicada).
 */
export async function syncSurgeryComposition(supabase: SupabaseClient, surgeryId: string) {
  try {
    const { data: links, error } = await supabase
      .from("surgery_procedures")
      .select("procedure_id,is_primary")
      .eq("surgery_id", surgeryId);
    if (error) throw error;
    const { data: items, error: itemsError } = await supabase
      .from("surgery_material_items")
      .select("material_id,quantity")
      .eq("surgery_id", surgeryId)
      .neq("status", "removed");
    if (itemsError) throw itemsError;

    const procedureIds = (links ?? []).map((l) => l.procedure_id as string);
    const primary = (links ?? []).find((l) => l.is_primary)?.procedure_id as string | undefined;
    const materials = (items ?? []).map((i) => ({
      material_id: i.material_id as string,
      quantity: Number(i.quantity),
    }));

    const composition = await resolveComposition(supabase, procedureIds, primary ?? null, materials);
    const { error: updateError } = await supabase
      .from("surgeries")
      .update({ composition_id: composition?.id ?? null })
      .eq("id", surgeryId);
    if (updateError) throw updateError;
  } catch (e) {
    console.error("[composition] não foi possível vincular a composição:", e);
  }
}

export type CompositionListItem = {
  id: string;
  number: number;
  name: string;
  created_at: string;
  updated_at: string;
  primary_procedure_id: string | null;
  procedures: { id: string; name: string; tuss_code: string | null; is_primary: boolean }[];
  materials: { material_id: string; name: string; tuss_code: string | null; quantity: number }[];
  /** Códigos das cirurgias/guias que usaram esta composição (sem dados do paciente). */
  surgeries: { id: string; code: string }[];
};

/** Todas as composições, da mais usada para a menos usada. */
export async function listAllCompositions(supabase: SupabaseClient): Promise<CompositionListItem[]> {
  const { data, error } = await supabase
    .from("procedure_compositions")
    .select(
      "id,number,name,created_at,updated_at,primary_procedure_id," +
        "procedures:procedure_composition_procedures(is_primary,procedure:procedures(id,name,tuss_code))," +
        "materials:procedure_composition_materials(material_id,quantity,material:materials_catalog(name,tuss_code))"
    )
    .order("number", { ascending: false })
    .limit(500);
  if (error) throw error;

  const { data: used, error: usedError } = await supabase
    .from("surgeries")
    .select("id,code,composition_id")
    .not("composition_id", "is", null)
    .limit(5000);
  if (usedError) throw usedError;
  const byComposition = new Map<string, { id: string; code: string }[]>();
  for (const s of used ?? []) {
    const list = byComposition.get(s.composition_id as string) ?? [];
    list.push({ id: s.id as string, code: s.code as string });
    byComposition.set(s.composition_id as string, list);
  }

  type Row = {
    id: string;
    number: number;
    name: string | null;
    created_at: string;
    updated_at: string | null;
    primary_procedure_id: string | null;
    procedures: { is_primary: boolean; procedure: { id: string; name: string; tuss_code: string | null } | null }[];
    materials: { material_id: string; quantity: number; material: { name: string; tuss_code: string | null } | null }[];
  };
  return ((data ?? []) as unknown as Row[])
    .map((c) => ({
      id: c.id,
      number: Number(c.number),
      name: "",
      created_at: c.created_at,
      updated_at: c.updated_at ?? c.created_at,
      primary_procedure_id: c.primary_procedure_id,
      procedures: c.procedures
        .filter((p) => p.procedure)
        .map((p) => ({ ...p.procedure!, is_primary: p.is_primary }))
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary)),
      materials: c.materials.map((m) => ({
        material_id: m.material_id,
        name: m.material?.name ?? "—",
        tuss_code: m.material?.tuss_code ?? null,
        quantity: Number(m.quantity),
      })),
      surgeries: byComposition.get(c.id) ?? [],
    }))
    .map((item, i) => ({
      ...item,
      name: ((data ?? []) as unknown as Row[])[i]?.name?.trim() || suggestCompositionName(item.procedures),
    }))
    .sort((a, b) => b.number - a.number);
}

export async function renameComposition(supabase: SupabaseClient, id: string, name: string) {
  const { error } = await supabase
    .from("procedure_compositions")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Composição vinculada a uma cirurgia (para a ficha). Null se não houver / migração ausente. */
export async function getSurgeryCompositionBrief(
  supabase: SupabaseClient,
  surgeryId: string
): Promise<{ number: number; uses: number } | null> {
  try {
    const { data } = await supabase.from("surgeries").select("composition_id").eq("id", surgeryId).single();
    const compositionId = data?.composition_id as string | null | undefined;
    if (!compositionId) return null;
    const [{ data: comp }, { count }] = await Promise.all([
      supabase.from("procedure_compositions").select("number").eq("id", compositionId).single(),
      supabase.from("surgeries").select("id", { count: "exact", head: true }).eq("composition_id", compositionId),
    ]);
    if (!comp) return null;
    return { number: Number(comp.number), uses: count ?? 1 };
  } catch {
    return null;
  }
}

/**
 * Cirurgia cadastrada à mão e ainda sem materiais: carrega os materiais da
 * composição MAIS USADA para exatamente o mesmo conjunto de procedimentos
 * (substitui o antigo kit padrão). Não faz nada se não houver composição.
 */
export async function importBestComposition(supabase: SupabaseClient, surgeryId: string) {
  try {
    const { count } = await supabase
      .from("surgery_material_items")
      .select("id", { count: "exact", head: true })
      .eq("surgery_id", surgeryId)
      .neq("status", "removed");
    if (count) return;
    const { data: links } = await supabase
      .from("surgery_procedures")
      .select("procedure_id")
      .eq("surgery_id", surgeryId);
    const ids = (links ?? []).map((l) => l.procedure_id as string);
    const compositions = await listCompositionsForProcedures(supabase, ids);
    const best = [...compositions].sort((a, b) => b.uses - a.uses || b.number - a.number)[0];
    if (!best) return;
    for (const m of best.materials) {
      await addSurgeryMaterialItem(supabase, surgeryId, { material_id: m.material_id, quantity: m.quantity });
    }
  } catch (e) {
    console.error("[composition] não foi possível carregar a composição:", e);
  }
}
