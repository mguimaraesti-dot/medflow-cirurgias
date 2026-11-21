import Link from "next/link";
import { CalendarHeart } from "lucide-react";

import type { ScheduleSurgeryItem } from "@/lib/data/surgeries";
import type { Holiday } from "@/lib/data/holidays";
import { deriveScheduleStatus, SCHEDULE_STATUS_COLOR, SCHEDULE_STATUS_LABEL } from "@/lib/schedule-status";
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

function formatTime(value: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

function SurgeryChip({ surgery }: { surgery: ScheduleSurgeryItem }) {
  const scheduleStatus = deriveScheduleStatus(surgery);
  const color = SCHEDULE_STATUS_COLOR[scheduleStatus];
  const time = formatTime(surgery.confirmed_time);
  const procedureLabel = surgery.primary_procedure?.name;

  return (
    <Link
      href={`/surgeries/${surgery.id}`}
      className={cn(
        "flex flex-col gap-0 truncate rounded-r-sm border-l-2 bg-muted/60 px-1.5 py-1 text-[11px] leading-tight hover:bg-muted",
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
    </Link>
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
  const weeks: ScheduleDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {weekdayNames.map((name) => (
          <div key={name} className="py-2">
            {name}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flatMap((week) =>
          week.map((day) => {
            const visible = day.surgeries.slice(0, MAX_VISIBLE);
            const hiddenCount = day.surgeries.length - visible.length;
            const isHoliday = day.holidays.length > 0;
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
  );
}
