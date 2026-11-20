"use client";

import { useActionState, useEffect, useState } from "react";

import {
  createMaterialAction,
  updateMaterialAction,
  type MaterialFormState,
} from "@/app/(dashboard)/catalog/materials/actions";
import type { Material } from "@/lib/data/materials";
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

const initialState: MaterialFormState = {};

export function MaterialFormDialog({ material }: { material?: Material }) {
  const [open, setOpen] = useState(false);
  const action = material ? updateMaterialAction.bind(null, material.id) : createMaterialAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!pending && !state.error && open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={material ? "outline" : "default"} size={material ? "sm" : "default"}>
          {material ? "Editar" : "Novo material"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{material ? "Editar material" : "Novo material"}</DialogTitle>
          <DialogDescription>
            Os fornecedores são vinculados depois de salvar, pela tela de detalhe do material.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" defaultValue={material?.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="internal_code">Código interno</Label>
              <Input
                id="internal_code"
                name="internal_code"
                defaultValue={material?.internal_code ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" name="category" defaultValue={material?.category ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit">Unidade de medida</Label>
              <Input id="unit" name="unit" defaultValue={material?.unit ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="specs">Especificações técnicas</Label>
              <Input id="specs" name="specs" defaultValue={material?.specs ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" defaultValue={material?.description ?? ""} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={material?.notes ?? ""} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox name="active" value="on" defaultChecked={material ? material.active : true} />
            Material ativo
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
