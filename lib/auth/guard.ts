import { redirect } from "next/navigation";

import { getCurrentUser, hasPermission } from "@/lib/auth/session";

/**
 * Bloqueia o acesso à página se o usuário logado não tiver permissão de
 * visualização no módulo — chamar no topo de cada página de módulo
 * (camada 2 de defesa: a 1ª é a navegação, que já esconde o link pra
 * quem não tem a permissão; a 3ª é o banco). Sem isso, digitar a URL
 * direto contornaria a navegação escondida.
 */
export async function requireModuleView(module: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const allowed = await hasPermission(user, module, "view");
  if (!allowed) redirect("/sem-acesso");
}

/** Mesma ideia, mas pra páginas de criação/edição (ex: nova cirurgia) —
 * exige a permissão "edit" do módulo, não só "view". */
export async function requireModuleEdit(module: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const allowed = await hasPermission(user, module, "edit");
  if (!allowed) redirect("/sem-acesso");
}

/**
 * Verificação de permissão pra usar DENTRO de Server Actions (não em
 * páginas). `requireModuleView`/`requireModuleEdit` acima fazem
 * `redirect()`, o que é certo pra uma página, mas uma Server Action pode
 * ser chamada direto (sem passar pela página/guard dela), então cada
 * ação que grava ou lê dado sensível precisa checar de novo aqui —
 * a tela escondendo o botão não é proteção (ver auditoria de segurança).
 * Lança erro (não redireciona) pra cada action capturar com seu try/catch
 * e devolver o estado de erro genérico já usado no padrão existente.
 */
export async function requireActionPermission(module: string, action: "view" | "edit" = "edit") {
  const user = await getCurrentUser();
  if (!user) throw new Error("forbidden");
  const allowed = await hasPermission(user, module, action);
  if (!allowed) throw new Error("forbidden");
  return user;
}
