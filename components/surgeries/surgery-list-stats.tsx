import Link from "next/link";
import { CalendarCheck, CalendarClock, CheckCircle2, ClipboardList, Layers, XCircle, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SITUATION_LABEL_PLURAL, type SurgerySituation } from "@/lib/surgery-situation";
import { surgeryListQuery, type SurgeryListParams } from "@/lib/surgery-list-params";
import type { SurgeryListStats } from "@/lib/data/surgeries-list";

const CARDS: { key: SurgerySituation | "total"; label: string; icon: LucideIcon; tone: string }[] = [
  { key: "total", label: "Total de cirurgias", icon: Layers, tone: "bg-primary/15 text-primary" },
  { key: "planning", label: SITUATION_LABEL_PLURAL.planning, icon: ClipboardList, tone: "bg-slate-500/15 text-slate-400" },
  { key: "awaiting", label: SITUATION_LABEL_PLURAL.awaiting, icon: CalendarClock, tone: "bg-amber-500/15 text-amber-500" },
  { key: "confirmed", label: SITUATION_LABEL_PLURAL.confirmed, icon: CalendarCheck, tone: "bg-blue-500/15 text-blue-400" },
  { key: "completed", label: SITUATION_LABEL_PLURAL.completed, icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-500" },
  { key: "cancelled", label: SITUATION_LABEL_PLURAL.cancelled, icon: XCircle, tone: "bg-red-500/15 text-red-400" },
];

/**
 * Indicadores no topo. Os números vêm do banco (todas as cirurgias, não só
 * as filtradas) e cada card é um link que aplica/limpa o filtro de situação.
 */
export function SurgeryListStatsCards({ stats, params }: { stats: SurgeryListStats; params: SurgeryListParams }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {CARDS.map(({ key, label, icon: Icon, tone }) => {
        const active = key === "total" ? !params.status : params.status === key;
        const href = `/surgeries${surgeryListQuery(params, { status: key === "total" ? undefined : key, page: 1 })}`;
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:border-ring",
              active ? "border-primary ring-1 ring-primary" : "border-border"
            )}
          >
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tone)}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-semibold leading-tight text-foreground">{stats[key]}</span>
              <span className="block truncate text-xs text-muted-foreground" title={label}>
                {label}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
