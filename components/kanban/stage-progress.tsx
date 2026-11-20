import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import type { WorkflowStage } from "@/lib/data/surgeries";
import { cn } from "@/lib/utils";

export function StageProgress({
  stages,
  countByStage,
  overdueCount,
}: {
  stages: WorkflowStage[];
  countByStage: Record<string, number>;
  overdueCount: number;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-x-1 gap-y-2">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-medium text-slate-600"
                )}
              >
                {i + 1}
              </span>
              <span className="whitespace-nowrap">{stage.name}</span>
              <span className="font-medium text-slate-900">{countByStage[stage.id] ?? 0}</span>
            </div>
            {i < stages.length - 1 ? (
              <CheckCircle2 className="h-3 w-3 shrink-0 text-slate-200" />
            ) : null}
          </div>
        ))}
      </div>

      {overdueCount > 0 ? (
        <Link
          href="?view=lista&overdue=1"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          {overdueCount} cirurgia{overdueCount === 1 ? "" : "s"} atrasada
          {overdueCount === 1 ? "" : "s"}
          <span className="underline">ver detalhes</span>
        </Link>
      ) : null}
    </div>
  );
}
