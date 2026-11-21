"use client";

import { useActionState, useEffect, useState } from "react";

import { createTaskAction, updateTaskAction, type TaskFormState } from "@/app/(dashboard)/pending-tasks/actions";
import type { Task } from "@/lib/data/tasks";
import type { SurgerySelectOption } from "@/lib/data/surgeries";
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/validation/tasks";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/components/tasks/task-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const initialState: TaskFormState = {};

export function TaskFormDialog({
  task,
  surgeries,
  users,
}: {
  task?: Task;
  surgeries: SurgerySelectOption[];
  users: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const action = task ? updateTaskAction.bind(null, task.id) : createTaskAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (!pending && !state.error && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={task ? "outline" : "default"} size={task ? "sm" : "default"}>
          {task ? "Editar" : "Nova tarefa"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>
            Tarefas administrativas e alertas, ligados ou não a uma cirurgia específica.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" name="title" defaultValue={task?.title} required />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Categoria *</Label>
              <Select name="category" defaultValue={task?.category} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Prioridade</Label>
              <Select name="priority" defaultValue={task?.priority ?? "normal"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={task?.status ?? "open"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="surgery_id">Cirurgia relacionada</Label>
                <Select name="surgery_id" defaultValue={task?.surgery_id ?? undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    {surgeries.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code}
                        {s.patient ? ` — ${s.patient.full_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assigned_to">Atribuir a</Label>
                <Select name="assigned_to" defaultValue={task?.assigned_to ?? undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguém" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="due_date">Prazo</Label>
                <Input id="due_date" name="due_date" type="date" defaultValue={task?.due_date ?? ""} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-border pt-4">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" defaultValue={task?.description ?? ""} />
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
