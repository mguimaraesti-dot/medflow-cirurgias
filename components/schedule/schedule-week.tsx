"use client";

import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import {
  DayAgendaItem,
  HolidayBanner,
  SurgeryChip,
  formatDayLabel,
  type ScheduleDay,
} from "@/components/schedule/schedule-calendar";

/**
 * Visão semanal: 7 colunas no computador (todas as cirurgias do dia, sem
 * "+N mais") e, no celular, uma lista de dias empilhados com os cartões
 * completos de cada cirurgia.
 */
export function ScheduleWeek({ weekdayNames, days }: { weekdayNames: string[]; days: ScheduleDay[] }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        {days.map((day) => (
          <section
            key={day.date}
            className={cn("rounded-xl border border-border bg-card", day.isToday && "ring-1 ring-primary")}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <p className={cn("text-sm font-medium", day.isToday ? "text-primary" : "text-foreground")}>
                {formatDayLabel(day.date)}
              </p>
              <span className="text-xs text-muted-foreground">
                {day.surgeries.length === 0 ? "Livre" : `${day.surgeries.length} cirurgia(s)`}
              </span>
            </div>
            {day.holidays.length > 0 ? (
              <div className="px-2 pt-2">
                <HolidayBanner holidays={day.holidays} />
              </div>
            ) : null}
            {day.surgeries.length > 0 ? (
              <div className="flex flex-col divide-y divide-border p-2">
                {day.surgeries.map((surgery) => (
                  <DayAgendaItem key={surgery.id} surgery={surgery} />
                ))}
              </div>
            ) : null}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7">
        {days.map((day, index) => (
          <div
            key={day.date}
            className={cn(
              "flex min-h-[320px] flex-col gap-1.5 border-r border-border p-2 last:border-r-0",
              day.holidays.length > 0 && "bg-rose-950/15"
            )}
          >
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{weekdayNames[index]}</span>
              <span
                className={cn(
                  "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs",
                  day.isToday ? "bg-primary font-medium text-primary-foreground" : "text-foreground"
                )}
              >
                {day.day}
              </span>
            </div>
            <HolidayBanner holidays={day.holidays} />
            {day.surgeries.map((surgery) => (
              <SurgeryChip key={surgery.id} surgery={surgery} />
            ))}
            {day.surgeries.length === 0 && day.holidays.length === 0 ? (
              <span className="mt-2 text-center text-[11px] text-muted-foreground/60">Livre</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
