"use client";

import { useTransition } from "react";

import { DeleteRowButton } from "@/components/shared/delete-row-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeUserRoleAction, revokeUserAccessAction } from "@/app/(dashboard)/settings/users/actions";
import type { ActiveUser, Role } from "@/lib/data/access";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function roleLabel(role: Role | undefined) {
  if (!role) return "Sem função";
  return role.name === "admin_full_access" ? "Acesso total" : role.name;
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
  const columns: SortableColumn<ActiveUser>[] = [
    {
      key: "name",
      label: "Nome",
      accessor: (user) => user.full_name,
      cell: (user) => <span className="text-foreground">{user.full_name}</span>,
    },
    {
      key: "email",
      label: "E-mail",
      accessor: (user) => user.email,
      cell: (user) => <span className="text-muted-foreground">{user.email}</span>,
    },
    {
      key: "role",
      label: "Função",
      accessor: (user) => roleLabel(roles.find((r) => r.id === user.role_id)),
      cell: (user) => <RoleSelectCell user={user} roles={roles} />,
    },
    {
      key: "created_at",
      label: "Desde",
      accessor: (user) => user.created_at,
      cell: (user) => <span className="text-muted-foreground">{formatDate(user.created_at)}</span>,
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      cell: (user) =>
        user.id === currentUserId ? (
          <span className="text-xs text-muted-foreground">Você</span>
        ) : (
          <DeleteRowButton
            onDelete={() => revokeUserAccessAction(user.id, user.email)}
            confirmMessage={`Revogar o acesso de ${user.full_name} (${user.email})? A conta Google dela deixa de conseguir entrar.`}
          />
        ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={users}
        rowKey={(user) => user.id}
        emptyMessage="Nenhum usuário com acesso ainda."
      />
    </div>
  );
}
