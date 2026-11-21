/**
 * Consulta às tabelas TUSS da ANS via a plataforma pública (base OCL -
 * Open Concept Lab), sem necessidade de autenticação:
 *
 *   GET https://consulta-ocl.apps.sa-1a.mendixcloud.com/rest/oclservice/ANS/concepts/<tabela>?q=<termo>&page=1
 *
 * Duas tabelas usadas no sistema:
 *   - tuss-22: procedimentos e eventos em saúde.
 *   - tuss-19: materiais, órteses, próteses e materiais especiais (OPME) —
 *     os itens dessa tabela costumam já vir com fabricante, modelo, classe
 *     de risco e registro ANVISA preenchidos pela própria ANS.
 *
 * Retorna um array de conceitos como:
 *   { "id": "40201082", "source": "tuss-22", "display_name": "Colonoscopia (inclui a retossigmoidoscopia)",
 *     "extras": { "fim_vigencia": "-", ... } }
 *
 * "fim_vigencia": "-" significa que o código ainda está vigente; qualquer
 * outro valor indica que foi descontinuado/substituído.
 */

const TUSS_BASE_URL = "https://consulta-ocl.apps.sa-1a.mendixcloud.com/rest/oclservice/ANS/concepts";

export type TussTable = "tuss-22" | "tuss-19";

export type TussResult = {
  code: string;
  name: string;
  active: boolean;
  /** Só preenchido pra tuss-19 (materiais/OPME), quando a ANS informa. */
  manufacturer?: string;
  model?: string;
  anvisaRegistration?: string;
  riskClass?: string;
};

type TussApiItem = {
  id: string;
  display_name: string;
  extras?: {
    fim_vigencia?: string;
    fabricante?: string;
    modelo?: string;
    registro_anvisa?: string;
    classe_risco?: string;
  };
};

const NOT_APPLICABLE = "NÃO SE APLICA";

function cleanExtra(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === NOT_APPLICABLE) return undefined;
  return trimmed;
}

// Cache em memória (por instância/lambda "quente" da Vercel) para evitar
// repetir a mesma consulta lenta várias vezes em pouco tempo — útil porque
// vários usuários tendem a buscar os mesmos termos comuns (ex: "endoscopia").
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const cache = new Map<string, { expires: number; results: TussResult[] }>();

/** Busca 1 termo na API da ANS (com cache) — bloco de montagem da busca
 * "ampla" abaixo, que dispara isso várias vezes em paralelo. */
async function fetchTussPage(table: TussTable, term: string): Promise<TussResult[]> {
  const trimmed = term.trim();
  if (trimmed.length < 3) return [];

  const cacheKey = `${table}:${trimmed.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.results;
  }

  // A base da ANS pode demorar bastante (observado ~8-15s em termos mais
  // genéricos), então damos uma margem generosa antes de desistir. Usa um
  // AbortController próprio (em vez de AbortSignal.timeout) pra poder
  // cancelar o timer assim que a resposta chegar — com buscas em paralelo
  // (busca ampla + variações de acento), um timer que não é limpo pode
  // disparar um abort "fantasma" depois que a requisição já terminou, e
  // isso vira uma promise rejeitada sem ninguém ouvindo (derruba o
  // processo do servidor).
  const url = `${TUSS_BASE_URL}/${table}?q=${encodeURIComponent(trimmed)}&page=1`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Tabela TUSS (ANS) respondeu ${response.status}`);
  }

  const data = (await response.json()) as TussApiItem[];
  if (!Array.isArray(data)) return [];

  const results = data
    .filter((item) => item.id && item.display_name)
    .map((item) => ({
      code: item.id,
      name: item.display_name.trim(),
      active: !item.extras?.fim_vigencia || item.extras.fim_vigencia === "-",
      manufacturer: cleanExtra(item.extras?.fabricante),
      model: cleanExtra(item.extras?.modelo),
      anvisaRegistration: cleanExtra(item.extras?.registro_anvisa),
      riskClass: cleanExtra(item.extras?.classe_risco),
    }));

  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, results });
  return results;
}

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas",
  "para", "com", "sem", "a", "o", "as", "os", "por", "ao", "aos", "um", "uma",
]);

/** Remove acentos e normaliza caixa, pra comparar "próteses" com "proteses". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** As palavras "de verdade" de uma busca (ignora preposições curtas e
 * palavras com menos de 3 letras), sem repetição, no máximo 3 — pra não
 * disparar buscas demais em paralelo na base da ANS. */
function significantTokens(query: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const word of query.split(/[^\p{L}\p{N}]+/u)) {
    if (word.length < 3) continue;
    const key = normalize(word);
    if (STOPWORDS.has(key) || seen.has(key)) continue;
    seen.add(key);
    tokens.push(word);
    if (tokens.length >= 3) break;
  }
  return tokens;
}

/**
 * A busca da ANS é sensível a acento (e maiúsculo/minúsculo, mas isso ela
 * já ignora sozinha): buscar "protese" não acha nada escrito "Prótese", e
 * vice-versa — confirmado testando contra a base real. Como a API aceita
 * "?" como curinga de 1 caractere (até 2 por busca — testado: um 3º
 * curinga zera os resultados), geramos variações do termo com pares de
 * vogais (e "c" que poderia ser "ç", já que em português "ç" só aparece
 * antes de a/o/u) trocados por "?", cobrindo toda vogal da palavra em
 * pelo menos 1 variação — pra achar o item não importa se o nome oficial
 * tem acento/cedilha e a busca não (ou o contrário).
 */
function accentWildcardVariants(term: string): string[] {
  const lower = term.toLowerCase();
  const positions: number[] = [];
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    const isVowel = ch === "a" || ch === "e" || ch === "i" || ch === "o" || ch === "u";
    const isMaybeCedilla = ch === "c" && "aou".includes(lower[i + 1] ?? "");
    if (isVowel || isMaybeCedilla) positions.push(i);
  }

  const variants: string[] = [];
  for (let i = 0; i < positions.length; i += 2) {
    const chars = term.split("");
    for (const pos of positions.slice(i, i + 2)) chars[pos] = "?";
    variants.push(chars.join(""));
  }
  return variants;
}

/**
 * Busca "ampla" na base da ANS: além da frase completa digitada, busca
 * também cada palavra significativa separadamente, mais variações com
 * curinga no lugar de vogais/cedilha (pra não depender do usuário acertar
 * os acentos) — e junta tudo. A base da ANS não lida bem com buscas de
 * várias palavras — "fio guia roadrunner" pode não achar nada mesmo
 * quando "fio guia" ou "roadrunner" sozinhos acham — e com milhares de
 * itens na tabela, a ordem que a ANS devolve nem sempre traz o mais
 * provável primeiro. Por isso os resultados juntados são reordenados por
 * relevância (quantas palavras da busca aparecem no nome do item, frase
 * exata primeiro, acentos e caixa ignorados) antes de voltar pra tela.
 */
async function searchTuss(table: TussTable, query: string): Promise<TussResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const tokens = significantTokens(trimmed);
  // Cada termo-base (frase completa + cada palavra) ganha sua própria cota
  // de variações com curinga — em vez de um teto global só pra tudo, que
  // na prática era consumido inteiro pelas primeiras vogais da primeira
  // palavra, deixando palavras mais pra frente (ex: "pancreática" em
  // "protese pancreatica") sem nenhuma variação testada.
  const baseTerms = Array.from(new Set([trimmed, ...tokens]));
  const wildcardTerms = Array.from(new Set(baseTerms.flatMap((term) => accentWildcardVariants(term))));
  const searchTerms = Array.from(new Set([...baseTerms, ...wildcardTerms]));

  const settled = await Promise.allSettled(searchTerms.map((term) => fetchTussPage(table, term)));
  const pages = settled
    .filter((s): s is PromiseFulfilledResult<TussResult[]> => s.status === "fulfilled")
    .map((s) => s.value);

  if (pages.length === 0) {
    const firstRejected = settled.find((s): s is PromiseRejectedResult => s.status === "rejected");
    if (firstRejected) throw firstRejected.reason;
    return [];
  }

  const byCode = new Map<string, TussResult>();
  for (const page of pages) {
    for (const item of page) {
      if (!byCode.has(item.code)) byCode.set(item.code, item);
    }
  }

  const normalizedQuery = normalize(trimmed);
  const normalizedTokens = tokens.map(normalize);

  function relevance(item: TussResult): number {
    const normalizedName = normalize(item.name);
    let score = 0;
    if (normalizedName.includes(normalizedQuery)) score += 1000;
    for (const token of normalizedTokens) {
      if (normalizedName.includes(token)) score += 10;
    }
    if (item.active) score += 2;
    return score;
  }

  return Array.from(byCode.values())
    .map((item) => ({ item, score: relevance(item) }))
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, "pt-BR"))
    .slice(0, 30)
    .map(({ item }) => item);
}

export function searchTussProcedures(query: string): Promise<TussResult[]> {
  return searchTuss("tuss-22", query);
}

export function searchTussMaterials(query: string): Promise<TussResult[]> {
  return searchTuss("tuss-19", query);
}
