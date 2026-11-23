import Link from "next/link";

import { cn } from "@/lib/utils";

export type YearDay = {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isHoliday: boolean;
  count: number;
  /** Classe de cor do ponto, conforme o status predominante do dia. */
  dot: string | null;
  href: string;
};

export type YearMonth = {
  month: number;
  label: string;
  total: number;
  href: string;
  days: YearDay[];
};

/**
 * Visão anual: os 12 meses em miniatura. Cada dia com cirurgia ganha um
 * ponto colorido e o número de cirurgias; clicar no dia abre a semana
 * dele, e no nome do mês abre o mês.
 */
export function ScheduleYear({ weekdayInitials, months }: { weekdayInitials: string[]; months: YearMonth[] }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {months.map((m) => (
        <section key={m.month} className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <Link href={m.href} className="text-sm font-medium text-foreground hover:underline">
              {m.label}
            </Link>
            <span className={cn("text-xs", m.total > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
              {m.total === 0 ? "Sem cirurgias" : `${m.total} cirurgia(s)`}
            </span>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] font-medium uppercase text-muted-foreground">
            {weekdayInitials.map((w, i) => (
              <span key={i} className="py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {m.days.map((d) =>
              d.inMonth ? (
                <Link
                  key={d.date}
                  href={d.href}
                  title={d.count > 0 ? `${d.count} cirurgia(s)` : undefined}
                  className={cn(
                    "flex h-9 flex-col items-center justify-center rounded-md text-xs hover:bg-muted",
                    d.isHoliday && "bg-rose-950/20",
                    d.count > 0 && "font-medium"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full",
                      d.isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                    )}
                  >
                    {d.day}
                  </span>
                  {d.count > 0 ? (
                    <span className="flex items-center gap-0.5 text-[9px] leading-none text-muted-foreground">
                      <span className={cn("h-1.5 w-1.5 rounded-full", d.dot ?? "bg-muted-foreground")} />
                      {d.count}
                    </span>
                  ) : null}
                </Link>
              ) : (
                <span key={d.date} className="h-9" />
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
