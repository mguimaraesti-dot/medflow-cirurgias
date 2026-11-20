"use client";

import { useActionState, useEffect, useState } from "react";

import {
  createProcedureAction,
  updateProcedureAction,
  type ProcedureFormState,
} from "@/app/(dashboard)/catalog/procedures/actions";
import type { Procedure } from "@/lib/data/procedures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: ProcedureFormState = {};

export function ProcedureFormDialog({ procedure }: { procedure?: Procedure }) {
  const [open, setOpen] = useState(false);
  const action = procedure
    ? updateProcedureAction.bind(null, procedure.id)
    : createProcedureAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!pending && !state.error && open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={procedure ? "outline" : "default"} size={procedure ? "sm" : "default"}>
          {procedure ? "Editar" : "Novo procedimento"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{procedure ? "Editar procedimento" : "Novo procedimento"}</DialogTitle>
          <DialogDescription>
            Procedimentos reutilizáveis — ao criar uma cirurgia, os materiais de referência do
            protocolo associado são carregados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" defaultValue={procedure?.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="internal_code">Código interno</Label>
              <Input
                id="internal_code"
                name="internal_code"
                defaultValue={procedure?.internal_code ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="specialty">Especialidade</Label>
              <Input id="specialty" name="specialty" defaultValue={procedure?.specialty ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" defaultValue={procedure?.description ?? ""} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin_notes">Observações administrativas</Label>
            <Textarea
              id="admin_notes"
              name="admin_notes"
              defaultValue={procedure?.admin_notes ?? ""}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox
              name="active"
              value="on"
              defaultChecked={procedure ? procedure.active : true}
            />
            Procedimento ativo
          </label>

          {state.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
