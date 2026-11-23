"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays, CalendarRange, CalendarClock, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ScheduleView = "week" | "month" | "year" | "list";

const OPTIONS: { id: ScheduleView; label: string; icon: typeof List }[] = [
  { id: "week", label: "Semana", icon: CalendarClock },
  { id: "month", label: "Mês", icon: CalendarDays },
  { id: "year", label: "Ano", icon: CalendarRange },
  { id: "list", label: "Lista", icon: List },
];

/**
 * Alterna entre semana, mês, ano e lista. `anchor` é a data (AAAA-MM-DD) que
 * a tela está mostrando agora; ao trocar de visão ela é mantida, para você
 * continuar no mesmo período.
 */
export function ScheduleViewToggle({ view, anchor }: { view: ScheduleView; anchor: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(next: ScheduleView) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("year");
    params.delete("month");
    params.set("date", anchor);
    if (next === "month") params.delete("view");
    else params.set("view", next);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setView(id)}
          className={cn("px-2.5 sm:px-3", view === id && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
        >
          <Icon className="hidden h-4 w-4 sm:block" />
          {label}
        </Button>
      ))}
    </div>
  );
}
