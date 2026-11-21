"use client";

import { useTransition } from "react";

import { EmptyRow } from "@/components/shared/empty-row";
import { DeleteRowButton } from "@/components/shared/delete-row-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeUserRoleAction, revokeUserAccessAction } from "@/app/(dashboard)/settings/users/actions";
import type { ActiveUser, Role } from "@/lib/data/access";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function RoleSelectCell({ user, roles }: { user: ActiveUser; roles: Role[] }) {
  const [pending, startTransition] = useTransition();

  function handleChange(roleId: string) {
    const formData = new FormData();
    formData.set("user_id", user.id);
    formData.set("role_id", roleId);
    startTransition(async () => {
      const result = await changeUserRoleAction({}, formData);
      if (result.error && typeof window !== "undefined") window.alert(result.error);
    });
  }

  return (
    <Select value={user.role_id ?? undefined} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Sem função" />
      </SelectTrigger>
      <SelectContent>
        {roles.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name === "admin_full_access" ? "Acesso total" : r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ActiveUsersTable({
  users,
  roles,
  currentUserId,
}: {
  users: ActiveUser[];
  roles: Role[];
  currentUserId: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">E-mail</th>
            <th className="px-4 py-3">Função</th>
            <th className="px-4 py-3">Desde</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.length === 0 ? (
            <EmptyRow colSpan={5} message="Nenhum usuário com acesso ainda." />
          ) : (
            users.map((user) => (
              <tr key={user.id} className="hover:bg-muted">
                <td className="px-4 py-3 text-foreground">{user.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  <RoleSelectCell user={user} roles={roles} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  {user.id === currentUserId ? (
                    <span className="text-xs text-muted-foreground">Você</span>
                  ) : (
                    <DeleteRowButton
                      onDelete={() => revokeUserAccessAction(user.id, user.email)}
                      confirmMessage={`Revogar o acesso de ${user.full_name} (${user.email})? A conta Google dela deixa de conseguir entrar.`}
                    />
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
