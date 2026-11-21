import { createAdminClient } from "@/lib/supabase/server";

/**
 * Camada de dados do controle de acesso (roles, permissões, convites e
 * usuários). Usa sempre o cliente service role — roles, permissions,
 * role_permissions, user_roles e allowed_users não têm policy de RLS pra
 * `authenticated` (ver migration 0017), de propósito: só rotinas
 * server-side de confiança (esta aqui, e lib/auth/session.ts) tocam essas
 * tabelas. Toda função aqui deve ser chamada só depois de confirmar (via
 * hasPermission) que quem está pedindo tem permissão de "users".
 */

export type Role = {
  id: string;
  name: string;
  description: string | null;
};

export type Permission = {
  id: string;
  module: string;
  action: "view" | "edit";
};

export type RolePermissionMatrix = {
  role: Role;
  /** "módulo:ação" das permissões que essa role tem hoje. */
  granted: Set<string>;
};

export async function listRoles(): Promise<Role[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("roles").select("id,name,description").order("name");
  if (error) throw error;
  return data as Role[];
}

export async function listPermissions(): Promise<Permission[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("permissions")
    .select("id,module,action")
    .order("module");
  if (error) throw error;
  return data as Permission[];
}

/** Matriz role × permissões concedidas, pra tela de gerenciamento. */
export async function listRolePermissionMatrix(): Promise<RolePermissionMatrix[]> {
  const admin = createAdminClient();
  const [{ data: roles, error: rolesError }, { data: links, error: linksError }] = await Promise.all([
    admin.from("roles").select("id,name,description").order("name"),
    admin.from("role_permissions").select("role_id,permission:permissions(module,action)"),
  ]);
  if (rolesError) throw rolesError;
  if (linksError) throw linksError;

  const grantedByRole = new Map<string, Set<string>>();
  for (const link of links ?? []) {
    const perm = link.permission as unknown as { module: string; action: string } | null;
    if (!perm) continue;
    const set = grantedByRole.get(link.role_id) ?? new Set<string>();
    set.add(`${perm.module}:${perm.action}`);
    grantedByRole.set(link.role_id, set);
  }

  return (roles as Role[]).map((role) => ({
    role,
    granted: grantedByRole.get(role.id) ?? new Set<string>(),
  }));
}

/** Retorna o id da função criada — usado quando o convite cria a função
 * na hora, em vez de reaproveitar uma já existente. */
export async function createRole(name: string, description?: string | null): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("roles")
    .insert({ name, description: description ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteRole(roleId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("roles").delete().eq("id", roleId);
  if (error) throw error;
}

/**
 * Substitui todas as permissões concedidas a uma role pela lista
 * informada (ids de `permissions`) — usado pelo grid de checkboxes da
 * tela de gerenciamento.
 */
export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("role_permissions").delete().eq("role_id", roleId);
  if (deleteError) throw deleteError;

  if (permissionIds.length === 0) return;

  const rows = permissionIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId }));
  const { error: insertError } = await admin.from("role_permissions").insert(rows);
  if (insertError) throw insertError;
}

export type AllowedUserInvite = {
  email: string;
  role_id: string;
  created_at: string;
  role: { name: string } | null;
};

export type ActiveUser = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  role_id: string | null;
  role_name: string | null;
};

/** Convites pendentes (e-mail já liberado, ainda não fez o primeiro login). */
export async function listPendingInvites(): Promise<AllowedUserInvite[]> {
  const admin = createAdminClient();
  const { data: invites, error } = await admin
    .from("allowed_users")
    .select("email,role_id,created_at,role:roles(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: profiles, error: profilesError } = await admin.from("profiles").select("email");
  if (profilesError) throw profilesError;
  const activeEmails = new Set((profiles ?? []).map((p) => p.email.toLowerCase()));

  return (invites as unknown as AllowedUserInvite[]).filter(
    (i) => !activeEmails.has(i.email.toLowerCase())
  );
}

/** Usuários que já fizeram login pelo menos uma vez, com a role atual. */
export async function listActiveUsers(): Promise<ActiveUser[]> {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id,full_name,email,created_at")
    .order("full_name");
  if (error) throw error;

  const { data: userRoles, error: rolesError } = await admin
    .from("user_roles")
    .select("user_id,role_id,role:roles(name)");
  if (rolesError) throw rolesError;

  const roleByUser = new Map(
    (userRoles ?? []).map((ur) => [
      ur.user_id,
      { role_id: ur.role_id, role_name: (ur.role as unknown as { name: string } | null)?.name ?? null },
    ])
  );

  return (profiles ?? []).map((p) => ({
    ...p,
    role_id: roleByUser.get(p.id)?.role_id ?? null,
    role_name: roleByUser.get(p.id)?.role_name ?? null,
  }));
}

export async function inviteUser(email: string, roleId: string, invitedBy: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("allowed_users")
    .upsert({ email: email.toLowerCase().trim(), role_id: roleId, invited_by: invitedBy }, { onConflict: "email" });
  if (error) throw error;
}

export async function cancelInvite(email: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("allowed_users").delete().eq("email", email);
  if (error) throw error;
}

/** Troca a role de um usuário que já tem conta. A chave primária de
 * user_roles é composta (user_id, role_id) — sem unique só em user_id —,
 * então troca é "apaga a(s) role(s) atual(is) e insere a nova", não um
 * upsert direto. */
export async function changeUserRole(userId: string, roleId: string): Promise<void> {
  const admin = createAdminClient();
  const { error: deleteError } = await admin.from("user_roles").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await admin.from("user_roles").insert({ user_id: userId, role_id: roleId });
  if (insertError) throw insertError;
}

/**
 * Revoga o acesso de um usuário que já tem conta: apaga o usuário do
 * Supabase Auth (cascade apaga profiles/user_roles) e remove o convite,
 * pra não voltar a entrar sozinho. Mais decisivo que só tirar a role —
 * sistema lida com dados de paciente, então "acesso revogado" precisa
 * significar "não consegue mais nem logar".
 */
export async function revokeUserAccess(userId: string, email: string): Promise<void> {
  const admin = createAdminClient();
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError) throw deleteUserError;

  const { error: deleteInviteError } = await admin.from("allowed_users").delete().eq("email", email);
  if (deleteInviteError) throw deleteInviteError;
}
