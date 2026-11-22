import type { SupabaseClient } from "@supabase/supabase-js";

import { deriveSituation, SITUATIONS, type SurgerySituation } from "@/lib/surgery-situation";
import type { SurgeryListParams } from "@/lib/surgery-list-params";
import { fetchAll, normalizeText as norm } from "@/lib/data/fetch-all";

export type SurgeryListRow = {
  id: string;
  code: string;
  created_at: string;
  attendance_type: "particular" | "convenio";
  priority: "low" | "normal" | "high" | "urgent";
  indication_date: string;
  expected_date: string | null;
  confirmed_date: string | null;
  status: string;
  situation: SurgerySituation;
  stage_name: string | null;
  patient_name: string | null;
  hospital_name: string | null;
  insurance_name: string | null;
  /** Procedimento principal primeiro. */
  procedures: { name: string; tuss_code: string | null; is_primary: boolean }[];
};

export type SurgeryListStats = Record<SurgerySituation, number> & { total: number };

type RawRow = {
  id: string;
  code: string;
  created_at: string;
  attendance_type: "particular" | "convenio";
  priority: "low" | "normal" | "high" | "urgent";
  indication_date: string;
  expected_date: string | null;
  confirmed_date: string | null;
  status: string;
  patient: { full_name: string } | null;
  hospital: { name: string } | null;
  insurance_provider: { name: string } | null;
  stage: { name: string } | null;
  surgery_procedures: { is_primary: boolean; procedure: { name: string; tuss_code: string | null } | null }[];
};

const COLUMNS =
  "id,code,created_at,attendance_type,priority,indication_date,expected_date,confirmed_date,status," +
  "patient:patients(full_name),hospital:hospitals(name),insurance_provider:insurance_providers(name)," +
  "stage:workflow_stages(name)," +
  "surgery_procedures(is_primary,procedure:procedures(name,tuss_code))";

/**
 * Listagem de cirurgias (/surgeries): indicadores + página de resultados.
 *
 * Duas consultas em paralelo:
 *  1. só as 3 colunas de data/status de TODAS as cirurgias → indicadores
 *     (a visão geral, que não muda com os filtros);
 *  2. as cirurgias que passam nos filtros "de coluna" (hospital, atendimento,
 *     prioridade, períodos), já com paciente/hospital/procedimentos.
 * Busca por texto (código, paciente, hospital, procedimento, TUSS), situação,
 * ordenação e paginação são feitas em memória sobre o resultado — assim a
 * busca ignora acento e cobre campos de tabelas diferentes sem várias idas
 * ao banco. Adequado pro volume de um consultório (milhares de linhas).
 */
export async function listSurgeriesPage(supabase: SupabaseClient, params: SurgeryListParams) {
  const statsPromise = fetchAll<{ status: string; confirmed_date: string | null; expected_date: string | null }>(
    (from, to) =>
      supabase
        .from("surgeries")
        .select("status,confirmed_date,expected_date")
        .order("id", { ascending: true })
        .range(from, to)
  );

  const rowsPromise = fetchAll<RawRow>((from, to) => {
    let query = supabase.from("surgeries").select(COLUMNS);
    if (params.hospital) query = query.eq("hospital_id", params.hospital);
    if (params.priority) query = query.eq("priority", params.priority);
    if (params.attendance) query = query.eq("attendance_type", params.attendance);
    if (params.requestFrom) query = query.gte("indication_date", params.requestFrom);
    if (params.requestTo) query = query.lte("indication_date", params.requestTo);
    if (params.expectedFrom) query = query.gte("expected_date", params.expectedFrom);
    if (params.expectedTo) query = query.lte("expected_date", params.expectedTo);
    return query.order("id", { ascending: true }).range(from, to);
  });

  const [statsRows, rawRows] = await Promise.all([statsPromise, rowsPromise]);

  const stats = { total: statsRows.length } as SurgeryListStats;
  for (const s of SITUATIONS) stats[s] = 0;
  for (const r of statsRows) stats[deriveSituation(r)] += 1;

  let rows: SurgeryListRow[] = rawRows.map((r) => {
    const procedures = (r.surgery_procedures ?? [])
      .filter((l) => l.procedure)
      .map((l) => ({ name: l.procedure!.name, tuss_code: l.procedure!.tuss_code, is_primary: l.is_primary }))
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
    return {
      id: r.id,
      code: r.code,
      created_at: r.created_at,
      attendance_type: r.attendance_type,
      priority: r.priority,
      indication_date: r.indication_date,
      expected_date: r.expected_date,
      confirmed_date: r.confirmed_date,
      status: r.status,
      situation: deriveSituation(r),
      stage_name: r.stage?.name ?? null,
      patient_name: r.patient?.full_name ?? null,
      hospital_name: r.hospital?.name ?? null,
      insurance_name: r.insurance_provider?.name ?? null,
      procedures,
    };
  });

  if (params.status) rows = rows.filter((r) => r.situation === params.status);

  const term = norm(params.q);
  if (term) {
    const tokens = term.split(/\s+/).filter(Boolean);
    rows = rows.filter((r) => {
      const haystack = norm(
        [
          r.code,
          r.patient_name,
          r.hospital_name,
          ...r.procedures.flatMap((p) => [p.name, p.tuss_code]),
        ].join(" ")
      );
      return tokens.every((t) => haystack.includes(t));
    });
  }

  const dirFactor = params.dir === "asc" ? 1 : -1;
  const text = (a: string | null, b: string | null) =>
    // vazios sempre no fim, independente da direção
    !a && !b ? 0 : !a ? 1 : !b ? -1 : dirFactor * a.localeCompare(b, "pt-BR", { numeric: true });
  const date = (a: string | null, b: string | null) =>
    !a && !b ? 0 : !a ? 1 : !b ? -1 : dirFactor * (a < b ? -1 : a > b ? 1 : 0);

  rows.sort((a, b) => {
    switch (params.sort) {
      case "code":
        return text(a.code, b.code);
      case "patient":
        return text(a.patient_name, b.patient_name);
      case "hospital":
        return text(a.hospital_name, b.hospital_name);
      case "procedure":
        return text(a.procedures[0]?.name ?? null, b.procedures[0]?.name ?? null);
      case "indication_date":
        return date(a.indication_date, b.indication_date);
      case "expected_date":
        return date(a.expected_date, b.expected_date);
      case "confirmed_date":
        return date(a.confirmed_date, b.confirmed_date);
      case "status":
        return (
          dirFactor * (SITUATIONS.indexOf(a.situation) - SITUATIONS.indexOf(b.situation)) ||
          date(a.created_at, b.created_at)
        );
      default:
        return date(a.created_at, b.created_at);
    }
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / params.size));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * params.size;

  return { rows: rows.slice(start, start + params.size), total, page, pageCount, stats };
}
