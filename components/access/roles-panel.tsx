"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import {
  createRoleAction,
  deleteRoleAction,
  setRolePermissionsAction,
  type UsersActionState,
} from "@/app/(dashboard)/settings/users/actions";
import type { Permission, RolePermissionMatrix } from "@/lib/data/access";
import { MODULE_LABELS, MODULE_ORDER } from "@/lib/access-modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteRowButton } from "@/components/shared/delete-row-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

function RolePermissionsCard({
  matrix,
  permissions,
}: {
  matrix: RolePermissionMatrix;
  permissions: Permission[];
}) {
  const [granted, setGranted] = useState(matrix.granted);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isAdmin = matrix.role.name === "admin_full_access";

  function toggle(key: string) {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const ids = permissions
        .filter((p) => granted.has(`${p.module}:${p.action}`))
        .map((p) => p.id);
      const result = await setRolePermissionsAction(matrix.role.id, matrix.role.name, ids);
      if (result.error) setError(result.error);
    });
  }

  const byModule = new Map<string, Permission[]>();
  for (const p of permissions) {
    const list = byModule.get(p.module) ?? [];
    list.push(p);
    byModule.set(p.module, list);
  }
  const modules = Array.from(byModule.keys()).sort(
    (a, b) => MODULE_ORDER.indexOf(a) - MODULE_ORDER.indexOf(b)
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {isAdmin ? "Acesso total" : matrix.role.name}
          </p>
          {matrix.role.description ? (
            <p className="text-xs text-muted-foreground">{matrix.role.description}</p>
          ) : null}
        </div>
        {!isAdmin ? (
          <DeleteRowButton
            onDelete={() => deleteRoleAction(matrix.role.id, matrix.role.name)}
            confirmMessage={`Excluir a função "${matrix.role.name}"? Só funciona se nenhum usuário ou convite estiver usando ela.`}
          />
        ) : null}
      </div>

      {isAdmin ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Sempre tem acesso a todos os módulos — não é editável.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {modules.map((module) => (
              <div key={module} className="flex flex-col gap-1 rounded-md border border-border p-2">
                <span className="text-xs font-medium text-foreground">
                  {MODULE_LABELS[module] ?? module}
                </span>
                {(byModule.get(module) ?? []).map((p) => (
                  <label key={p.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox
                      checked={granted.has(`${p.module}:${p.action}`)}
                      onCheckedChange={() => toggle(`${p.module}:${p.action}`)}
                    />
                    {p.action === "view" ? "Visualizar" : "Editar"}
                  </label>
                ))}
              </div>
            ))}
          </div>
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
          <Button size="sm" className="mt-3" disabled={pending} onClick={save}>
            {pending ? "Salvando..." : "Salvar permissões"}
          </Button>
        </>
      )}
    </div>
  );
}

const initialRoleState: UsersActionState = {};

function NewRoleDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createRoleAction, initialRoleState);

  useEffect(() => {
    if (!pending && !state.error && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fecha o dialog só depois do submit ter sucesso
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Nova função
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova função de acesso</DialogTitle>
          <DialogDescription>
            Depois de criada, defina quais módulos ela pode visualizar/editar na lista abaixo.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" placeholder="Ex: secretaria" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" name="description" placeholder="Ex: Agenda e cirurgias, sem financeiro" />
          </div>
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Criando..." : "Criar função"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RolesPanel({
  matrix,
  permissions,
}: {
  matrix: RolePermissionMatrix[];
  permissions: Permission[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-foreground">Funções e permissões</h2>
        <NewRoleDialog />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {matrix.map((m) => (
          <RolePermissionsCard key={m.role.id} matrix={m} permissions={permissions} />
        ))}
      </div>
    </div>
  );
}
