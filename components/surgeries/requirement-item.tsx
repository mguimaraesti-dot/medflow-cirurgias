"use client";

import { useActionState, useState } from "react";

import {
  updateRequirementAction,
  type RequirementFormState,
} from "@/app/(dashboard)/surgeries/actions";
import type { SurgeryRequirement } from "@/lib/data/surgeries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<SurgeryRequirement["requirement_key"], string> = {
  authorization: "Autorização",
  materials: "Materiais/OPME",
  or_reservation: "Reserva do centro cirúrgico",
  preoperative: "Pré-operatório",
};

const initialState: RequirementFormState = {};

export function RequirementItem({ requirement }: { requirement: SurgeryRequirement }) {
  const action = updateRequirementAction.bind(null, requirement.id, requirement.surgery_id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [waived, setWaived] = useState(requirement.waived);

  const status = requirement.waived
    ? "Dispensado"
    : requirement.is_satisfied
      ? "Satisfeito"
      : "Pendente";
  const statusVariant = requirement.waived
    ? "secondary"
    : requirement.is_satisfied
      ? "default"
      : "outline";

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-border p-4"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">{LABELS[requirement.requirement_key]}</p>
        <Badge variant={statusVariant}>{status}</Badge>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox name="is_satisfied" value="on" defaultChecked={requirement.is_satisfied} />
        Satisfeito
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
