import Link from "next/link";
import { CheckCircle2, Package, PauseCircle, Stethoscope, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { procedureListQuery, type ProcedureListParams } from "@/lib/procedure-list-params";
import type { ProcedureListStats } from "@/lib/data/procedures-list";

type Card = {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
  /** Status que o card aplica ao clicar; "all" limpa; undefined = card só informativo. */
  filter?: "all" | "active" | "inactive";
};

/** Indicadores (dados reais, sobre todos os procedimentos). Total/Ativos/Inativos aplicam o filtro de status. */
export function ProcedureListStatsCards({ stats, params }: { stats: ProcedureListStats; params: ProcedureListParams }) {
  const cards: Card[] = [
    { label: "Total de procedimentos", value: stats.total, icon: Stethoscope, tone: "bg-primary/15 text-primary", filter: "all" },
    { label: "Ativos", value: stats.active, icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-500", filter: "active" },
    { label: "Inativos", value: stats.inactive, icon: PauseCircle, tone: "bg-slate-500/15 text-slate-400", filter: "inactive" },
    { label: "Com materiais padrão", value: stats.withMaterials, icon: Package, tone: "bg-amber-500/15 text-amber-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tone, filter }) => {
        const body = (
          <>
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tone)}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-semibold leading-tight text-foreground">{value}</span>
              <span className="block truncate text-xs text-muted-foreground" title={label}>
                {label}
              </span>
            </span>
          </>
        );
        if (!filter) {
          return (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
              {body}
            </div>
          );
        }
        const active = filter === "all" ? !params.status : params.status === filter;
        return (
          <Link
            key={label}
            href={`/catalog/procedures${procedureListQuery(params, { status: filter === "all" ? undefined : filter, page: 1 })}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:border-ring",
              active ? "border-primary ring-1 ring-primary" : "border-border"
            )}
          >
            {body}
          </Link>
        );
      })}
    </div>
  );
}
