"use client";

import { useActionState, useEffect, useState } from "react";

import { inviteUserAction, type UsersActionState } from "@/app/(dashboard)/settings/users/actions";
import type { Role } from "@/lib/data/access";
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

const initialState: UsersActionState = {};

export function InviteUserDialog({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(inviteUserAction, initialState);

  useEffect(() => {
    if (!pending && !state.error && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fecha o dialog só depois do convite ter sucesso
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Convidar usuário</Button>
      </DialogTrigger>
      <DialogContent>
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
            <Label htmlFor="role_id">Função *</Label>
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
