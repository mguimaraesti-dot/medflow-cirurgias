import Link from "next/link";
import { Activity, Clock, CalendarCheck2, AlertTriangle, CircleCheck } from "lucide-react";

import type { MapStats } from "@/lib/data/surgeries";
import { cn } from "@/lib/utils";

// Cada indicador leva a uma visão já filtrada do Mapa Cirúrgico — os 5
// primeiros filtram o próprio Kanban (board); "Realizadas" cai pra lista
// porque o board só mostra cirurgias ativas.
const CARDS: {
  key: keyof MapStats;
  label: string;
  icon: typeof Activity;
  iconClass: string;
  href: string;
}[] = [
  {
    key: "inProgress",
    label: "Cirurgias em andamento",
    icon: Activity,
    iconClass: "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
    href: "?status=active",
  },
  {
    key: "awaitingAuthorization",
    label: "Aguardando autorização",
    icon: Clock,
    iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
    href: "?status=active&pending=authorization",
  },
  {
    key: "scheduled",
    label: "Agendadas",
    icon: CalendarCheck2,
    iconClass: "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400",
    href: "?status=active&scheduled=1",
  },
  {
    key: "overdue",
    label: "Atrasadas",
    icon: AlertTriangle,
    iconClass: "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400",
    href: "?status=active&overdue=1",
  },
  {
    key: "completed",
    label: "Realizadas",
    icon: CircleCheck,
    iconClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
    href: "?view=lista&status=completed",
  },
];

export function MapStatsRow({ stats }: { stats: MapStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {CARDS.map(({ key, label, icon: Icon, iconClass, href }) => {
        const content = (
          <>
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", iconClass)}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="line-clamp-2 text-xs font-medium leading-tight text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold text-foreground">{stats[key]}</p>
            </div>
          </>
        );
        const className = cn(
          "flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm",
          stats[key] > 0 && "transition-shadow hover:shadow-md"
        );

        if (stats[key] > 0) {
          return (
            <Link key={key} href={href} className={className}>
              {content}
            </Link>
          );
        }
        return (
          <div key={key} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
