"use client";

import { useActionState, useEffect, useState } from "react";

import { inviteUserAction, type UsersActionState } from "@/app/(dashboard)/settings/users/actions";
import type { Permission, Role } from "@/lib/data/access";
import { MODULE_LABELS, MODULE_ORDER } from "@/lib/access-modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const initialState: UsersActionState = {};

export function InviteUserDialog({ roles, permissions }: { roles: Role[]; permissions: Permission[] }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">(roles.length > 0 ? "existing" : "new");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [state, formAction, pending] = useActionState(inviteUserAction, initialState);

  useEffect(() => {
    if (!pending && !state.error && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fecha o dialog só depois do convite ter sucesso
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state]);

  function togglePermission(id: string) {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Convidar usuário</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convidar usuário</DialogTitle>
          <DialogDescription>
            A pessoa só consegue entrar com Google usando exatamente esse e-mail — qualquer outro é
            bloqueado.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail (Google) *</Label>
            <Input id="email" name="email" type="email" placeholder="nome@gmail.com" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Funcionalidades que essa pessoa vai ter *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "existing" ? "default" : "outline"}
                onClick={() => setMode("existing")}
                disabled={roles.length === 0}
              >
                Usar função existente
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "new" ? "default" : "outline"}
                onClick={() => setMode("new")}
              >
                Marcar funcionalidades agora
              </Button>
            </div>
          </div>

          <input type="hidden" name="mode" value={mode} />

          {mode === "existing" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role_id">Função</Label>
              <Select name="role_id">
                <SelectTrigger id="role_id">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name === "admin_full_access" ? "Acesso total" : r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new_role_name">Nome da função *</Label>
                  <Input
                    id="new_role_name"
                    name="new_role_name"
                    placeholder="Ex: secretaria"
                    required={mode === "new"}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new_role_description">Descrição</Label>
                  <Input id="new_role_description" name="new_role_description" placeholder="Opcional" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Módulos que essa função pode acessar</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {modules.map((module) => (
                    <div key={module} className="flex flex-col gap-1 rounded-md border border-border p-2">
                      <span className="text-xs font-medium text-foreground">
                        {MODULE_LABELS[module] ?? module}
                      </span>
                      {(byModule.get(module) ?? []).map((p) => (
                        <label key={p.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Checkbox
                            checked={selectedPermissions.has(p.id)}
                            onCheckedChange={() => togglePermission(p.id)}
                          />
                          {p.action === "view" ? "Visualizar" : "Editar"}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              {Array.from(selectedPermissions).map((id) => (
                <input key={id} type="hidden" name="permission_ids" value={id} />
              ))}
            </>
          )}

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Convidando..." : "Convidar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
