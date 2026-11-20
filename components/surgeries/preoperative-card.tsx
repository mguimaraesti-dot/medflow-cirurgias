"use client";

import { useActionState, useRef, useTransition } from "react";
import { X } from "lucide-react";

import {
  addPreoperativeItemAction,
  setPreoperativeItemStatusAction,
  removePreoperativeItemAction,
  type PreoperativeFormState,
} from "@/app/(dashboard)/surgeries/operations-actions";
import type { PreoperativeItem } from "@/lib/data/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_LABEL: Record<PreoperativeItem["status"], string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluído",
  waived: "Dispensado",
};

const STATUS_VARIANT: Record<PreoperativeItem["status"], "outline" | "secondary" | "default"> = {
  pending: "outline",
  in_progress: "secondary",
  done: "default",
  waived: "secondary",
};

function ItemRow({ item, surgeryId }: { item: PreoperativeItem; surgeryId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-900">{item.description}</p>
        {item.due_date ? (
          <p className="text-xs text-slate-500">
            Prazo: {new Date(item.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
          </p>
        ) : null}
      </div>
      <Select
        value={item.status}
        disabled={pending}
        onValueChange={(status) =>
          startTransition(() =>
            setPreoperativeItemStatusAction(
              item.id,
              surgeryId,
              status as PreoperativeItem["status"]
            )
          )
        }
      >
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue>
            <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(STATUS_LABEL) as PreoperativeItem["status"][]).map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() => startTransition(() => removePreoperativeItemAction(item.id, surgeryId))}
        aria-label="Remover item"
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}

const initialState: PreoperativeFormState = {};

export function PreoperativeCard({
  surgeryId,
  items,
}: {
  surgeryId: string;
  items: PreoperativeItem[];
}) {
  const action = addPreoperativeItemAction.bind(null, surgeryId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum item cadastrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} surgeryId={surgeryId} />
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="flex items-end gap-2 border-t border-slate-100 pt-4"
      >
        <div className="flex-1">
          <Input name="description" placeholder="Novo item do checklist" required />
        </div>
        <Input name="due_date" type="date" className="w-40" />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Adicionando..." : "Adicionar"}
        </Button>
      </form>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
