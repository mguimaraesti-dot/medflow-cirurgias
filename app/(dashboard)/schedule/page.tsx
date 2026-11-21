import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listSurgeriesForSchedule, type ScheduleSurgeryItem } from "@/lib/data/surgeries";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { Button } from "@/components/ui/button";
import { ScheduleHospitalFilter } from "@/components/schedule/schedule-hospital-filter";
import { ScheduleCalendar, type ScheduleDay } from "@/components/schedule/schedule-calendar";

type SearchParams = {
  year?: string;
  month?: string;
  hospital?: string;
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

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const today = new Date();
  const year = params.year ? Number(params.year) : today.getFullYear();
  const month = params.month ? Number(params.month) : today.getMonth() + 1; // 1-12

  const firstOfMonth = new Date(year, month - 1, 1);
  const lastOfMonth = new Date(year, month, 0);
  const gridStart = mondayOf(firstOfMonth);
  const gridEnd = mondayOf(lastOfMonth);
  gridEnd.setDate(gridEnd.getDate() + 6); // domingo da semana do último dia

  const supabase = await createClient();
  const [surgeries, hospitals] = await Promise.all([
    listSurgeriesForSchedule(supabase, {
      from: toISODate(gridStart),
      to: toISODate(gridEnd),
      hospitalId: params.hospital,
    }),
    listActiveHospitalsForSelect(supabase),
  ]);

  const byDate = new Map<string, ScheduleSurgeryItem[]>();
  for (const surgery of surgeries) {
    const date = surgery.confirmed_date ?? surgery.expected_date;
    if (!date) continue;
    const list = byDate.get(date) ?? [];
    list.push(surgery);
    byDate.set(date, list);
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
      surgeries: (byDate.get(iso) ?? []).sort((a, b) =>
        (a.confirmed_time ?? "").localeCompare(b.confirmed_time ?? "")
      ),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  function monthHref(deltaMonths: number, extra?: Record<string, string>) {
    const base = new Date(year, month - 1 + deltaMonths, 1);
    const sp = new URLSearchParams({
      year: String(base.getFullYear()),
      month: String(base.getMonth() + 1),
    });
    if (params.hospital) sp.set("hospital", params.hospital);
    if (extra) for (const [k, v] of Object.entries(extra)) sp.set(k, v);
    return `/schedule?${sp.toString()}`;
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
        <ScheduleHospitalFilter hospitals={hospitals} />
      </div>

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
          <Link href={`/schedule${params.hospital ? `?hospital=${params.hospital}` : ""}`}>
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
    </div>
  );
}
