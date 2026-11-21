import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Kpi = {
  label: string;
  value: number;
  href: string;
  dotClassName?: string;
};

export function DashboardKpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => (
        <Link key={kpi.label} href={kpi.href}>
          <Card className="transition-colors hover:bg-muted">
            <CardContent className="flex items-center gap-2.5 p-4">
              {kpi.dotClassName ? (
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", kpi.dotClassName)} />
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-medium text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
