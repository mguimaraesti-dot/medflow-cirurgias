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
import { deriveScheduleStatus, SCHEDULE_STATUS_COLOR, type ScheduleStatus } from "@/lib/schedule-status";
import { Button } from "@/components/ui/button";
import { ScheduleFilters } from "@/components/schedule/schedule-filters";
import { ScheduleViewToggle, type ScheduleView } from "@/components/schedule/schedule-view-toggle";
import { ScheduleIndicatorCards } from "@/components/schedule/schedule-indicator-cards";
import { ScheduleCalendar, type ScheduleDay } from "@/components/schedule/schedule-calendar";
import { ScheduleWeek } from "@/components/schedule/schedule-week";
import { ScheduleYear, type YearMonth } from "@/components/schedule/schedule-year";
import { ScheduleListView } from "@/components/schedule/schedule-list-view";

type SearchParams = {
  year?: string;
  month?: string;
  date?: string;
  hospital?: string;
  status?: string;
  view?: string;
};

const WEEKDAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const WEEKDAY_INITIALS = ["S", "T", "Q", "Q", "S", "S", "D"];
const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
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
  const todayISO = toISODate(today);
  const statusFilter = VALID_STATUS.includes(params.status as ScheduleStatus)
    ? (params.status as ScheduleStatus)
    : null;
  const requestedView: ScheduleView =
    params.view === "week" || params.view === "year" || params.view === "list" ? params.view : "month";
  const view: ScheduleView = statusFilter === "sem_data" ? "list" : requestedView;

  // Data de referência: `date` (AAAA-MM-DD); links antigos usam ano/mês.
  let anchor = today;
  if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && !Number.isNaN(Date.parse(params.date))) {
    anchor = new Date(params.date + "T00:00:00");
  } else if (params.year || params.month) {
    const y = params.year ? Number(params.year) : today.getFullYear();
    const m = params.month ? Number(params.month) : today.getMonth() + 1;
    const sameMonth = y === today.getFullYear() && m === today.getMonth() + 1;
    anchor = sameMonth ? today : new Date(y, m - 1, 1);
  }
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1; // 1-12
  const anchorISO = toISODate(anchor);

  // Período exibido (indicadores) e faixa de datas a buscar, por visão.
  const weekStart = mondayOf(anchor);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);
  const gridStart = mondayOf(firstOfMonth);
  const gridEnd = mondayOf(lastOfMonth);
  gridEnd.setDate(gridEnd.getDate() + 6); // domingo da semana do último dia

  let periodStart = firstOfMonth;
  let periodEnd = lastOfMonth;
  let fetchStart = gridStart;
  let fetchEnd = gridEnd;
  if (view === "week") {
    periodStart = weekStart;
    periodEnd = weekEnd;
    fetchStart = weekStart;
    fetchEnd = weekEnd;
  } else if (view === "year") {
    periodStart = new Date(year, 0, 1);
    periodEnd = new Date(year, 11, 31);
    fetchStart = periodStart;
    fetchEnd = periodEnd;
  }
  const periodStartISO = toISODate(periodStart);
  const periodEndISO = toISODate(periodEnd);
  const fetchStartISO = toISODate(fetchStart);
  const fetchEndISO = toISODate(fetchEnd);

  const supabase = await createClient();
  const [surgeriesInRange, surgeriesWithoutDate, holidays, hospitals] = await Promise.all([
    listSurgeriesForSchedule(supabase, { from: fetchStartISO, to: fetchEndISO, hospitalId: params.hospital }),
    listSurgeriesWithoutDate(supabase, { hospitalId: params.hospital }),
    listHolidays(supabase, { from: fetchStartISO, to: fetchEndISO }),
    listActiveHospitalsForSelect(supabase),
  ]);

  // Indicadores do topo: previstas/confirmadas/atrasadas contam só o que
  // está dentro do período exibido (semana, mês ou ano — não os dias de
  // preenchimento do mês vizinho); "sem data" é sempre global, porque não pertence a mês
  // nenhum.
  const monthItems = surgeriesInRange.filter((s) => {
    const date = s.confirmed_date ?? s.expected_date;
    return date && date >= periodStartISO && date <= periodEndISO;
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

  function buildDays(from: Date, to: Date, monthIndex: number | null): ScheduleDay[] {
    const out: ScheduleDay[] = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      const iso = toISODate(cursor);
      out.push({
        date: iso,
        day: cursor.getDate(),
        inMonth: monthIndex === null ? true : cursor.getMonth() === monthIndex,
        isToday: iso === todayISO,
        surgeries: [...(byDate.get(iso) ?? [])].sort((a, b) => (a.confirmed_time ?? "").localeCompare(b.confirmed_time ?? "")),
        holidays: holidaysByDate.get(iso) ?? [],
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }

  function buildHref(overrides: Record<string, string | null>) {
    const sp = new URLSearchParams();
    sp.set("date", anchorISO);
    if (params.hospital) sp.set("hospital", params.hospital);
    if (params.status) sp.set("status", params.status);
    if (params.view) sp.set("view", params.view);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) sp.delete(key);
      else sp.set(key, value);
    }
    return `/schedule?${sp.toString()}`;
  }

  /** Move a referência: ±7 dias (semana), ±1 mês, ±1 ano. */
  function moveHref(delta: number) {
    let next: Date;
    if (view === "week") next = new Date(year, month - 1, anchor.getDate() + delta * 7);
    else if (view === "year") next = new Date(year + delta, 0, 1);
    else next = new Date(year, month - 1 + delta, 1);
    return buildHref({ date: toISODate(next) });
  }

  const periodTitle =
    view === "week"
      ? `${weekStart.getDate()} ${MONTH_SHORT[weekStart.getMonth()]}${
          weekStart.getFullYear() !== weekEnd.getFullYear() ? ` ${weekStart.getFullYear()}` : ""
        } – ${weekEnd.getDate()} ${MONTH_SHORT[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`
      : view === "year"
        ? String(year)
        : `${MONTH_NAMES[month - 1]} ${year}`;

  const weekDays = view === "week" ? buildDays(weekStart, weekEnd, null) : [];
  const monthDays = view === "month" ? buildDays(gridStart, gridEnd, month - 1) : [];

  const dominantDot = (items: ScheduleSurgeryItem[]) => {
    for (const status of ["atrasada", "confirmada", "prevista"] as ScheduleStatus[]) {
      if (items.some((s) => deriveScheduleStatus(s) === status)) return SCHEDULE_STATUS_COLOR[status].dot;
    }
    return items.length > 0 ? SCHEDULE_STATUS_COLOR[deriveScheduleStatus(items[0])].dot : null;
  };
  const yearMonths: YearMonth[] =
    view === "year"
      ? Array.from({ length: 12 }, (_, m) => {
          const first = new Date(year, m, 1);
          const last = new Date(year, m + 1, 0);
          const start = mondayOf(first);
          const end = mondayOf(last);
          end.setDate(end.getDate() + 6);
          const days = buildDays(start, end, m).map((d) => {
            const items = byDate.get(d.date) ?? [];
            return {
              date: d.date,
              day: d.day,
              inMonth: d.inMonth,
              isToday: d.isToday,
              isHoliday: d.holidays.length > 0,
              count: items.length,
              dot: dominantDot(items),
              href: buildHref({ date: d.date, view: "week" }),
            };
          });
          const total = days.filter((d) => d.inMonth).reduce((sum, d) => sum + d.count, 0);
          return { month: m, label: MONTH_NAMES[m], total, href: buildHref({ date: toISODate(first), view: null }), days };
        })
      : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-foreground">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cirurgias confirmadas (ou previstas, quando ainda sem data confirmada) por semana, mês ou ano.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <ScheduleFilters hospitals={hospitals} />
          <ScheduleViewToggle view={view} anchor={anchorISO} />
        </div>
      </div>

      <div className="mt-4">
        <ScheduleIndicatorCards counts={counts} activeStatus={statusFilter} buildHref={buildHref} />
      </div>

      {view !== "list" ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Link href={moveHref(-1)} aria-label="Anterior">
              <Button type="button" variant="outline" size="sm">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href={moveHref(1)} aria-label="Próximo">
              <Button type="button" variant="outline" size="sm">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href={buildHref({ date: todayISO })}>
              <Button type="button" variant="ghost" size="sm">
                Hoje
              </Button>
            </Link>
          </div>
          <p className="text-sm font-medium text-foreground">{periodTitle}</p>
        </div>
      ) : null}

      {view === "month" ? <ScheduleCalendar weekdayNames={WEEKDAY_NAMES} days={monthDays} /> : null}
      {view === "week" ? <ScheduleWeek weekdayNames={WEEKDAY_NAMES} days={weekDays} /> : null}
      {view === "year" ? <ScheduleYear weekdayInitials={WEEKDAY_INITIALS} months={yearMonths} /> : null}
      {view === "list" ? (
        <ScheduleListView surgeries={visibleSurgeries} withoutDate={statusFilter === "sem_data"} />
      ) : null}
    </div>
  );
}
