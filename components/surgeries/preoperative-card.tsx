"use client";

import { useActionState, useState } from "react";

import {
  savePreanestheticEvaluationAction,
  type PreoperativeFormState,
} from "@/app/(dashboard)/surgeries/operations-actions";
import type { PreoperativeItem } from "@/lib/data/operations";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: PreoperativeFormState = {};

/**
 * Pré-operatório simplificado: a única pergunta é se a cirurgia precisa de
 * avaliação/consulta pré-anestésica — se sim, quando e se já foi feita.
 * Por baixo continua guardado como um item de `preoperative_items` (pra
 * reaproveitar o mesmo gate de liberação automático da migration 0005),
 * mas sempre no máximo 1 item por cirurgia, em vez de um checklist livre.
 */
export function PreoperativeCard({
  surgeryId,
  items,
}: {
  surgeryId: string;
  items: PreoperativeItem[];
}) {
  const item = items[0] ?? null;
  const action = savePreanestheticEvaluationAction.bind(null, surgeryId, item?.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [needed, setNeeded] = useState(item ? (item.status === "waived" ? "no" : "yes") : "");
  useActionToast(state, "Avaliação pré-anestésica salva.");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="needed">Precisa de consulta pré-anestésica?</Label>
        <Select name="needed" value={needed} onValueChange={setNeeded}>
          <SelectTrigger id="needed">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Sim</SelectItem>
            <SelectItem value="no">Não</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {needed === "yes" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="consult_date">Data da consulta</Label>
            <Input
              id="consult_date"
              name="consult_date"
              type="date"
              defaultValue={item?.due_date ?? ""}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox name="done" value="on" defaultChecked={item?.status === "done"} />
            Consulta já realizada
          </label>
        </>
      ) : null}

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="outline" size="sm" disabled={pending || needed === ""}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
