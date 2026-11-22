import { cache } from "react";

import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Retorna o usuário autenticado (ou null). Usar em Server Components /
 * Server Actions que precisam saber quem está logado.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type CurrentAccess = {
  roleId: string;
  roleName: string;
  /** Conjunto de "módulo:ação" (ex: "financial:view") que a role do
   * usuário libera. */
  permissions: Set<string>;
};

/**
 * Carrega a role e as permissões do usuário logado. Usa o cliente service
 * role porque roles/permissions/role_permissions/user_roles não têm
 * policy de RLS pra `authenticated` (ver migration 0017) — só esse
 * cliente consegue ler essas tabelas, e esta função só deve ser chamada
 * em código server-side de confiança (Server Component, Server Action,
 * Route Handler), nunca exposta a uma rota que o navegador chame
 * diretamente.
 *
 * Retorna `null` quando o usuário autenticado não tem nenhuma role
 * atribuída (ex: acesso revogado) — quem chama trata isso como "sem
 * acesso nenhum".
 */
export const getCurrentAccess = cache(async (userId: string): Promise<CurrentAccess | null> => {
  const admin = createAdminClient();

  // Uma única consulta aninhada (user_roles -> roles -> role_permissions
  // -> permissions) em vez de duas em sequência: cada ida ao banco custa
  // uma viagem de rede, e isto roda em toda troca de tela. `cache()` do
  // React ainda evita repetir a consulta quando layout, guard da página e
  // a própria página pedem o acesso na mesma requisição.
  const { data: userRole, error } = await admin
    .from("user_roles")
    .select("role_id, role:roles(name, role_permissions(permission:permissions(module, action)))")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!userRole) return null;

  const role = userRole.role as unknown as {
    name: string;
    role_permissions: { permission: { module: string; action: string } | null }[];
  } | null;

  const permissions = new Set(
    (role?.role_permissions ?? [])
      .map((rp) => rp.permission)
      .filter((p): p is { module: string; action: string } => p != null)
      .map((p) => `${p.module}:${p.action}`)
  );

  return {
    roleId: userRole.role_id,
    roleName: role?.name ?? "",
    permissions,
  };
});

/**
 * Checagem de permissão — camada 2 de defesa (a 1ª é a navegação/UI, a 3ª
 * é o banco, que nega leitura/escrita das tabelas de governança pra quem
 * não usa o cliente service role). "create"/"edit"/"delete"/"approve"
 * mapeiam todos pra permissão "edit" do módulo — o grid de permissões só
 * tem "Visualizar"/"Editar" por módulo (ver migration 0017), não as 5
 * ações originais.
 */
export async function hasPermission(
  user: { id: string } | null,
  module: string,
  action: "view" | "create" | "edit" | "delete" | "approve"
): Promise<boolean> {
  if (!user) return false;
  const access = await getCurrentAccess(user.id);
  if (!access) return false;
  const normalizedAction = action === "view" ? "view" : "edit";
  return access.permissions.has(`${module}:${normalizedAction}`);
}
