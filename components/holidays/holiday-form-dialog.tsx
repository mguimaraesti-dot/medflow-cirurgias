"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";

import {
  createHolidayAction,
  updateHolidayAction,
  type HolidayFormState,
} from "@/app/(dashboard)/settings/holidays/actions";
import type { Holiday } from "@/lib/data/holidays";
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

const initialState: HolidayFormState = {};

export function HolidayFormDialog({ holiday, trigger }: { holiday?: Holiday; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<string>(holiday?.scope ?? "national");
  const action = holiday ? updateHolidayAction.bind(null, holiday.id) : createHolidayAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (!pending && !state.error && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={holiday ? "outline" : "default"} size={holiday ? "sm" : "default"}>
            {holiday ? "Editar" : "Novo feriado"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{holiday ? "Editar feriado" : "Novo feriado"}</DialogTitle>
          <DialogDescription>
            Exibido na Agenda como um destaque visual — nunca conta como cirurgia nem bloqueia
            agendamento.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" defaultValue={holiday?.name} required />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Data *</Label>
              <Input id="date" name="date" type="date" defaultValue={holiday?.date} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scope">Abrangência *</Label>
              <Select name="scope" value={scope} onValueChange={setScope}>
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">Nacional</SelectItem>
                  <SelectItem value="state">Estadual</SelectItem>
                  <SelectItem value="municipal">Municipal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scope !== "national" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="state">UF</Label>
                <Input id="state" name="state" maxLength={2} className="uppercase" defaultValue={holiday?.state ?? ""} />
              </div>
              {scope === "municipal" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" name="city" defaultValue={holiday?.city ?? ""} />
                </div>
              ) : null}
            </div>
          ) : null}

          {scope !== "national" ? (
            <p className="text-xs text-muted-foreground">
              Por ora a Agenda ainda não filtra feriados estaduais/municipais pelo hospital — eles
              aparecem pra todo mundo, já identificados por UF/cidade, até esse match automático
              existir.
            </p>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox name="is_facultative" value="on" defaultChecked={holiday?.is_facultative ?? false} />
            Ponto facultativo (não é feriado obrigatório)
          </label>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" defaultValue={holiday?.description ?? ""} />
          </div>

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
