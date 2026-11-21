import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type ProgressStepState = "done" | "current" | "pending" | "blocked";

export type ProgressStep = {
  label: string;
  state: ProgressStepState;
};

/**
 * Indicador visual de andamento. Cada etapa reflete dados reais já
 * calculados no banco (surgery_requirements.is_satisfied/waived, calculados
 * automaticamente — ver migration 0005 — e surgery.status), nunca o simples
 * fato de o formulário ter sido aberto.
 */
export function SurgeryProgressBar({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="flex w-full items-start px-1 py-1">
      {steps.map((step, index) => (
        <div key={step.label} className="flex min-w-0 flex-1 items-start last:flex-none last:w-auto">
          <div className="flex min-w-0 flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium",
                step.state === "done" &&
                  "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950",
                step.state === "current" && "border-primary bg-card text-primary",
                step.state === "pending" && "border-border bg-card text-muted-foreground",
                step.state === "blocked" &&
                  "border-red-400 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/60 dark:text-red-400"
              )}
            >
              {step.state === "done" ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <span
              className={cn(
                "w-full max-w-[90px] text-center text-[11px] leading-tight",
                step.state === "pending" ? "text-muted-foreground" : "font-medium text-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <div
              className={cn(
                "mx-1 mt-3.5 h-0.5 flex-1 rounded",
                step.state === "done" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-border"
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
