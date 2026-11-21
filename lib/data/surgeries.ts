import type { SupabaseClient } from "@supabase/supabase-js";

import type { SurgeryInput } from "@/lib/validation/surgeries";
import {
  listAuthorizationHistoryForSurgery,
  importProcedureDefaultMaterials,
} from "@/lib/data/operations";

export type WorkflowStage = {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type SurgeryProcedureLink = {
  id: string;
  is_primary: boolean;
  procedure: { id: string; name: string } | null;
};

export type SurgeryListItem = {
  id: string;
  code: string;
  stage_id: string;
  /** Ordem manual dentro da coluna do Kanban (menor = mais acima). */
  board_position: number;
  attendance_type: "particular" | "convenio";
  priority: "low" | "normal" | "high" | "urgent";
  indication_date: string;
  expected_date: string | null;
  confirmed_date: string | null;
  status: string;
  patient: { id: string; full_name: string } | null;
  hospital: { id: string; name: string } | null;
  /** Procedimento marcado como principal — usado como rótulo curto no
   * Kanban e na lista. */
  primary_procedure: { id: string; name: string } | null;
  /** Todos os procedimentos da cirurgia (principal + adicionais). */
  procedures: { id: string; name: string; is_primary: boolean }[];
  insurance_provider: { id: string; name: string } | null;
  requirements: { id: string; requirement_key: string; is_satisfied: boolean; waived: boolean }[];
};

function withDerivedProcedures<T extends { surgery_procedures: SurgeryProcedureLink[] }>(
  row: T
): Omit<T, "surgery_procedures"> & {
  primary_procedure: { id: string; name: string } | null;
  procedures: { id: string; name: string; is_primary: boolean }[];
} {
  const { surgery_procedures, ...rest } = row;
  const procedures = (surgery_procedures ?? [])
    .filter((link) => link.procedure)
    .map((link) => ({ id: link.procedure!.id, name: link.procedure!.name, is_primary: link.is_primary }));
  const primary = procedures.find((p) => p.is_primary) ?? procedures[0] ?? null;
  return {
    ...rest,
    primary_procedure: primary ? { id: primary.id, name: primary.name } : null,
    procedures,
  };
}

export type SurgeryMapFilters = {
  q?: string;
  procedureId?: string;
  hospitalId?: string;
  /** id da operadora, ou "particular" para filtrar atendimento particular */
  attendance?: string;
  priority?: string;
  status?: string;
  from?: string;
  to?: string;
  /** só cirurgias ativas com data prevista vencida e ainda não confirmadas */
  overdueOnly?: boolean;
  /** só cirurgias com esse requisito pendente (não satisfeito, não dispensado) */
  pendingRequirement?: "authorization" | "or_reservation" | "preoperative";
  /** só cirurgias com data confirmada (hoje em diante) */
  scheduledOnly?: boolean;
};

export type MapStats = {
  inProgress: number;
  awaitingAuthorization: number;
  scheduled: number;
  overdue: number;
  completed: number;
};

export type Surgery = SurgeryListItem & {
  patient_id: string;
  hospital_id: string;
  insurance_provider_id: string | null;
  insurance_provider: { id: string; name: string } | null;
  indication_date: string;
  confirmed_time: string | null;
  admin_notes: string | null;
  cancelled_reason: string | null;
  created_at: string;
};

export type SurgeryRequirement = {
  id: string;
  surgery_id: string;
  requirement_key: "authorization" | "materials" | "or_reservation" | "preoperative";
  is_mandatory: boolean;
  is_satisfied: boolean;
  waived: boolean;
  waived_reason: string | null;
  updated_at: string;
};

export type StageHistoryEntry = {
  id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  changed_by: string | null;
  reason: string | null;
  changed_at: string;
  from_stage: { name: string } | null;
  to_stage: { name: string } | null;
};

/** Linha normalizada do histórico combinado (etapas + autorização). */
export type SurgeryHistoryEntry = {
  id: string;
  kind: "stage" | "authorization";
  description: string;
  previousStatus: string | null;
  newStatus: string | null;
  changedAt: string;
  changedByName: string | null;
};

const AUTHORIZATION_STATUS_LABEL: Record<string, string> = {
  not_requested: "Não solicitada",
  sent: "Enviada",
  in_review: "Em análise",
  pending_docs: "Pendente de documentos",
  approved: "Aprovada",
  partially_approved: "Parcialmente aprovada",
  denied: "Negada",
  expired: "Expirada",
  cancelled: "Cancelada",
};

const LIST_COLUMNS =
  "id,code,stage_id,board_position,attendance_type,priority,indication_date,expected_date,confirmed_date,status," +
  "patient:patients(id,full_name),hospital:hospitals(id,name)," +
  "surgery_procedures(id,is_primary,procedure:procedures(id,name))," +
  "insurance_provider:insurance_providers(id,name)," +
  "requirements:surgery_requirements(id,requirement_key,is_satisfied,waived)";

const DETAIL_COLUMNS =
  LIST_COLUMNS +
  ",patient_id,hospital_id,insurance_provider_id," +
  "confirmed_time,admin_notes,cancelled_reason,created_at";

/**
 * Etapas ativas do fluxo, na ordem do Kanban. Etapas antigas descontinuadas
 * (ex: "Solicitação hospitalar", "Materiais/OPME") continuam na tabela só
 * pra manter o histórico de cirurgias antigas legível, mas não entram
 * aqui — por isso o filtro `is_active`.
 */
export async function listWorkflowStages(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("workflow_stages")
    .select("id,code,name,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as WorkflowStage[];
}

/**
 * Lista usada pelo Mapa Cirúrgico (Kanban + Lista), com os filtros da
 * barra de busca. Sem filtro de status, traz todas as cirurgias (ativas,
 * reagendadas, canceladas e realizadas) — quem decide o que mostrar nas
 * colunas do Kanban (só ativas) é quem consome o resultado.
 */
export async function listSurgeriesForMap(
  supabase: SupabaseClient,
  filters: SurgeryMapFilters = {}
) {
  // board_position é a ordem manual dentro da coluna do Kanban (arrastar
  // e soltar pra reordenar) — prioridade/data continuam disponíveis como
  // colunas ordenáveis na visão em Lista, mas não decidem mais a ordem
  // "de fábrica" dos cards no board.
  let query = supabase
    .from("surgeries")
    .select(LIST_COLUMNS)
    .order("board_position", { ascending: true });

  if (filters.q?.trim()) {
    // Busca tanto pelo código da cirurgia quanto pelo nome do paciente —
    // como são tabelas diferentes, resolve os ids que batem em cada uma e
    // depois filtra pela união (mesmo padrão usado pros filtros de
    // procedimento/requisito pendente, que também são tabelas ligadas).
    const term = filters.q.trim();
    const [{ data: codeMatches, error: codeError }, { data: patientMatches, error: patientError }] =
      await Promise.all([
        supabase.from("surgeries").select("id").ilike("code", `%${term}%`),
        supabase.from("patients").select("id").ilike("full_name", `%${term}%`),
      ]);
    if (codeError) throw codeError;
    if (patientError) throw patientError;

    const patientIds = (patientMatches ?? []).map((p) => p.id);
    let idsViaPatient: string[] = [];
    if (patientIds.length > 0) {
      const { data: viaPatient, error: viaPatientError } = await supabase
        .from("surgeries")
        .select("id")
        .in("patient_id", patientIds);
      if (viaPatientError) throw viaPatientError;
      idsViaPatient = (viaPatient ?? []).map((s) => s.id);
    }

    const ids = Array.from(new Set([...(codeMatches ?? []).map((s) => s.id), ...idsViaPatient]));
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }
  if (filters.procedureId) {
    // Filtra por cirurgias que tenham esse procedimento (principal ou
    // adicional) — resolve os ids antes, já que o filtro é numa tabela
    // ligada (surgery_procedures), não numa coluna direta de surgeries.
    const { data: links, error: linksError } = await supabase
      .from("surgery_procedures")
      .select("surgery_id")
      .eq("procedure_id", filters.procedureId);
    if (linksError) throw linksError;
    const ids = (links ?? []).map((l) => l.surgery_id);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }
  if (filters.hospitalId) query = query.eq("hospital_id", filters.hospitalId);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("expected_date", filters.from);
  if (filters.to) query = query.lte("expected_date", filters.to);
  if (filters.attendance === "particular") {
    query = query.eq("attendance_type", "particular");
  } else if (filters.attendance) {
    query = query.eq("insurance_provider_id", filters.attendance);
  }
  if (filters.overdueOnly) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.eq("status", "active").lt("expected_date", today).is("confirmed_date", null);
  }
  if (filters.scheduledOnly) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.not("confirmed_date", "is", null).gte("confirmed_date", today);
  }
  if (filters.pendingRequirement) {
    // Mesma ideia do filtro de procedimento: resolve antes os ids de
    // cirurgia que têm esse requisito pendente (surgery_requirements é
    // tabela ligada, não coluna direta de surgeries).
    const { data: links, error: linksError } = await supabase
      .from("surgery_requirements")
      .select("surgery_id")
      .eq("requirement_key", filters.pendingRequirement)
      .eq("is_satisfied", false)
      .eq("waived", false);
    if (linksError) throw linksError;
    const ids = (links ?? []).map((l) => l.surgery_id);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as (SurgeryListItem & { surgery_procedures: SurgeryProcedureLink[] })[]).map(
    withDerivedProcedures
  ) as unknown as SurgeryListItem[];
}

export type ScheduleFilters = {
  from: string;
  to: string;
  hospitalId?: string;
};

export type ScheduleSurgeryItem = SurgeryListItem & { confirmed_time: string | null; created_at: string };

const SCHEDULE_COLUMNS = LIST_COLUMNS + ",confirmed_time,created_at";

/**
 * Lista usada pela Agenda (/schedule). A "data da cirurgia" pro
 * calendário é a mesma regra usada na lista do Mapa Cirúrgico —
 * confirmed_date quando tem, senão expected_date — então o filtro de
 * período precisa olhar pra esse valor efetivo, não só uma coluna: traz
 * cirurgias com confirmed_date no intervalo OU (sem confirmed_date e)
 * expected_date no intervalo.
 *
 * Traz também as canceladas (ao contrário da versão anterior) — quem
 * decide se mostra ou não é o filtro de status na tela, já que o
 * indicador "Atrasadas" etc precisa contar sobre o conjunto completo do
 * período, e às vezes faz sentido auditar canceladas no período.
 */
export async function listSurgeriesForSchedule(
  supabase: SupabaseClient,
  filters: ScheduleFilters
): Promise<ScheduleSurgeryItem[]> {
  let query = supabase
    .from("surgeries")
    .select(SCHEDULE_COLUMNS)
    .or(
      `and(confirmed_date.gte.${filters.from},confirmed_date.lte.${filters.to}),` +
        `and(confirmed_date.is.null,expected_date.gte.${filters.from},expected_date.lte.${filters.to})`
    );

  if (filters.hospitalId) query = query.eq("hospital_id", filters.hospitalId);

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as (ScheduleSurgeryItem & { surgery_procedures: SurgeryProcedureLink[] })[]).map(
    withDerivedProcedures
  ) as unknown as ScheduleSurgeryItem[];
}

/**
 * Cirurgias sem nenhuma data (nem prevista, nem confirmada) — não cabem
 * no calendário mensal (não têm onde entrar), mas precisam aparecer no
 * indicador "Aguardando definição" e na visão em lista. Exclui
 * realizada/cancelada (já têm desfecho, não estão "aguardando" nada).
 */
export async function listSurgeriesWithoutDate(
  supabase: SupabaseClient,
  filters: { hospitalId?: string } = {}
): Promise<ScheduleSurgeryItem[]> {
  let query = supabase
    .from("surgeries")
    .select(SCHEDULE_COLUMNS)
    .is("confirmed_date", null)
    .is("expected_date", null)
    .not("status", "in", "(completed,cancelled)");

  if (filters.hospitalId) query = query.eq("hospital_id", filters.hospitalId);

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as (ScheduleSurgeryItem & { surgery_procedures: SurgeryProcedureLink[] })[]).map(
    withDerivedProcedures
  ) as unknown as ScheduleSurgeryItem[];
}

export type SurgeriesReportFilters = {
  from: string;
  to: string;
  hospitalId?: string;
  status?: string;
};

/**
 * Lista usada pelo relatório de cirurgias (/reports). Mesma regra de
 * "data efetiva" da Agenda (confirmed_date, senão expected_date) pro
 * filtro de período, mas sem forçar nenhum status específico — quem
 * decide o que aparece é o filtro de status escolhido na tela (ou nenhum,
 * trazendo todos).
 */
export async function listSurgeriesForReport(
  supabase: SupabaseClient,
  filters: SurgeriesReportFilters
): Promise<ScheduleSurgeryItem[]> {
  let query = supabase
    .from("surgeries")
    .select(SCHEDULE_COLUMNS)
    .or(
      `and(confirmed_date.gte.${filters.from},confirmed_date.lte.${filters.to}),` +
        `and(confirmed_date.is.null,expected_date.gte.${filters.from},expected_date.lte.${filters.to})`
    );

  if (filters.hospitalId) query = query.eq("hospital_id", filters.hospitalId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as (ScheduleSurgeryItem & { surgery_procedures: SurgeryProcedureLink[] })[]).map(
    withDerivedProcedures
  ) as unknown as ScheduleSurgeryItem[];
}

/**
 * Números dos cards do topo do Mapa Cirúrgico. Calculados separadamente
 * dos filtros da barra de busca (são a visão geral, não dependem do que
 * está filtrado na tela).
 */
export async function getMapStats(supabase: SupabaseClient): Promise<MapStats> {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: activeRows, error: activeError }, { count: completed, error: completedError }] =
    await Promise.all([
      supabase.from("surgeries").select("id,expected_date,confirmed_date").eq("status", "active"),
      supabase
        .from("surgeries")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
    ]);
  if (activeError) throw activeError;
  if (completedError) throw completedError;

  const active = activeRows ?? [];
  const scheduled = active.filter((s) => s.confirmed_date && s.confirmed_date >= today).length;
  const overdue = active.filter(
    (s) => s.expected_date && s.expected_date < today && !s.confirmed_date
  ).length;

  let awaitingAuthorization = 0;
  const activeIds = active.map((s) => s.id);
  if (activeIds.length > 0) {
    const { data: reqRows, error: reqError } = await supabase
      .from("surgery_requirements")
      .select("requirement_key,surgery_id")
      .in("surgery_id", activeIds)
      .eq("requirement_key", "authorization")
      .eq("is_satisfied", false)
      .eq("waived", false);
    if (reqError) throw reqError;
    awaitingAuthorization = (reqRows ?? []).length;
  }

  return {
    inProgress: active.length,
    awaitingAuthorization,
    scheduled,
    overdue,
    completed: completed ?? 0,
  };
}

/** Próximas cirurgias ativas (confirmada ou prevista, a partir de hoje)
 * — usado no dashboard geral. Reaproveita a mesma janela OR de
 * confirmed_date/expected_date da Agenda, só limitada aos próximos N
 * dias, e corta pro `limit` pedido depois de ordenar pela data efetiva. */
export async function listUpcomingSurgeries(
  supabase: SupabaseClient,
  limit: number,
  windowDays = 60
): Promise<ScheduleSurgeryItem[]> {
  const today = new Date();
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + windowDays);
  const todayISO = today.toISOString().slice(0, 10);
  const windowEndISO = windowEnd.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("surgeries")
    .select(SCHEDULE_COLUMNS)
    .eq("status", "active")
    .or(
      `and(confirmed_date.gte.${todayISO},confirmed_date.lte.${windowEndISO}),` +
        `and(confirmed_date.is.null,expected_date.gte.${todayISO},expected_date.lte.${windowEndISO})`
    );
  if (error) throw error;

  const items = (data as unknown as (ScheduleSurgeryItem & { surgery_procedures: SurgeryProcedureLink[] })[]).map(
    withDerivedProcedures
  ) as unknown as ScheduleSurgeryItem[];

  return items
    .sort((a, b) => {
      const dateA = a.confirmed_date ?? a.expected_date ?? "";
      const dateB = b.confirmed_date ?? b.expected_date ?? "";
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.confirmed_time ?? "").localeCompare(b.confirmed_time ?? "");
    })
    .slice(0, limit);
}

/** Cirurgias realizadas por mês, últimos `months` meses (incluindo o
 * atual) — usado no gráfico do dashboard geral. Agrupa por confirmed_date
 * (não existe um "completed_at" separado no schema). */
export async function getCompletedSurgeriesByMonth(
  supabase: SupabaseClient,
  months: number
): Promise<{ month: string; label: string; count: number }[]> {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
  const startISO = toLocalISODate(start);

  const { data, error } = await supabase
    .from("surgeries")
    .select("confirmed_date")
    .eq("status", "completed")
    .gte("confirmed_date", startISO);
  if (error) throw error;

  const MONTH_LABELS = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  const buckets: { month: string; label: string; count: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    buckets.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: MONTH_LABELS[d.getMonth()], count: 0 });
  }
  const indexByMonth = new Map(buckets.map((b, idx) => [b.month, idx]));

  for (const row of data ?? []) {
    if (!row.confirmed_date) continue;
    const monthKey = row.confirmed_date.slice(0, 7);
    const idx = indexByMonth.get(monthKey);
    if (idx !== undefined) buckets[idx].count += 1;
  }

  return buckets;
}

function toLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Histórico de cirurgias de um paciente — usado no cadastro do paciente
 * (/surgeries/patients/[id]). Traz todas, incluindo canceladas: é
 * histórico, não a visão de "cirurgias em andamento". Mais recente
 * primeiro (por criação, já que nem toda cirurgia tem confirmed_date). */
export async function listSurgeriesByPatient(
  supabase: SupabaseClient,
  patientId: string
): Promise<ScheduleSurgeryItem[]> {
  const { data, error } = await supabase
    .from("surgeries")
    .select(SCHEDULE_COLUMNS)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as (ScheduleSurgeryItem & { surgery_procedures: SurgeryProcedureLink[] })[]).map(
    withDerivedProcedures
  ) as unknown as ScheduleSurgeryItem[];
}

/**
 * Quantidade de cirurgias (qualquer status) por paciente — usado na
 * listagem de Pacientes, no lugar da data de nascimento.
 */
export async function countSurgeriesByPatient(supabase: SupabaseClient): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("surgeries").select("patient_id").not("patient_id", "is", null);
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!row.patient_id) continue;
    counts[row.patient_id] = (counts[row.patient_id] ?? 0) + 1;
  }
  return counts;
}

export type SurgerySelectOption = {
  id: string;
  code: string;
  patient: { full_name: string } | null;
};

export async function listSurgeriesForSelect(supabase: SupabaseClient): Promise<SurgerySelectOption[]> {
  const { data, error } = await supabase
    .from("surgeries")
    .select("id,code,patient:patients(full_name)")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as SurgerySelectOption[];
}

export async function listSurgeries(supabase: SupabaseClient, search?: string) {
  let query = supabase
    .from("surgeries")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("code", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as (SurgeryListItem & { surgery_procedures: SurgeryProcedureLink[] })[]).map(
    withDerivedProcedures
  ) as unknown as SurgeryListItem[];
}

export async function getSurgery(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("surgeries")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return withDerivedProcedures(
    data as unknown as Surgery & { surgery_procedures: SurgeryProcedureLink[] }
  ) as unknown as Surgery;
}

export type SurgeryAuthorizationRequestData = {
  code: string;
  patient_name: string;
  patient_insurance_card_number: string | null;
  hospital_name: string | null;
  insurance_provider_name: string | null;
  attendance_type: "particular" | "convenio";
  priority: SurgeryListItem["priority"];
  procedures: { name: string; tuss_code: string | null; is_primary: boolean }[];
};

/**
 * Dados pra montar o texto de solicitação de autorização à central do
 * convênio/hospital (botão "Copiar solicitação" no painel rápido do
 * Kanban) — uma seleção enxuta e específica pra isso, incluindo campos
 * (carteirinha, código TUSS) que a listagem/Kanban normal não carrega.
 */
export async function getSurgeryAuthorizationRequestData(
  supabase: SupabaseClient,
  surgeryId: string
): Promise<SurgeryAuthorizationRequestData> {
  const { data, error } = await supabase
    .from("surgeries")
    .select(
      "code,attendance_type,priority," +
        "patient:patients(full_name,insurance_card_number)," +
        "hospital:hospitals(name)," +
        "insurance_provider:insurance_providers(name)," +
        "surgery_procedures(is_primary,procedure:procedures(name,tuss_code))"
    )
    .eq("id", surgeryId)
    .single();
  if (error) throw error;

  const row = data as unknown as {
    code: string;
    attendance_type: "particular" | "convenio";
    priority: SurgeryListItem["priority"];
    patient: { full_name: string; insurance_card_number: string | null } | null;
    hospital: { name: string } | null;
    insurance_provider: { name: string } | null;
    surgery_procedures: {
      is_primary: boolean;
      procedure: { name: string; tuss_code: string | null } | null;
    }[];
  };

  const procedures = (row.surgery_procedures ?? [])
    .filter((link) => link.procedure)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
    .map((link) => ({
      name: link.procedure!.name,
      tuss_code: link.procedure!.tuss_code,
      is_primary: link.is_primary,
    }));

  return {
    code: row.code,
    patient_name: row.patient?.full_name ?? "—",
    patient_insurance_card_number: row.patient?.insurance_card_number ?? null,
    hospital_name: row.hospital?.name ?? null,
    insurance_provider_name: row.insurance_provider?.name ?? null,
    attendance_type: row.attendance_type,
    priority: row.priority,
    procedures,
  };
}

/**
 * Substitui a lista de procedimentos de uma cirurgia (apaga e recria) —
 * mais simples e seguro que calcular diffs, já que o volume por cirurgia é
 * sempre pequeno (poucas unidades).
 */
export async function setSurgeryProcedures(
  supabase: SupabaseClient,
  surgeryId: string,
  procedureIds: string[],
  primaryProcedureId: string
) {
  const { error: deleteError } = await supabase
    .from("surgery_procedures")
    .delete()
    .eq("surgery_id", surgeryId);
  if (deleteError) throw deleteError;

  const rows = procedureIds.map((procedureId) => ({
    surgery_id: surgeryId,
    procedure_id: procedureId,
    is_primary: procedureId === primaryProcedureId,
  }));
  const { error: insertError } = await supabase.from("surgery_procedures").insert(rows);
  if (insertError) throw insertError;

  // Carrega o kit padrão de materiais automaticamente — mas só quando a
  // lista ainda está vazia, pra nunca sobrescrever itens que o usuário já
  // tenha ajustado manualmente (ex: reabrir e resalvar a edição sem mexer
  // nos procedimentos não deve reimportar nada).
  if (procedureIds.length > 0) {
    const { count, error: countError } = await supabase
      .from("surgery_material_items")
      .select("id", { count: "exact", head: true })
      .eq("surgery_id", surgeryId)
      .neq("status", "removed");
    if (countError) throw countError;
    if (!count) {
      await importProcedureDefaultMaterials(supabase, surgeryId, procedureIds);
    }
  }
}

// Mesmo padrão de lib/data/patients.ts: `insurance_provider_id` aceita
// `null` explícito, usado para limpar o dado quando a cirurgia passa a ser
// particular (campo ausente no FormData só deixaria a coluna intocada).
export type SurgeryUpdateInput = Omit<SurgeryInput, "insurance_provider_id"> & {
  insurance_provider_id?: string | null;
};

export async function createSurgery(supabase: SupabaseClient, input: SurgeryUpdateInput) {
  const { data: firstStage, error: stageError } = await supabase
    .from("workflow_stages")
    .select("id")
    .eq("code", "new_indication")
    .single();
  if (stageError) throw stageError;

  const { data, error } = await supabase
    .from("surgeries")
    // Nasce no fim da coluna (maior board_position) — Date.now() cresce
    // monotonicamente, então sempre fica depois do que já existe.
    .insert({ ...input, stage_id: firstStage.id, board_position: Date.now() })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function updateSurgery(
  supabase: SupabaseClient,
  id: string,
  input: SurgeryUpdateInput
) {
  const { error } = await supabase.from("surgeries").update(input).eq("id", id);
  if (error) throw error;
}

/**
 * Move um card pro fim de uma etapa (sem controle fino de posição) —
 * usada pelo botão "Avançar para a próxima etapa" do painel de detalhe.
 * Pra reordenar dentro da mesma coluna ou soltar entre dois cards
 * específicos (drag-and-drop do board), ver moveSurgeryCard.
 */
export async function moveSurgeryStage(
  supabase: SupabaseClient,
  id: string,
  stageId: string
) {
  const { error } = await supabase
    .from("surgeries")
    .update({ stage_id: stageId, board_position: Date.now() })
    .eq("id", id);
  if (error) throw error;
}

/** Move/reordena um card do Kanban pra uma posição específica (entre dois
 * outros cards, ou no início/fim da coluna) — usada pelo
 * drag-and-drop do board, que já calcula board_position como o ponto
 * médio entre os vizinhos de destino. */
export async function moveSurgeryCard(
  supabase: SupabaseClient,
  id: string,
  stageId: string,
  boardPosition: number
) {
  const { error } = await supabase
    .from("surgeries")
    .update({ stage_id: stageId, board_position: boardPosition })
    .eq("id", id);
  if (error) throw error;
}

/** Confirma ou remarca a data/horário da cirurgia — usado pelos botões
 * rápidos "Confirmar cirurgia" e "Remarcar" do painel da Agenda. Não mexe
 * em mais nada (etapa, requisitos etc.), só na data/horário confirmados. */
export async function setSurgerySchedule(
  supabase: SupabaseClient,
  id: string,
  input: { confirmedDate: string; confirmedTime: string | null }
) {
  const { error } = await supabase
    .from("surgeries")
    .update({ confirmed_date: input.confirmedDate, confirmed_time: input.confirmedTime })
    .eq("id", id);
  if (error) throw error;
}

export async function cancelSurgery(supabase: SupabaseClient, id: string, reason: string) {
  const { error } = await supabase
    .from("surgeries")
    .update({ status: "cancelled", cancelled_reason: reason })
    .eq("id", id);
  if (error) throw error;
}

export async function listStageHistory(supabase: SupabaseClient, surgeryId: string) {
  const { data, error } = await supabase
    .from("surgery_stage_history")
    .select(
      "id,from_stage_id,to_stage_id,changed_by,reason,changed_at,from_stage:workflow_stages!from_stage_id(name),to_stage:workflow_stages!to_stage_id(name)"
    )
    .eq("surgery_id", surgeryId)
    .order("changed_at", { ascending: true });
  if (error) throw error;
  return data as unknown as StageHistoryEntry[];
}

/**
 * Histórico combinado da cirurgia (mudanças de etapa + mudanças de status
 * de autorização), com o nome do responsável resolvido via `profiles`
 * quando disponível. Reaproveita as estruturas de auditoria que já existem
 * no banco (surgery_stage_history, authorization_history) — nenhuma tabela
 * nova foi criada para isso.
 */
export async function getSurgeryHistoryTimeline(
  supabase: SupabaseClient,
  surgeryId: string
): Promise<SurgeryHistoryEntry[]> {
  const [stageHistory, authHistory] = await Promise.all([
    listStageHistory(supabase, surgeryId),
    listAuthorizationHistoryForSurgery(supabase, surgeryId),
  ]);

  const userIds = Array.from(
    new Set(
      [...stageHistory.map((e) => e.changed_by), ...authHistory.map((e) => e.changed_by)].filter(
        (id): id is string => Boolean(id)
      )
    )
  );

  let namesById: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", userIds);
    if (error) throw error;
    namesById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name as string]));
  }

  const stageEntries: SurgeryHistoryEntry[] = stageHistory.map((entry) => ({
    id: `stage-${entry.id}`,
    kind: "stage",
    description: entry.from_stage
      ? `Etapa alterada: ${entry.from_stage.name} → ${entry.to_stage?.name ?? "—"}`
      : `Cirurgia criada na etapa ${entry.to_stage?.name ?? "—"}`,
    previousStatus: entry.from_stage?.name ?? null,
    newStatus: entry.to_stage?.name ?? null,
    changedAt: entry.changed_at,
    changedByName: entry.changed_by ? namesById[entry.changed_by] ?? null : null,
  }));

  const authEntries: SurgeryHistoryEntry[] = authHistory.map((entry, index, all) => {
    const previous = [...all]
      .slice(0, index)
      .reverse()
      .find((e) => e.authorization_id === entry.authorization_id);
    return {
      id: `auth-${entry.id}`,
      kind: "authorization",
      description: "Status da autorização atualizado",
      previousStatus: previous ? AUTHORIZATION_STATUS_LABEL[previous.status] ?? previous.status : null,
      newStatus: AUTHORIZATION_STATUS_LABEL[entry.status] ?? entry.status,
      changedAt: entry.changed_at,
      changedByName: entry.changed_by ? namesById[entry.changed_by] ?? null : null,
    };
  });

  return [...stageEntries, ...authEntries].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
  );
}

export async function listRequirements(supabase: SupabaseClient, surgeryId: string) {
  const { data, error } = await supabase
    .from("surgery_requirements")
    .select("id,surgery_id,requirement_key,is_mandatory,is_satisfied,waived,waived_reason,updated_at")
    .eq("surgery_id", surgeryId)
    .order("requirement_key", { ascending: true });
  if (error) throw error;
  return data as SurgeryRequirement[];
}

export async function updateRequirement(
  supabase: SupabaseClient,
  id: string,
  input: { is_satisfied: boolean; waived: boolean; waived_reason?: string }
) {
  const { error } = await supabase
    .from("surgery_requirements")
    .update({
      is_satisfied: input.is_satisfied,
      waived: input.waived,
      waived_reason: input.waived_reason ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}

/** Alterna só o "satisfeito" de um requisito, sem mexer em waived/
 * waived_reason — usado pelo checklist rápido do painel lateral do Mapa
 * Cirúrgico (diferente do formulário completo da página da cirurgia, que
 * também lida com dispensa e justificativa). */
export async function setRequirementSatisfied(
  supabase: SupabaseClient,
  id: string,
  isSatisfied: boolean
) {
  const { error } = await supabase
    .from("surgery_requirements")
    .update({ is_satisfied: isSatisfied })
    .eq("id", id);
  if (error) throw error;
}

export type ParticularFinancialRecord = {
  id: string;
  surgery_id: string;
  expected_value: number | null;
  agreed_value: number | null;
  notes: string | null;
};

export async function getFinancialRecord(supabase: SupabaseClient, surgeryId: string) {
  const { data, error } = await supabase
    .from("financial_records")
    .select("id,surgery_id,expected_value,agreed_value,notes")
    .eq("surgery_id", surgeryId)
    .maybeSingle();
  if (error) throw error;
  return data as ParticularFinancialRecord | null;
}

export async function upsertParticularFinancialRecord(
  supabase: SupabaseClient,
  surgeryId: string,
  input: { expected_value?: number; agreed_value?: number; notes?: string }
) {
  const existing = await getFinancialRecord(supabase, surgeryId);
  if (existing) {
    const { error } = await supabase
      .from("financial_records")
      .update({
        expected_value: input.expected_value ?? null,
        agreed_value: input.agreed_value ?? null,
        notes: input.notes ?? null,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("financial_records").insert({
      surgery_id: surgeryId,
      attendance_type: "particular",
      expected_value: input.expected_value ?? null,
      agreed_value: input.agreed_value ?? null,
      notes: input.notes ?? null,
    });
    if (error) throw error;
  }
}
