"use server";

import { requireActionPermission } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { listSurgeriesForReport, listWorkflowStages } from "@/lib/data/surgeries";
import type { ScheduleInputRow } from "@/lib/whatsapp/surgery-schedule";
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
  preset: 7 | 15 | 30 | "custom";
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
  let to = addDays(today, input.preset === "custom" ? 0 : input.preset);
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
    const [surgeries, stages] = await Promise.all([
      listSurgeriesForReport(supabase, { from, to }),
      listWorkflowStages(supabase),
    ]);
    const stageCode = new Map(stages.map((s) => [s.id, s.code]));
    const rows: ScheduleInputRow[] = surgeries
      .map((s): ScheduleInputRow | null => {
        const date = s.confirmed_date ?? s.expected_date;
        if (!date) return null;
        return {
          id: s.id,
          patientName: s.patient?.full_name ?? null,
          procedureName: s.primary_procedure?.name ?? null,
          hospitalName: s.hospital?.name ?? null,
          attendanceType: s.attendance_type ?? null,
          insuranceName: s.insurance_provider?.name ?? null,
          status: s.status,
          stageCode: stageCode.get(s.stage_id) ?? null,
          date,
          confirmed: Boolean(s.confirmed_date),
        };
      })
      .filter((r): r is ScheduleInputRow => r !== null && r.date >= from && r.date <= to);
    return { data: { from, to, rows, loadedAt: new Date().toISOString() } };
  } catch (e) {
    console.error("[whatsapp] falha ao carregar programação:", e);
    return { error: "Não foi possível carregar as cirurgias." };
  }
}
