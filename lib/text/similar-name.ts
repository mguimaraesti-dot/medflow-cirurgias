const STOP = new Set(["de", "da", "do", "das", "dos", "e", "com", "para", "por", "em", "a", "o", "um", "uma"]);

function tokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

/**
 * Indica se dois nomes de material parecem ser o MESMO produto cadastrado duas
 * vezes (ex.: "Fio guia" e "Fio guia Roadrunner Extra Suporte"): todas as
 * palavras do nome mais curto aparecem no mais longo. Só serve para avisar o
 * usuário; nunca vincula nada sozinho.
 */
export function looksLikeSameProduct(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.every((t) => long.some((l) => l === t || l.startsWith(t) || t.startsWith(l)));
}
