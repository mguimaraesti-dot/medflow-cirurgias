/**
 * Traduz o erro de exclusão do Postgres pra uma mensagem que a pessoa
 * entende. Código 23503 = violação de chave estrangeira (existe algo
 * vinculado a este registro) — nunca mostramos esse erro cru pro usuário.
 */
export function toDeleteErrorMessage(
  e: unknown,
  linkedToMessage: string,
  options?: { suggestDeactivate?: boolean }
): string {
  const code = (e as { code?: string } | null)?.code;
  if (code === "23503") {
    const suggestion =
      options?.suggestDeactivate === false ? "" : " Você pode inativar em vez de excluir.";
    return `Não é possível excluir: ${linkedToMessage}.${suggestion}`;
  }
  return "Não foi possível excluir. Tente novamente.";
}
