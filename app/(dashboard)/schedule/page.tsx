import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import {
  listSurgeriesForSchedule,
  listSurgeriesWithoutDate,
  type ScheduleSurgeryItem,
} from "@/lib/data/surgeries";
import { listHolidays, type Holiday } from "@/lib/data/holidays";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { deriveScheduleStatus, type ScheduleStatus } from "@/lib/schedule-status";
import { Button } from "@/components/ui/button";
import { ScheduleHospitalFilter } from "@/components/schedule/schedule-hospital-filter";
import { ScheduleStatusFilter } from "@/components/schedule/schedule-status-filter";
import { ScheduleViewToggle } from "@/components/schedule/schedule-view-toggle";
import { ScheduleIndicatorCards } from "@/components/schedule/schedule-indicator-cards";
import { ScheduleCalendar, type ScheduleDay } from "@/components/schedule/schedule-calendar";
import { ScheduleListView } from "@/components/schedule/schedule-list-view";

type SearchParams = {
  year?: string;
  month?: string;
  hospital?: string;
  status?: string;
  view?: string;
};

const WEEKDAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Segunda-feira da semana que contém `d` — mesma convenção (semana
 * começa na segunda) usada no atalho "Esta semana" do Mapa Cirúrgico. */
function mondayOf(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

const VALID_STATUS: ScheduleStatus[] = ["prevista", "confirmada", "atrasada", "realizada", "cancelada", "sem_data"];

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireModuleView("schedule");
  const params = await searchParams;
  const today = new Date();
  const year = params.year ? Number(params.year) : today.getFullYear();
  const month = params.month ? Number(params.month) : today.getMonth() + 1; // 1-12
  const statusFilter = VALID_STATUS.includes(params.status as ScheduleStatus)
    ? (params.status as ScheduleStatus)
    : null;
  const view = statusFilter === "sem_data" || params.view === "list" ? "list" : "month";

  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);
  const firstOfMonthISO = toISODate(firstOfMonth);
  const lastOfMonthISO = toISODate(lastOfMonth);
  const gridStart = mondayOf(firstOfMonth);
  const gridEnd = mondayOf(lastOfMonth);
  gridEnd.setDate(gridEnd.getDate() + 6); // domingo da semana do último dia
  const gridStartISO = toISODate(gridStart);
  const gridEndISO = toISODate(gridEnd);

  const supabase = await createClient();
  const [surgeriesInRange, surgeriesWithoutDate, holidays, hospitals] = await Promise.all([
    listSurgeriesForSchedule(supabase, { from: gridStartISO, to: gridEndISO, hospitalId: params.hospital }),
    listSurgeriesWithoutDate(supabase, { hospitalId: params.hospital }),
    listHolidays(supabase, { from: gridStartISO, to: gridEndISO }),
    listActiveHospitalsForSelect(supabase),
  ]);

  // Indicadores do topo: previstas/confirmadas/atrasadas contam só o que
  // está dentro do mês exibido (não os dias de preenchimento do mês
  // vizinho); "sem data" é sempre global, porque não pertence a mês
  // nenhum.
  const monthItems = surgeriesInRange.filter((s) => {
    const date = s.confirmed_date ?? s.expected_date;
    return date && date >= firstOfMonthISO && date <= lastOfMonthISO;
  });
  const counts = {
    prevista: monthItems.filter((s) => deriveScheduleStatus(s) === "prevista").length,
    confirmada: monthItems.filter((s) => deriveScheduleStatus(s) === "confirmada").length,
    atrasada: monthItems.filter((s) => deriveScheduleStatus(s) === "atrasada").length,
    semData: surgeriesWithoutDate.length,
  };

  // Por padrão (sem filtro de status), cancelada some do calendário/lista
  // — ela só aparece quando alguém escolhe "Cancelada" explicitamente.
  const visibleSurgeries =
    statusFilter === "sem_data"
      ? surgeriesWithoutDate
      : surgeriesInRange.filter((s) => {
          const scheduleStatus = deriveScheduleStatus(s);
          if (statusFilter) return scheduleStatus === statusFilter;
          return scheduleStatus !== "cancelada";
        });

  const holidaysByDate = new Map<string, Holiday[]>();
  for (const holiday of holidays) {
    const list = holidaysByDate.get(holiday.date) ?? [];
    list.push(holiday);
    holidaysByDate.set(holiday.date, list);
  }

  const byDate = new Map<string, ScheduleSurgeryItem[]>();
  if (statusFilter !== "sem_data") {
    for (const surgery of visibleSurgeries) {
      const date = surgery.confirmed_date ?? surgery.expected_date;
      if (!date) continue;
      const list = byDate.get(date) ?? [];
      list.push(surgery);
      byDate.set(date, list);
    }
  }

  const todayISO = toISODate(today);
  const days: ScheduleDay[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const iso = toISODate(cursor);
    days.push({
      date: iso,
      day: cursor.getDate(),
      inMonth: cursor.getMonth() === month - 1,
      isToday: iso === todayISO,
      surgeries: (byDate.get(iso) ?? []).sort((a, b) => (a.confirmed_time ?? "").localeCompare(b.confirmed_time ?? "")),
      holidays: holidaysByDate.get(iso) ?? [],
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  function buildHref(overrides: Record<string, string | null>) {
    const sp = new URLSearchParams();
    sp.set("year", String(year));
    sp.set("month", String(month));
    if (params.hospital) sp.set("hospital", params.hospital);
    if (params.status) sp.set("status", params.status);
    if (params.view) sp.set("view", params.view);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) sp.delete(key);
      else sp.set(key, value);
    }
    return `/schedule?${sp.toString()}`;
  }

  function monthHref(deltaMonths: number) {
    const base = new Date(year, month - 1 + deltaMonths, 1);
    return buildHref({ year: String(base.getFullYear()), month: String(base.getMonth() + 1) });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-foreground">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cirurgias confirmadas (ou previstas, quando ainda sem data confirmada) por mês.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ScheduleStatusFilter />
          <ScheduleHospitalFilter hospitals={hospitals} />
          <ScheduleViewToggle />
        </div>
      </div>

      <div className="mt-4">
        <ScheduleIndicatorCards counts={counts} activeStatus={statusFilter} buildHref={buildHref} />
      </div>

      {view === "month" ? (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Link href={monthHref(-1)}>
                <Button type="button" variant="outline" size="sm">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href={monthHref(1)}>
                <Button type="button" variant="outline" size="sm">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href={buildHref({ year: String(today.getFullYear()), month: String(today.getMonth() + 1) })}>
                <Button type="button" variant="ghost" size="sm">
                  Hoje
                </Button>
              </Link>
            </div>
            <p className="text-sm font-medium text-foreground">
              {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>

          <ScheduleCalendar weekdayNames={WEEKDAY_NAMES} days={days} />
        </>
      ) : (
        <ScheduleListView surgeries={visibleSurgeries} withoutDate={statusFilter === "sem_data"} />
      )}
    </div>
  );
}
