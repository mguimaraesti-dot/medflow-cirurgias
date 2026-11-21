import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ScheduleStatus } from "@/lib/schedule-status";

type Indicator = {
  status: ScheduleStatus;
  label: string;
  count: number;
  dotClassName: string;
};

/**
 * 4 indicadores do topo da Agenda — clicáveis: cada um é um link que
 * aplica (ou remove, se já estiver ativo) o filtro de status
 * correspondente. "Aguardando definição" força a visão em lista, porque
 * cirurgia sem data não tem onde entrar no calendário mensal.
 */
export function ScheduleIndicatorCards({
  counts,
  activeStatus,
  buildHref,
}: {
  counts: { prevista: number; confirmada: number; atrasada: number; semData: number };
  activeStatus: string | null;
  buildHref: (params: Record<string, string | null>) => string;
}) {
  const indicators: Indicator[] = [
    { status: "prevista", label: "Previstas", count: counts.prevista, dotClassName: "bg-amber-500" },
    { status: "confirmada", label: "Confirmadas", count: counts.confirmada, dotClassName: "bg-emerald-500" },
    { status: "atrasada", label: "Atrasadas", count: counts.atrasada, dotClassName: "bg-red-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {indicators.map((indicator) => {
        const isActive = activeStatus === indicator.status;
        return (
          <Link
            key={indicator.status}
            href={buildHref(isActive ? { status: null } : { status: indicator.status })}
          >
            <Card className={cn("transition-colors hover:bg-muted", isActive && "ring-1 ring-primary")}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", indicator.dotClassName)} />
                <div>
                  <p className="text-xs text-muted-foreground">{indicator.label}</p>
                  <p className="text-lg font-medium text-foreground">{indicator.count}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
      <Link href={buildHref(activeStatus === "sem_data" ? { status: null, view: null } : { status: "sem_data", view: "list" })}>
        <Card className={cn("transition-colors hover:bg-muted", activeStatus === "sem_data" && "ring-1 ring-primary")}>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Aguardando definição</p>
              <p className="text-lg font-medium text-foreground">{counts.semData}</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
