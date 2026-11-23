/**
 * Programação cirúrgica consolidada para WhatsApp.
 *
 * Função pura: recebe as cirurgias já carregadas (e filtradas pelo período)
 * e devolve o texto, os totais e os grupos — a mesma estrutura alimenta a
 * pré-visualização e a mensagem copiada/aberta no WhatsApp, então nunca
 * divergem. Nada é gravado e nenhum status é alterado.
 */

export type ScheduleStatusKey = "confirmed" | "predicted" | "authorization" | "pending" | "cancelled";

export const STATUS_META: Record<ScheduleStatusKey, { emoji: string; label: string; plural: string }> = {
  confirmed: { emoji: "🟢", label: "Confirmada", plural: "Confirmadas" },
  predicted: { emoji: "🟡", label: "Prevista", plural: "Previstas" },
  authorization: { emoji: "🔵", label: "Em autorização", plural: "Em autorização" },
  pending: { emoji: "🟠", label: "Pendente", plural: "Pendentes" },
  cancelled: { emoji: "🔴", label: "Cancelada", plural: "Canceladas" },
};

const STATUS_ORDER: ScheduleStatusKey[] = ["confirmed", "predicted", "authorization", "pending", "cancelled"];

export type ScheduleInputRow = {
  id: string;
  patientName: string | null;
  /** Todos os procedimentos solicitados (principal primeiro). */
  procedureNames: string[];
  hospitalName: string | null;
  attendanceType: "particular" | "convenio" | null;
  insuranceName: string | null;
  /** status da cirurgia: active | rescheduled | cancelled | completed */
  status: string;
  /** código da etapa atual no Kanban (ex.: authorization) */
  stageCode: string | null;
  /** data efetiva: confirmada, senão prevista (YYYY-MM-DD); nula = data a definir */
  date: string | null;
  confirmed: boolean;
};

/**
 * Status exibido, derivado SOMENTE de dados cadastrados:
 *  - cancelled            -> Cancelada
 *  - rescheduled          -> Pendente (aguarda nova data)
 *  - etapa Autorização    -> Em autorização
 *  - data confirmada      -> Confirmada
 *  - demais               -> Prevista
 * Cirurgias já realizadas não entram na programação.
 */
export function classifyStatus(row: Pick<ScheduleInputRow, "status" | "stageCode" | "confirmed">): ScheduleStatusKey | null {
  if (row.status === "completed") return null;
  if (row.status === "cancelled") return "cancelled";
  if (row.status === "rescheduled") return "pending";
  if (row.stageCode === "authorization") return "authorization";
  if (row.confirmed) return "confirmed";
  return "predicted";
}

export type ModalityKey = "particular" | "convenio" | "unknown";

function modalityOf(row: ScheduleInputRow): ModalityKey {
  if (row.attendanceType === "particular") return "particular";
  if (row.attendanceType === "convenio") return "convenio";
  return "unknown";
}

export function modalityText(row: ScheduleInputRow): string {
  const m = modalityOf(row);
  if (m === "particular") return "👤 Particular";
  if (m === "convenio") return row.insuranceName ? `🏥 Convênio – ${row.insuranceName}` : "🏥 Convênio";
  return "Não informado";
}

function procedureLines(names: string[]): string[] {
  if (names.length === 0) return ["*Procedimento:* Não informado"];
  if (names.length === 1) return [`*Procedimento:* ${names[0]}`];
  return ["*Procedimentos:*", ...names.map((n) => `• ${n}`)];
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const name = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}/${y}`;
}

function weekdayAndDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const wd = d.toLocaleDateString("pt-BR", { weekday: "long" }).toUpperCase();
  const [y, m, day] = iso.split("-");
  return `${wd} | ${day}/${m}/${y}`;
}

const plural = (n: number) => `${pad2(n)} ${n === 1 ? "cirurgia" : "cirurgias"}`;

export type ScheduleItem = ScheduleInputRow & { statusKey: ScheduleStatusKey };
export type ScheduleDay = { date: string; label: string; items: ScheduleItem[] };
export type ScheduleMonth = { ym: string; label: string; count: number; days: ScheduleDay[] };

export type ScheduleResult = {
  text: string;
  total: number;
  months: ScheduleMonth[];
  byMonth: { ym: string; label: string; count: number }[];
  byModality: Record<ModalityKey, number>;
  byStatus: Record<ScheduleStatusKey, number>;
};

const SEP = "━━━━━━━━━━━━━━━━━━";

export function buildSurgerySchedule(input: { doctorName: string; rows: ScheduleInputRow[] }): ScheduleResult {
  const items: ScheduleItem[] = [];
  for (const r of input.rows) {
    const statusKey = classifyStatus(r);
    if (!statusKey) continue;
    items.push({ ...r, statusKey });
  }
  items.sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || (a.patientName ?? "").localeCompare(b.patientName ?? "", "pt-BR"));

  const monthMap = new Map<string, Map<string, ScheduleItem[]>>();
  for (const it of items) {
    const ym = it.date ? it.date.slice(0, 7) : "none";
    const days = monthMap.get(ym) ?? new Map<string, ScheduleItem[]>();
    const key = it.date ?? "none";
    days.set(key, [...(days.get(key) ?? []), it]);
    monthMap.set(ym, days);
  }
  const months: ScheduleMonth[] = [...monthMap.entries()]
    .sort(([a], [b]) => (a === "none" ? "9999" : a).localeCompare(b === "none" ? "9999" : b))
    .map(([ym, days]) => {
      const dayList: ScheduleDay[] = [...days.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, list]) => ({ date, label: date === "none" ? "" : weekdayAndDate(date), items: list }));
      return { ym, label: ym === "none" ? "Data a definir" : monthLabel(ym), count: dayList.reduce((s, d) => s + d.items.length, 0), days: dayList };
    });

  const byStatus = Object.fromEntries(STATUS_ORDER.map((k) => [k, 0])) as Record<ScheduleStatusKey, number>;
  const byModality: Record<ModalityKey, number> = { particular: 0, convenio: 0, unknown: 0 };
  for (const it of items) {
    byStatus[it.statusKey]++;
    byModality[modalityOf(it)]++;
  }
  const total = items.length;
  const byMonth = months.map((m) => ({ ym: m.ym, label: m.label, count: m.count }));

  const L: string[] = [];
  L.push("*📋 PROGRAMAÇÃO CIRÚRGICA*", "", `Olá, ${input.doctorName}!`, "");
  if (total === 0) {
    L.push("Não há cirurgias programadas no período selecionado.");
  } else {
    L.push("Confira a programação das suas próximas cirurgias:", "", SEP, "");
    for (const m of months) {
      L.push(`*📅 ${m.label.toUpperCase()} — ${plural(m.count)}*`, "");
      for (const d of m.days) {
        if (d.label) L.push(`*${d.label}*`, "");
        d.items.forEach((it, i) => {
          L.push(
            `*${i + 1}. Status:* ${STATUS_META[it.statusKey].emoji} ${STATUS_META[it.statusKey].label}`,
            `*Paciente:* ${it.patientName ?? "Não informado"}`,
            ...procedureLines(it.procedureNames),
            `*Local:* ${it.hospitalName ?? "Não informado"}`,
            `*Atendimento:* ${modalityText(it)}`,
            ""
          );
        });
      }
      L.push(SEP, "");
    }
    L.push("*📊 RESUMO DA PROGRAMAÇÃO*", "", `*Total de cirurgias: ${pad2(total)}*`, "", "*Por mês:*");
    for (const m of byMonth) L.push(`• ${m.label}: ${pad2(m.count)}`);
    L.push("", "*Por modalidade:*", `• 👤 Particulares: ${pad2(byModality.particular)}`, `• 🏥 Convênios: ${pad2(byModality.convenio)}`);
    if (byModality.unknown > 0) L.push(`• Não informado: ${pad2(byModality.unknown)}`);
    L.push("", "*Por status:*");
    for (const k of STATUS_ORDER) L.push(`• ${STATUS_META[k].emoji} ${STATUS_META[k].plural}: ${pad2(byStatus[k])}`);
  }
  return { text: L.join("\n").trimEnd(), total, months, byMonth, byModality, byStatus };
}

/** Normaliza telefone brasileiro para o formato do wa.me (apenas dígitos, com 55). */
export function toWhatsappNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  return withCountry.length >= 12 && withCountry.length <= 13 ? withCountry : null;
}


/** Mensagem de UMA cirurgia (botão na tela da cirurgia), com os mesmos rótulos e emojis da programação. */
export function buildSingleSurgeryMessage(input: { doctorName: string; code: string; row: ScheduleInputRow }): string {
  const r = input.row;
  const key = classifyStatus(r);
  const status = key ? `${STATUS_META[key].emoji} ${STATUS_META[key].label}` : "🟣 Realizada";
  const when = r.date ? weekdayAndDate(r.date) : "DATA A DEFINIR";
  return [
    "*📋 CIRURGIA*",
    "",
    `Olá, ${input.doctorName}!`,
    "",
    "Segue a situação da cirurgia:",
    "",
    `*${when}*`,
    "",
    `*Status:* ${status}`,
    `*Paciente:* ${r.patientName ?? "Não informado"}`,
    ...procedureLines(r.procedureNames),
    `*Local:* ${r.hospitalName ?? "Não informado"}`,
    `*Atendimento:* ${modalityText(r)}`,
    `*Código:* ${input.code}`,
  ].join("\n");
}
