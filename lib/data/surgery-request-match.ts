import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeText, fetchAll } from "@/lib/data/fetch-all";
import { listDefaultMaterialsForProcedures } from "@/lib/data/procedure-materials";
import type {
  MaterialSuggestion,
  PatientSuggestion,
  ProcedureSuggestion,
  RequestAnalysis,
  RequestExtraction,
} from "@/lib/surgery-request-types";

const STOP = new Set(["de", "da", "do", "das", "dos", "e", "com", "para", "por", "em", "a", "o", "um", "uma"]);

function tokens(value: string): string[] {
  return normalizeText(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

/** Parte das palavras de `a` que aparecem em `b` (0..1). */
function overlap(a: string[], b: string[]): number {
  if (a.length === 0) return 0;
  const set = new Set(b);
  return a.filter((t) => set.has(t) || [...set].some((s) => s.startsWith(t) || t.startsWith(s))).length / a.length;
}

function matchPatient(name: string | null, patients: { id: string; full_name: string }[]): PatientSuggestion {
  if (!name) return { read_name: null, match: "none", patient: null, alternatives: [] };
  const norm = normalizeText(name).replace(/\s+/g, " ").trim();
  const exact = patients.find((p) => normalizeText(p.full_name).replace(/\s+/g, " ").trim() === norm);
  if (exact) return { read_name: name, match: "exact", patient: exact, alternatives: [] };

  const t = tokens(name);
  const scored = patients
    .map((p) => {
      const pt = tokens(p.full_name);
      return { p, score: Math.min(overlap(t, pt), overlap(pt, t)) };
    })
    .filter((s) => s.score >= 0.6 && t.length >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  // Nome manuscrito pode ter erro de leitura: nunca escolhe sozinho um "parecido".
  return {
    read_name: name,
    match: scored.length ? "similar" : "none",
    patient: null,
    alternatives: scored.map((s) => s.p),
  };
}

export async function analyzeExtraction(
  supabase: SupabaseClient,
  extraction: RequestExtraction
): Promise<RequestAnalysis> {
  const [patients, procedures] = await Promise.all([
    fetchAll<{ id: string; full_name: string }>((from, to) =>
      supabase.from("patients").select("id,full_name").order("full_name").range(from, to)
    ),
    supabase.from("procedures").select("id,name,tuss_code").eq("active", true),
  ]);
  if (procedures.error) throw procedures.error;
  const catalog = (procedures.data ?? []) as { id: string; name: string; tuss_code: string | null }[];

  // Conferência dos códigos lidos contra a TUSS 22 local.
  const codes = extraction.procedures.map((p) => p.tuss_code).filter((c): c is string => Boolean(c));
  const official = new Map<string, string>();
  if (codes.length) {
    const { data } = await supabase
      .from("tuss_terms")
      .select("code,name")
      .eq("table_name", "tuss-22")
      .in("code", codes);
    for (const r of (data ?? []) as { code: string; name: string }[]) official.set(r.code, r.name);
  }
  const haveLocalTuss = official.size > 0 || codes.length === 0 ? true : await hasTuss22(supabase);

  const procSuggestions: ProcedureSuggestion[] = extraction.procedures.map((p, i) => {
    const code = p.tuss_code;
    const byCode = code ? catalog.find((c) => c.tuss_code === code) : undefined;
    let found = byCode ?? null;
    let match: ProcedureSuggestion["match"] = byCode ? "exact" : "none";
    if (!found) {
      const t = tokens(p.description);
      const t2 = tokens(official.get(code ?? "") ?? "");
      const best = catalog
        .map((c) => {
          const ct = tokens(c.name);
          return { c, score: Math.max(t.length ? overlap(t, ct) : 0, t2.length ? overlap(t2, ct) : 0) };
        })
        .sort((a, b) => b.score - a.score)[0];
      if (best && best.score >= 0.6) {
        found = best.c;
        match = "similar";
      }
    }
    return {
      key: `p${i}`,
      read_code: code,
      read_description: p.description,
      match,
      procedure: found,
      tuss_official_name: code ? (official.get(code) ?? null) : null,
      tuss_code_unknown: Boolean(code) && haveLocalTuss && !official.has(code as string),
    };
  });

  // Materiais citados na guia → catálogo de materiais.
  const materialCatalog = await fetchAll<{ id: string; name: string }>((from, to) =>
    supabase.from("materials_catalog").select("id,name").eq("active", true).order("name").range(from, to)
  );
  const materialSuggestions: MaterialSuggestion[] = [];
  const usedIds = new Set<string>();
  for (const [i, m] of extraction.materials.entries()) {
    const words = tokens(m.name);
    let candidates: { id: string; name: string }[] = [];
    if (words.length) {
      // Catálogo pequeno: compara em memória (o ilike do banco não ignora acento).
      const q = tokens(`${m.name} ${m.details ?? ""}`);
      candidates = materialCatalog
        .map((c) => {
          const ct = tokens(c.name);
          return { c, score: overlap(words, ct) * 2 + overlap(q, ct), hit: overlap(words, ct) };
        })
        .filter((x) => x.hit > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((x) => x.c);
    }
    const top = candidates[0];
    const strong =
      top && words.length > 0 && overlap(words, tokens(top.name)) >= 1 && !usedIds.has(top.id) ? top : null;
    if (strong) usedIds.add(strong.id);
    materialSuggestions.push({
      key: `m${i}`,
      source: "guide",
      read_name: m.name,
      quantity: m.quantity ?? 1,
      details: m.details,
      material: strong ? { id: strong.id, name: strong.name } : null,
      alternatives: candidates.filter((c) => c.id !== strong?.id).slice(0, 4),
    });
  }

  // Kit padrão dos procedimentos reconhecidos (sugestão adicional).
  const procedureIds = procSuggestions.map((p) => p.procedure?.id).filter((id): id is string => Boolean(id));
  const kit = await listDefaultMaterialsForProcedures(supabase, procedureIds);
  for (const k of kit) {
    if (!k.material || usedIds.has(k.material_id)) continue;
    usedIds.add(k.material_id);
    materialSuggestions.push({
      key: `k${k.id}`,
      source: "kit",
      read_name: k.material.name,
      quantity: k.quantity,
      details: null,
      material: { id: k.material.id, name: k.material.name },
      alternatives: [],
    });
  }

  return {
    guide_type: extraction.guide_type,
    clinical_indication: extraction.clinical_indication,
    patient: matchPatient(extraction.patient_name, patients),
    procedures: procSuggestions,
    materials: materialSuggestions,
    legibility_notes: extraction.legibility_notes,
  };
}

async function hasTuss22(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.from("tuss_terms").select("code").eq("table_name", "tuss-22").limit(1);
  return (data ?? []).length > 0;
}
