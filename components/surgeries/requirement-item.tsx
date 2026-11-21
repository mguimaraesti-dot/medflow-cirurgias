"use client";

import { useActionState, useState } from "react";

import {
  updateRequirementAction,
  type RequirementFormState,
} from "@/app/(dashboard)/surgeries/actions";
import type { SurgeryRequirement } from "@/lib/data/surgeries";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

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
  useActionToast(state, "Controle manual salvo.");

  return (
    <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Controle manual
      </p>

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

      <div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
