import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAll, normalizeText as norm } from "@/lib/data/fetch-all";
import type { ProcedureListParams } from "@/lib/procedure-list-params";

export type ProcedureListRow = {
  id: string;
  internal_code: string | null;
  name: string;
  tuss_code: string | null;
  specialty: string | null;
  location: string | null;
  description: string | null;
  admin_notes: string | null;
  active: boolean;
  /** Quantidade de materiais no kit padrão. */
  materials_count: number;
};

export type ProcedureListStats = { total: number; active: number; inactive: number; withMaterials: number };

const COLUMNS = "id,internal_code,name,tuss_code,specialty,location,description,admin_notes,active";

const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

/**
 * Listagem de procedimentos: indicadores + página de resultados.
 * O catálogo é pequeno (dezenas/centenas de linhas), então lê tudo em 2
 * consultas paralelas (procedimentos + só o procedure_id do kit, pra contar
 * materiais) e faz busca (sem acento), filtros, ordenação e paginação em
 * memória — sem uma consulta por linha.
 */
export async function listProceduresPage(supabase: SupabaseClient, params: ProcedureListParams) {
  const [procedures, kitRows] = await Promise.all([
    fetchAll<Omit<ProcedureListRow, "materials_count">>((from, to) =>
      supabase.from("procedures").select(COLUMNS).order("id").range(from, to)
    ),
    fetchAll<{ procedure_id: string }>((from, to) =>
      supabase.from("procedure_default_materials").select("procedure_id").order("id").range(from, to)
    ),
  ]);

  const counts = new Map<string, number>();
  for (const k of kitRows) counts.set(k.procedure_id, (counts.get(k.procedure_id) ?? 0) + 1);

  const all: ProcedureListRow[] = procedures.map((p) => ({ ...p, materials_count: counts.get(p.id) ?? 0 }));

  const stats: ProcedureListStats = {
    total: all.length,
    active: all.filter((p) => p.active).length,
    inactive: all.filter((p) => !p.active).length,
    withMaterials: all.filter((p) => p.materials_count > 0).length,
  };

  const distinct = (pick: (p: ProcedureListRow) => string | null) =>
    [...new Set(all.map(pick).filter((v): v is string => !!v && v.trim() !== ""))].sort((a, b) =>
      collator.compare(a, b)
    );
  const specialties = distinct((p) => p.specialty);
  const locations = distinct((p) => p.location);

  const needle = norm(params.q);
  let rows = all.filter((p) => {
    if (params.specialty && p.specialty !== params.specialty) return false;
    if (params.location && p.location !== params.location) return false;
    if (params.status === "active" && !p.active) return false;
    if (params.status === "inactive" && p.active) return false;
    if (needle) {
      const hay = norm([p.name, p.internal_code, p.tuss_code, p.specialty].filter(Boolean).join(" "));
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const key: Record<ProcedureListParams["sort"], (p: ProcedureListRow) => string | number> = {
    name: (p) => p.name,
    code: (p) => p.internal_code ?? "",
    tuss: (p) => p.tuss_code ?? "",
    specialty: (p) => p.specialty ?? "",
    location: (p) => p.location ?? "",
    materials: (p) => p.materials_count,
    status: (p) => (p.active ? 1 : 0),
  };
  const get = key[params.sort];
  const sign = params.dir === "asc" ? 1 : -1;
  rows = [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    const c = typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y));
    return c !== 0 ? sign * c : collator.compare(a.name, b.name);
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / params.size));
  const page = Math.min(params.page, pageCount);
  const pageRows = rows.slice((page - 1) * params.size, page * params.size);

  return { rows: pageRows, total, page, pageCount, stats, specialties, locations };
}
