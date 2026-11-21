import Link from "next/link";

import type { ScheduleSurgeryItem } from "@/lib/data/surgeries";
import { cn } from "@/lib/utils";

export type ScheduleDay = {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  surgeries: ScheduleSurgeryItem[];
};

const MAX_VISIBLE = 3;

const STATUS_DOT: Record<string, string> = {
  active: "bg-blue-500",
  rescheduled: "bg-amber-500",
  completed: "bg-emerald-500",
};

function formatTime(value: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

function SurgeryChip({ surgery }: { surgery: ScheduleSurgeryItem }) {
  const time = formatTime(surgery.confirmed_time);
  return (
    <Link
      href={`/surgeries/${surgery.id}`}
      className="flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] hover:bg-muted"
      title={`${surgery.patient?.full_name ?? "—"} — ${surgery.hospital?.name ?? "—"}`}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[surgery.status] ?? "bg-muted-foreground")} />
      {time ? <span className="shrink-0 text-muted-foreground">{time}</span> : null}
      <span className="truncate text-foreground">{surgery.patient?.full_name ?? "—"}</span>
    </Link>
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
            return (
              <div
                key={day.date}
                className={cn(
                  "flex min-h-[96px] flex-col gap-0.5 border-b border-r border-border p-1.5 last:border-r-0",
                  !day.inMonth && "bg-muted/40"
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
