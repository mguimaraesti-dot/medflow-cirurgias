"use client";

import { useEffect, useState } from "react";
import { CalendarHeart } from "lucide-react";

import type { ScheduleSurgeryItem } from "@/lib/data/surgeries";
import type { Holiday } from "@/lib/data/holidays";
import { deriveScheduleStatus, SCHEDULE_STATUS_COLOR, SCHEDULE_STATUS_LABEL } from "@/lib/schedule-status";
import { ScheduleDetailSheet } from "@/components/schedule/schedule-detail-sheet";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

export type ScheduleDay = {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  surgeries: ScheduleSurgeryItem[];
  holidays: Holiday[];
};

const MAX_VISIBLE = 3;
const MAX_DOTS = 4;

function formatTime(value: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

function formatDayLabel(iso: string) {
  const label = new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function SurgeryChip({ surgery }: { surgery: ScheduleSurgeryItem }) {
  const [open, setOpen] = useState(false);
  const scheduleStatus = deriveScheduleStatus(surgery);
  const color = SCHEDULE_STATUS_COLOR[scheduleStatus];
  const time = formatTime(surgery.confirmed_time);
  const procedureLabel = surgery.primary_procedure?.name;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full flex-col gap-0 truncate rounded-r-sm border-l-2 bg-muted/60 px-1.5 py-1 text-left text-[11px] leading-tight hover:bg-muted",
          color.border
        )}
        title={[
          surgery.patient?.full_name,
          procedureLabel,
          surgery.hospital?.name,
          SCHEDULE_STATUS_LABEL[scheduleStatus],
        ]
          .filter(Boolean)
          .join(" — ")}
      >
        <span className="flex items-center gap-1 truncate font-medium text-foreground">
          {time ? <span className="shrink-0 text-muted-foreground">{time}</span> : null}
          <span className="truncate">{surgery.patient?.full_name ?? "—"}</span>
        </span>
        {procedureLabel ? <span className="truncate text-muted-foreground">{procedureLabel}</span> : null}
        <span className="truncate text-muted-foreground">{surgery.hospital?.name ?? "—"}</span>
      </button>
      <ScheduleDetailSheet surgery={surgery} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Versão da cirurgia pro painel "dia selecionado" do mobile — nada
 * truncado (o cartão do calendário em si só tem espaço pra pontinhos de
 * cor, então o nome/procedimento completos aparecem aqui). */
function DayAgendaItem({ surgery }: { surgery: ScheduleSurgeryItem }) {
  const [open, setOpen] = useState(false);
  const scheduleStatus = deriveScheduleStatus(surgery);
  const color = SCHEDULE_STATUS_COLOR[scheduleStatus];
  const time = formatTime(surgery.confirmed_time);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-start gap-2 border-l-2 py-2.5 pl-2.5 pr-2 text-left hover:bg-muted/60",
          color.border
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {time ? <span className="text-xs font-medium text-muted-foreground">{time}</span> : null}
            <span className="text-sm font-medium text-foreground">{surgery.patient?.full_name ?? "—"}</span>
          </div>
          {surgery.primary_procedure?.name ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{surgery.primary_procedure.name}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">{surgery.hospital?.name ?? "—"}</p>
        </div>
        <Badge variant="outline" className={cn("shrink-0 text-[10px]", color.badge)}>
          {SCHEDULE_STATUS_LABEL[scheduleStatus]}
        </Badge>
      </button>
      <ScheduleDetailSheet surgery={surgery} open={open} onOpenChange={setOpen} />
    </>
  );
}

function HolidayBanner({ holidays }: { holidays: Holiday[] }) {
  if (holidays.length === 0) return null;
  const names = holidays.map((h) => h.name).join(", ");
  const description = holidays.find((h) => h.description)?.description;
  return (
    <div
      className="mb-1 flex items-center gap-1 truncate rounded-sm bg-rose-950/50 px-1.5 py-0.5 text-[10px] font-medium text-rose-300"
      title={description ?? names}
    >
      <CalendarHeart className="h-3 w-3 shrink-0" />
      <span className="truncate">{names}</span>
    </div>
  );
}

export function ScheduleCalendar({
  weekdayNames,
  days,
}: {
  weekdayNames: string[];
  days: ScheduleDay[];
}) {
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<string | null>(
    () => days.find((d) => d.isToday)?.date ?? null
  );
  // O grid é reconstruído a cada navegação de mês (novo `days`, mesmo
  // componente montado) — sem isso, o dia selecionado do mês anterior
  // ficaria "selecionado" (mas inexistente) no mês novo.
  const gridKey = `${days[0]?.date ?? ""}_${days[days.length - 1]?.date ?? ""}`;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta a seleção ao trocar de mês (grade nova)
    setSelectedDate(days.find((d) => d.isToday)?.date ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridKey]);

  const weeks: ScheduleDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  const selectedDay = days.find((d) => d.date === selectedDate) ?? null;

  return (
    <div>
      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-muted text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {weekdayNames.map((name) => (
            <div key={name} className="py-2">
              {/* No mobile só cabe 1 letra por coluna sem apertar — a
               * sigla completa (SEG, TER...) ficava quase colada. */}
              <span className="md:hidden">{name.slice(0, 1)}</span>
              <span className="hidden md:inline">{name}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flatMap((week) =>
            week.map((day) => {
              const isHoliday = day.holidays.length > 0;
              const isSelected = isMobile && selectedDate === day.date;

              if (isMobile) {
                const dots = day.surgeries.slice(0, MAX_DOTS);
                const hiddenDots = day.surgeries.length - dots.length;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    className={cn(
                      "flex min-h-[52px] flex-col items-center gap-1 border-b border-r border-border p-1 pt-1.5 last:border-r-0",
                      !day.inMonth && "bg-muted/40",
                      isHoliday && day.inMonth && "bg-rose-950/15",
                      isSelected && "bg-primary/10 ring-1 ring-inset ring-primary"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        day.isToday
                          ? "bg-primary font-medium text-primary-foreground"
                          : day.inMonth
                            ? "text-foreground"
                            : "text-muted-foreground"
                      )}
                    >
                      {day.day}
                    </span>
                    <div className="flex min-h-[6px] flex-wrap items-center justify-center gap-0.5">
                      {isHoliday ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" /> : null}
                      {dots.map((surgery) => (
                        <span
                          key={surgery.id}
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            SCHEDULE_STATUS_COLOR[deriveScheduleStatus(surgery)].dot
                          )}
                        />
                      ))}
                      {hiddenDots > 0 ? (
                        <span className="text-[9px] leading-none text-muted-foreground">+{hiddenDots}</span>
                      ) : null}
                    </div>
                  </button>
                );
              }

              const visible = day.surgeries.slice(0, MAX_VISIBLE);
              const hiddenCount = day.surgeries.length - visible.length;
              return (
                <div
                  key={day.date}
                  className={cn(
                    "flex min-h-[108px] flex-col gap-1 border-b border-r border-border p-1.5 last:border-r-0",
                    !day.inMonth && "bg-muted/40",
                    isHoliday && day.inMonth && "bg-rose-950/15"
                  )}
                >
                  <span
                    className={cn(
                      "mb-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                      day.isToday
                        ? "bg-primary font-medium text-primary-foreground"
                        : day.inMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                    )}
                  >
                    {day.day}
                  </span>
                  <HolidayBanner holidays={day.holidays} />
                  {visible.map((surgery) => (
                    <SurgeryChip key={surgery.id} surgery={surgery} />
                  ))}
                  {hiddenCount > 0 ? (
                    <span className="px-1.5 text-[11px] text-muted-foreground">+{hiddenCount} mais</span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* No mobile cada dia só mostra pontinhos (sem espaço pra nome,
       * procedimento etc.) — o painel abaixo mostra a agenda completa e
       * legível do dia tocado, sem precisar abrir nada. */}
      {isMobile ? (
        <div className="mt-3 rounded-xl border border-border bg-card">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-sm font-medium text-foreground">
              {selectedDay ? formatDayLabel(selectedDay.date) : "Toque num dia pra ver a agenda"}
            </p>
          </div>
          {selectedDay ? (
            <div className="p-2">
              {selectedDay.holidays.length > 0 ? (
                <div className="px-1 pb-1">
                  <HolidayBanner holidays={selectedDay.holidays} />
                </div>
              ) : null}
              {selectedDay.surgeries.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma cirurgia nesse dia.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {selectedDay.surgeries.map((surgery) => (
                    <DayAgendaItem key={surgery.id} surgery={surgery} />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
