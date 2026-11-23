import type { SupabaseClient } from "@supabase/supabase-js";

import { listSurgeriesForMap } from "@/lib/data/surgeries";
import { listTasks } from "@/lib/data/tasks";
import type { DashboardFilters } from "@/lib/data/dashboard";
import { todayInSaoPaulo } from "@/lib/utils";

export type AttentionLevel = "critical" | "high" | "medium";
export type AttentionKind = "authorization" | "materials" | "documents" | "hospital" | "task" | "unconfirmed";

export type AttentionItem = {
  id: string;
  kind: AttentionKind;
  level: AttentionLevel;
  title: string;
  detail: string;
  patient: string | null;
  procedure: string | null;
  responsible: string | null;
  /** tempo de pendência, em dias */
  ageDays: number;
  href: string;
};

const LEVEL_RANK: Record<AttentionLevel, number> = { critical: 0, high: 1, medium: 2 };

function daysBetween(a: string, b: string) {
  return Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);
}

/**
 * Central de atenção: regras automáticas sobre dados reais dos módulos
 * existentes (autorizações, materiais, documentos, reserva, tarefas, datas).
 * Considera só cirurgias ativas e respeita hospital/atendimento do filtro.
 */
export async function getAttentionItems(
  supabase: SupabaseClient,
  f: Pick<DashboardFilters, "hospitalId" | "attendance">,
  options: { includeTasks?: boolean } = {}
): Promise<AttentionItem[]> {
  const today = todayInSaoPaulo();

  const surgeries = await listSurgeriesForMap(supabase, { status: "active", hospitalId: f.hospitalId, attendance: f.attendance });
  const ids = surgeries.map((s) => s.id);
  const byId = new Map(surgeries.map((s) => [s.id, s]));

  const chunks = <T,>(arr: T[], n = 100) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  const authRows: { surgery_id: string; status: string; sent_at: string | null; responsible: string | null }[] = [];
  const docCount = new Map<string, number>();
  const matTotal = new Map<string, number>();
  const matPending = new Map<string, number>();
  for (const part of chunks(ids)) {
    const [auth, docs, mats] = await Promise.all([
      supabase.from("authorization_requests").select("surgery_id,status,sent_at,responsible").in("surgery_id", part).in("status", ["sent", "in_review", "pending_docs"]),
      supabase.from("surgery_documents").select("surgery_id").in("surgery_id", part),
      supabase.from("surgery_material_items").select("surgery_id,validated").in("surgery_id", part).neq("status", "removed"),
    ]);
    if (auth.error) throw auth.error;
    if (docs.error) throw docs.error;
    if (mats.error) throw mats.error;
    authRows.push(...((auth.data ?? []) as typeof authRows));
    for (const d of docs.data ?? []) docCount.set(d.surgery_id, (docCount.get(d.surgery_id) ?? 0) + 1);
    for (const m of (mats.data ?? []) as { surgery_id: string; validated: boolean }[]) {
      matTotal.set(m.surgery_id, (matTotal.get(m.surgery_id) ?? 0) + 1);
      if (!m.validated) matPending.set(m.surgery_id, (matPending.get(m.surgery_id) ?? 0) + 1);
    }
  }

  const respIds = Array.from(new Set(authRows.map((a) => a.responsible).filter((v): v is string => Boolean(v))));
  const names = new Map<string, string>();
  if (respIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id,full_name").in("id", respIds);
    for (const p of data ?? []) names.set(p.id, p.full_name);
  }

  const items: AttentionItem[] = [];
  const base = (s: (typeof surgeries)[number]) => ({
    patient: s.patient?.full_name ?? null,
    procedure: s.primary_procedure?.name ?? null,
    href: `/surgeries/${s.id}`,
  });
  const dateOf = (s: (typeof surgeries)[number]) => s.confirmed_date ?? s.expected_date;
  const daysTo = (s: (typeof surgeries)[number]) => {
    const d = dateOf(s);
    return d ? daysBetween(today, d) : null;
  };

  // 1) Autorização enviada há mais de 48h sem retorno.
  for (const a of authRows) {
    const s = byId.get(a.surgery_id);
    if (!s || !a.sent_at) continue;
    const age = daysBetween(a.sent_at, today);
    if (age < 2) continue;
    items.push({
      id: `auth-${a.surgery_id}`,
      kind: "authorization",
      level: age >= 5 ? "critical" : "high",
      title: "Autorização pendente há mais de 48h",
      detail: `Enviada em ${a.sent_at.split("-").reverse().join("/")} — risco de atraso na cirurgia`,
      responsible: a.responsible ? (names.get(a.responsible) ?? null) : null,
      ageDays: age,
      ...base(s),
    });
  }

  for (const s of surgeries) {
    const to = daysTo(s);
    const isNear = to !== null && to <= 14;
    const age = Math.max(0, daysBetween(s.indication_date, today));
    const reqs = new Map(s.requirements.map((r) => [r.requirement_key, r]));

    // 2) Sem materiais/OPME confirmados.
    if (isNear) {
      const total = matTotal.get(s.id) ?? 0;
      const pending = matPending.get(s.id) ?? 0;
      if (total === 0 || pending > 0) {
        items.push({
          id: `mat-${s.id}`,
          kind: "materials",
          level: to! <= 3 ? "critical" : total === 0 || to! <= 7 ? "high" : "medium",
          title: total === 0 ? "Cirurgia sem OPME/materiais" : `${pending} material(is) sem validação`,
          detail: to! < 0 ? "Data prevista já passou" : `Cirurgia ${to === 0 ? "hoje" : `em ${to} dia(s)`} — confirmar materiais`,
          responsible: null,
          ageDays: age,
          ...base(s),
        });
      }
    }

    // 3) Documentação incompleta (nenhum documento anexado).
    if ((docCount.get(s.id) ?? 0) === 0) {
      items.push({
        id: `doc-${s.id}`,
        kind: "documents",
        level: to !== null && to <= 7 ? "high" : "medium",
        title: "Documentação incompleta",
        detail: "Nenhum documento anexado à solicitação",
        responsible: null,
        ageDays: age,
        ...base(s),
      });
    }

    // 4) Pendência hospitalar (reserva do centro cirúrgico não confirmada).
    const reservation = reqs.get("or_reservation");
    if (isNear && reservation && !reservation.is_satisfied && !reservation.waived) {
      items.push({
        id: `hosp-${s.id}`,
        kind: "hospital",
        level: to! <= 3 ? "critical" : to! <= 7 ? "high" : "medium",
        title: "Reserva hospitalar pendente",
        detail: `Reserva do centro cirúrgico não confirmada${s.hospital?.name ? ` — ${s.hospital.name}` : ""}`,
        responsible: null,
        ageDays: age,
        ...base(s),
      });
    }

    // 5) Cirurgia próxima (ou com data vencida) sem confirmação.
    if (!s.confirmed_date && s.expected_date && daysBetween(today, s.expected_date) <= 7) {
      const d = daysBetween(today, s.expected_date);
      items.push({
        id: `unc-${s.id}`,
        kind: "unconfirmed",
        level: d <= 2 ? "critical" : "high",
        title: d < 0 ? "Data prevista vencida sem confirmação" : "Cirurgia próxima sem confirmação",
        detail: d < 0 ? `Prevista para ${s.expected_date.split("-").reverse().join("/")}` : d === 0 ? "Prevista para hoje" : `Prevista em ${d} dia(s)`,
        responsible: null,
        ageDays: d < 0 ? -d : 0,
        ...base(s),
      });
    }
  }

  // 6) Tarefas vencidas (abertas com prazo anterior a hoje).
  const tasks = options.includeTasks === false ? [] : await listTasks(supabase, {});
  for (const t of tasks) {
    if (!t.due_date || t.due_date >= today) continue;
    if (t.status === "done" || t.status === "cancelled") continue;
    if (t.surgery_id && !byId.has(t.surgery_id) && (f.hospitalId || f.attendance)) continue;
    const age = daysBetween(t.due_date, today);
    items.push({
      id: `task-${t.id}`,
      kind: "task",
      level: age >= 3 || t.priority === "urgent" ? "critical" : "high",
      title: "Tarefa vencida",
      detail: t.title,
      patient: t.surgery?.patient?.full_name ?? null,
      procedure: null,
      responsible: t.assigned_user?.full_name ?? null,
      ageDays: age,
      href: t.surgery_id ? `/surgeries/${t.surgery_id}` : "/pending-tasks",
    });
  }

  return items.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || b.ageDays - a.ageDays);
}
