"use client";

import { DeleteRowButton } from "@/components/shared/delete-row-button";
import { cancelInviteAction } from "@/app/(dashboard)/settings/users/actions";
import type { AllowedUserInvite } from "@/lib/data/access";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function roleLabel(invite: AllowedUserInvite) {
  return invite.role?.name === "admin_full_access" ? "Acesso total" : invite.role?.name ?? "—";
}

const columns: SortableColumn<AllowedUserInvite>[] = [
  {
    key: "email",
    label: "E-mail convidado",
    accessor: (invite) => invite.email,
    cell: (invite) => <span className="text-foreground">{invite.email}</span>,
  },
  {
    key: "role",
    label: "Função",
    accessor: (invite) => roleLabel(invite),
    cell: (invite) => <span className="text-muted-foreground">{roleLabel(invite)}</span>,
  },
  {
    key: "created_at",
    label: "Convidado em",
    accessor: (invite) => invite.created_at,
    cell: (invite) => <span className="text-muted-foreground">{formatDate(invite.created_at)}</span>,
  },
  {
    key: "actions",
    label: "",
    className: "text-right",
    cell: (invite) => (
      <DeleteRowButton
        onDelete={() => cancelInviteAction(invite.email)}
        confirmMessage={`Cancelar o convite de ${invite.email}?`}
      />
    ),
  },
];

export function PendingInvitesTable({ invites }: { invites: AllowedUserInvite[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={invites}
        rowKey={(invite) => invite.email}
        emptyMessage="Nenhum convite pendente."
      />
    </div>
  );
}
