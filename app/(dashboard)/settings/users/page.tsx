import { requireModuleView } from "@/lib/auth/guard";
import { getCurrentUser } from "@/lib/auth/session";
import { listRoles, listRolePermissionMatrix, listPermissions, listPendingInvites, listActiveUsers } from "@/lib/data/access";
import { InviteUserDialog } from "@/components/access/invite-user-dialog";
import { PendingInvitesTable } from "@/components/access/pending-invites-table";
import { ActiveUsersTable } from "@/components/access/active-users-table";
import { RolesPanel } from "@/components/access/roles-panel";

export default async function UsersPage() {
  await requireModuleView("users");
  const user = await getCurrentUser();

  const [roles, matrix, permissions, invites, activeUsers] = await Promise.all([
    listRoles(),
    listRolePermissionMatrix(),
    listPermissions(),
    listPendingInvites(),
    listActiveUsers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium text-foreground">Usuários</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Login é só com Google — convide pelo e-mail que a pessoa usa no Google e escolha a
          função dela. Quem não estiver convidado aqui não consegue entrar, mesmo autenticando no
          Google.
        </p>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-foreground">Convites pendentes</h2>
          <InviteUserDialog roles={roles} permissions={permissions} />
        </div>
        <div className="mt-3">
          <PendingInvitesTable invites={invites} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-foreground">Usuários com acesso</h2>
        <div className="mt-3">
          <ActiveUsersTable users={activeUsers} roles={roles} currentUserId={user?.id ?? ""} />
        </div>
      </div>

      <RolesPanel matrix={matrix} permissions={permissions} />
    </div>
  );
}
