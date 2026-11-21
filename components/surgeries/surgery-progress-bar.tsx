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
    // O círculo+rótulo de cada etapa tem largura fixa (w-20): num container
    // flex comum, o texto do rótulo se recusa a encolher abaixo da palavra
    // mais larga (min-content), o que, com várias etapas espremidas numa
    // tela de celular, fazia os rótulos vazarem um por cima do outro. Com
    // largura fixa, sobra garantido pra cada rótulo quebrar em 2-3 linhas.
    //
    // Já o traço conector entre as etapas é flex-1 (cresce), não largura
    // fixa — assim a faixa toda se espalha e ocupa a largura disponível da
    // tela (em vez de ficar agrupada à esquerda com um vão vazio à
    // direita, como ficou depois de reduzir o número de etapas). Numa tela
    // estreita, o conector encolhe até o mínimo (min-w) antes de qualquer
    // rótulo ser espremido; se ainda assim não couber, a faixa rola de
    // lado (overflow-x-auto) em vez de sobrepor texto.
    <div className="-mx-1 flex items-start overflow-x-auto px-1 py-1">
      {steps.map((step, index) => (
        <Fragment key={step.label}>
          <div className="flex w-20 shrink-0 flex-col items-center gap-1.5">
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
                "w-full text-center text-[11px] leading-tight",
                step.state === "pending" ? "text-muted-foreground" : "font-medium text-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <div
              className={cn(
                "mx-1 mt-3.5 h-0.5 min-w-4 flex-1 rounded",
                step.state === "done" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-border"
              )}
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
