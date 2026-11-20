import Link from "next/link";
import { Activity, Clock, PackageX, CalendarCheck2, AlertTriangle, CircleCheck } from "lucide-react";

import type { MapStats } from "@/lib/data/surgeries";
import { cn } from "@/lib/utils";

const CARDS: {
  key: keyof MapStats;
  label: string;
  icon: typeof Activity;
  accent: string;
  href?: string;
}[] = [
  { key: "inProgress", label: "Cirurgias em andamento", icon: Activity, accent: "border-l-blue-500" },
  { key: "awaitingAuthorization", label: "Aguardando autorização", icon: Clock, accent: "border-l-amber-500" },
  { key: "materialsPending", label: "Pendências de materiais", icon: PackageX, accent: "border-l-red-500" },
  { key: "scheduled", label: "Agendadas", icon: CalendarCheck2, accent: "border-l-indigo-500" },
  {
    key: "overdue",
    label: "Atrasadas",
    icon: AlertTriangle,
    accent: "border-l-red-600",
    href: "?view=lista&overdue=1",
  },
  { key: "completed", label: "Realizadas", icon: CircleCheck, accent: "border-l-emerald-500" },
];

export function MapStatsRow({ stats }: { stats: MapStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {CARDS.map(({ key, label, icon: Icon, accent, href }) => {
        const content = (
          <>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" />
              <p className="text-xs font-medium">{label}</p>
            </div>
            <p className="mt-1.5 text-2xl font-semibold text-foreground">{stats[key]}</p>
          </>
        );
        const className = cn(
          "rounded-lg border border-l-4 border-border bg-card px-4 py-3 shadow-sm",
          accent,
          href && stats[key] > 0 && "transition-shadow hover:shadow-md"
        );

        if (href && stats[key] > 0) {
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
