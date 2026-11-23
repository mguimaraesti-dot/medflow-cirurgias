"use server";

import { requireActionPermission } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { listSurgeriesForReport, listSurgeriesWithoutDate, listWorkflowStages } from "@/lib/data/surgeries";
import { buildSingleSurgeryMessage, type ScheduleInputRow } from "@/lib/whatsapp/surgery-schedule";
import { getSurgery } from "@/lib/data/surgeries";
import { todayInSaoPaulo } from "@/lib/utils";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

export type WhatsappScheduleData = {
  from: string;
  to: string;
  rows: ScheduleInputRow[];
  loadedAt: string;
};

/**
 * Carrega as cirurgias do período para a programação enviada pelo WhatsApp.
 * Somente leitura; reaproveita a consulta do relatório de cirurgias (data
 * efetiva = confirmada, senão prevista). O sistema só tem um médico (Dr.
 * Flávio), então não há filtro por médico — todas as cirurgias são dele.
 */
export async function loadWhatsappScheduleAction(input: {
  preset: 7 | 15 | 30 | "all" | "custom";
  from?: string;
  to?: string;
}): Promise<{ data?: WhatsappScheduleData; error?: string }> {
  try {
    await requireActionPermission("reports", "view");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }
  const today = todayInSaoPaulo();
  let from = today;
  let to = addDays(today, typeof input.preset === "number" ? input.preset : 0);
  if (input.preset === "all") {
    // Todas as cirurgias (com ou sem data, atrasadas e futuras); realizadas são removidas na montagem.
    from = "1900-01-01";
    to = "2999-12-31";
  }
  if (input.preset === "custom") {
    if (!input.from || !input.to || !ISO.test(input.from) || !ISO.test(input.to)) {
      return { error: "Informe a data inicial e a final." };
    }
    if (input.from > input.to) return { error: "A data inicial deve ser anterior à final." };
    from = input.from;
    to = input.to;
  }
  try {
    const supabase = await createClient();
    const [dated, undated, stages] = await Promise.all([
      listSurgeriesForReport(supabase, { from, to }),
      input.preset === "all" ? listSurgeriesWithoutDate(supabase) : Promise.resolve([]),
      listWorkflowStages(supabase),
    ]);
    const surgeries = [...dated, ...undated];
    const stageCode = new Map(stages.map((s) => [s.id, s.code]));
    const rows: ScheduleInputRow[] = surgeries
      .map((s): ScheduleInputRow | null => {
        const date = s.confirmed_date ?? s.expected_date ?? null;
        return {
          id: s.id,
          patientName: s.patient?.full_name ?? null,
          procedureNames: [...s.procedures]
            .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
            .map((p) => p.name),
          hospitalName: s.hospital?.name ?? null,
          attendanceType: s.attendance_type ?? null,
          insuranceName: s.insurance_provider?.name ?? null,
          status: s.status,
          stageCode: stageCode.get(s.stage_id) ?? null,
          date,
          confirmed: Boolean(s.confirmed_date),
        };
      })
      .filter((r): r is ScheduleInputRow => r !== null && (r.date === null ? input.preset === "all" : r.date >= from && r.date <= to));
    return { data: { from, to, rows, loadedAt: new Date().toISOString() } };
  } catch (e) {
    console.error("[whatsapp] falha ao carregar programação:", e);
    return { error: "Não foi possível carregar as cirurgias." };
  }
}

/** Texto do WhatsApp com os dados de uma única cirurgia (botão na tela da cirurgia). */
export async function getSurgeryWhatsappTextAction(surgeryId: string): Promise<string> {
  await requireActionPermission("surgeries", "view");
  const supabase = await createClient();
  const [surgery, stages] = await Promise.all([getSurgery(supabase, surgeryId), listWorkflowStages(supabase)]);
  const s = surgery as unknown as Awaited<ReturnType<typeof getSurgery>> & {
    procedures: { name: string; is_primary: boolean }[];
    hospital: { name: string } | null;
    insurance_provider: { name: string } | null;
    patient: { full_name: string } | null;
  };
  const row: ScheduleInputRow = {
    id: s.id,
    patientName: s.patient?.full_name ?? null,
    procedureNames: [...(s.procedures ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary)).map((p) => p.name),
    hospitalName: s.hospital?.name ?? null,
    attendanceType: s.attendance_type ?? null,
    insuranceName: s.insurance_provider?.name ?? null,
    status: s.status,
    stageCode: stages.find((st) => st.id === s.stage_id)?.code ?? null,
    date: s.confirmed_date ?? s.expected_date ?? null,
    confirmed: Boolean(s.confirmed_date),
  };
  return buildSingleSurgeryMessage({ doctorName: "Dr. Flávio Morita", code: s.code, row });
}
