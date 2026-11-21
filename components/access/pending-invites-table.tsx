import { EmptyRow } from "@/components/shared/empty-row";
import { DeleteRowButton } from "@/components/shared/delete-row-button";
import { cancelInviteAction } from "@/app/(dashboard)/settings/users/actions";
import type { AllowedUserInvite } from "@/lib/data/access";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function PendingInvitesTable({ invites }: { invites: AllowedUserInvite[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">E-mail convidado</th>
            <th className="px-4 py-3">Função</th>
            <th className="px-4 py-3">Convidado em</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invites.length === 0 ? (
            <EmptyRow colSpan={4} message="Nenhum convite pendente." />
          ) : (
            invites.map((invite) => (
              <tr key={invite.email} className="hover:bg-muted">
                <td className="px-4 py-3 text-foreground">{invite.email}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {invite.role?.name === "admin_full_access" ? "Acesso total" : invite.role?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(invite.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <DeleteRowButton
                    onDelete={() => cancelInviteAction(invite.email)}
                    confirmMessage={`Cancelar o convite de ${invite.email}?`}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
