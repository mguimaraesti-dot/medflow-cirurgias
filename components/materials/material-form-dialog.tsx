"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MATERIAL_UNITS } from "@/lib/constants/units";
import { TussMaterialField } from "@/components/materials/tuss-material-field";

const initialState: MaterialFormState = {};

export function MaterialFormDialog({
  material,
  trigger,
  onCreated,
}: {
  material?: Material;
  trigger?: ReactNode;
  /** Chamado uma vez, só no modo de criação, quando um novo material é salvo com sucesso. */
  onCreated?: (material: { id: string; name: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const action = material ? updateMaterialAction.bind(null, material.id) : createMaterialAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const handledCreatedId = useRef<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!pending && !state.error && open) setOpen(false);
    if (!pending && !material && state.created && state.created.id !== handledCreatedId.current) {
      handledCreatedId.current = state.created.id;
      onCreated?.(state.created);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={material ? "outline" : "default"} size={material ? "sm" : "default"}>
            {material ? "Editar" : "Novo material"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{material ? "Editar material" : "Novo material"}</DialogTitle>
          <DialogDescription>
            {material
              ? "Os fornecedores são vinculados pela tela de detalhe do material."
              : "O código interno é gerado automaticamente ao salvar. Os fornecedores são vinculados depois, pela tela de detalhe do material."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" ref={nameInputRef} defaultValue={material?.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {material ? (
              <div className="flex flex-col gap-1.5">
                <Label>Código interno</Label>
                <p className="flex h-9 items-center text-sm text-muted-foreground">
                  {material.internal_code}
                </p>
                <input type="hidden" name="internal_code" value={material.internal_code ?? ""} />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" name="category" defaultValue={material?.category ?? ""} />
            </div>
          </div>

          <TussMaterialField
            defaultCode={material?.tuss_code}
            defaultQuery={material?.name}
            defaultManufacturer={material?.manufacturer}
            defaultModel={material?.model}
            defaultAnvisaRegistration={material?.anvisa_registration}
            nameInputRef={nameInputRef}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit">Unidade de medida</Label>
            <Select name="unit" defaultValue={material?.unit ?? undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" defaultValue={material?.description ?? ""} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={material?.notes ?? ""} />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox name="active" value="on" defaultChecked={material ? material.active : true} />
            Material ativo
          </label>

          {state.error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
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
