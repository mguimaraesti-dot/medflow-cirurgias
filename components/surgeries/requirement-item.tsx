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
 */
export function RequirementItem({ requirement }: { requirement: SurgeryRequirement }) {
  const action = updateRequirementAction.bind(null, requirement.id, requirement.surgery_id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [waived, setWaived] = useState(requirement.waived);
  useActionToast(state, "Controle manual salvo.");

  return (
    <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Controle manual
      </p>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox name="is_satisfied" value="on" defaultChecked={requirement.is_satisfied} />
        Marcar como satisfeito manualmente
      </label>

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
