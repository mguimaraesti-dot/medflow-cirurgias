import { createClient } from "@/lib/supabase/server";

/**
 * Retorna o usuário autenticado (ou null). Usar em Server Components /
 * Server Actions que precisam saber quem está logado.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Checagem de permissão — camada 2 de defesa (a 1ª é a UI, a 3ª é RLS no
 * Postgres). Hoje existe um único perfil com acesso total (ver
 * docs/ARCHITECTURE.md, seção "Permissões"), então qualquer usuário
 * autenticado tem `true` para tudo. Quando os perfis de visualização/edição
 * forem criados, esta função passa a consultar `role_permissions` no banco
 * em vez de retornar um valor fixo — e todo o resto do código que já chama
 * `hasPermission(...)` não precisa mudar.
 */
export async function hasPermission(
  user: { id: string } | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _module: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _action: "view" | "create" | "edit" | "delete" | "approve"
): Promise<boolean> {
  if (!user) return false;
  return true;
}
