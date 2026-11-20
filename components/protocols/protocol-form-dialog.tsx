"use client";

import { useActionState, useState } from "react";

import { createProtocolAction, type ProtocolFormState } from "@/app/(dashboard)/protocols/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const initialState: ProtocolFormState = {};

export function ProtocolFormDialog({
  procedures,
  hospitals,
}: {
  procedures: { id: string; name: string }[];
  hospitals: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createProtocolAction, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Novo protocolo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo protocolo de materiais</DialogTitle>
          <DialogDescription>
            A versão 1 (rascunho) é criada automaticamente — os itens são adicionados na tela do
            protocolo.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome do protocolo *</Label>
            <Input id="name" name="name" placeholder="Ex: Colecistectomia videolaparoscópica" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="procedure_id">Procedimento *</Label>
            <Select name="procedure_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o procedimento" />
              </SelectTrigger>
              <SelectContent>
                {procedures.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hospital_id">Hospital (opcional)</Label>
            <Select name="hospital_id">
              <SelectTrigger>
                <SelectValue placeholder="Protocolo geral (todos os hospitais)" />
              </SelectTrigger>
              <SelectContent>
                {hospitals.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Criando..." : "Criar protocolo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
