import { Fragment } from "react";
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
    // Cada etapa agora é flex-1 (sem largura fixa e sem shrink-0): elas
    // dividem igualmente a largura disponível do container, então a faixa
    // sempre preenche exatamente a tela, sem sobrar vão nem precisar de
    // scroll — só o rótulo quebra em mais linhas se a tela for estreita. O
    // traço conector, antes flex-1 (era ele quem crescia), agora tem
    // largura pequena e fixa: são as etapas que crescem/encolhem, não ele.
    <div className="flex items-start">
      {steps.map((step, index) => (
        <Fragment key={step.label}>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
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
                "w-full text-center text-[11px] leading-tight break-words",
                step.state === "pending" ? "text-muted-foreground" : "font-medium text-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <div
              className={cn(
                "mx-0.5 mt-3.5 h-0.5 w-3 shrink-0 rounded sm:w-6",
                step.state === "done" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-border"
              )}
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
