"use client";

import { useActionState, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  updateRequirementAction,
  type RequirementFormState,
} from "@/app/(dashboard)/surgeries/actions";
import type { SurgeryRequirement } from "@/lib/data/surgeries";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const initialState: RequirementFormState = {};

/**
 * Controle manual do requisito ("gate" de liberação). Na prática, o status
 * "Satisfeito" já é recalculado automaticamente a partir dos dados reais
 * (autorização aprovada, reserva confirmada, checklist/materiais completos —
 * ver migration 0005) sempre que o formulário específico é preenchido; os
 * controles abaixo seguem disponíveis para marcar manualmente ou dispensar
 * o requisito com justificativa, nos casos em que o fluxo normal não se
 * aplica.
 *
 * Importante: o componente é remontado (via `key` no componente pai,
 * atrelado a `requirement.updated_at`) sempre que o valor recalculado
 * automaticamente muda — sem isso, o checkbox "Satisfeito" ficaria com o
 * valor desatualizado da renderização anterior, e um simples clique em
 * "Salvar" (por qualquer outro motivo, ex: só pra dispensar) sobrescreveria
 * silenciosamente de volta o cálculo automático correto.
 */
export function RequirementItem({
  requirement,
  hideManualSatisfied,
}: {
  requirement: SurgeryRequirement;
  /** Omite o checkbox "Marcar como satisfeito manualmente" — usado quando o
   * requisito é 100% automático (ex: materiais, que já fica satisfeito
   * sozinho quando todos os itens são entregues) e expor o controle manual
   * só criaria risco de alguém desfazer o cálculo automático sem querer. */
  hideManualSatisfied?: boolean;
}) {
  const action = updateRequirementAction.bind(null, requirement.id, requirement.surgery_id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [waived, setWaived] = useState(requirement.waived);
  // Recolhido por padrão: é uma opção avançada (o status já é calculado
  // sozinho). Abre direto só se o requisito já está dispensado.
  const [expanded, setExpanded] = useState(requirement.waived);
  useActionToast(state, "Controle manual salvo.");

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between py-1 text-left text-sm text-muted-foreground hover:text-foreground"
      >
        <span>
          Controle manual
          {requirement.waived ? <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">dispensado</span> : null}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
      </button>
      <form action={formAction} className={cn("flex flex-col gap-3", !expanded && "hidden")}>

      {hideManualSatisfied ? (
        <input type="hidden" name="is_satisfied" value={requirement.is_satisfied ? "on" : ""} />
      ) : (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox name="is_satisfied" value="on" defaultChecked={requirement.is_satisfied} />
          Marcar como satisfeito manualmente
        </label>
      )}

      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox
          name="waived"
          value="on"
          defaultChecked={requirement.waived}
          onCheckedChange={(checked) => setWaived(checked === true)}
        />
        Dispensar (justificar abaixo)
      </label>

      {waived ? (
        <Textarea
          name="waived_reason"
          placeholder="Justificativa da dispensa"
          defaultValue={requirement.waived_reason ?? ""}
        />
      ) : null}

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex sm:justify-end">
        <Button type="submit" variant="outline" disabled={pending} className="h-10 w-full px-6 sm:w-auto">
          {pending ? "Salvando..." : "Salvar controle manual"}
        </Button>
      </div>
      </form>
    </div>
  );
}
