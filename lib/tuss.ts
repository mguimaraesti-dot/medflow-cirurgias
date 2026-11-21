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

  // A base da ANS pode demorar (observado de ~1s a ~10s dependendo do
  // termo) e, raramente, travar bem mais — 12s já é uma margem generosa
  // sem deixar 1 termo lento travar a busca inteira por 20s. Como a busca
  // dispara vários termos em paralelo (frase completa + cada palavra),
  // se só esse 1 der timeout os outros ainda garantem resultado. Usa um
  // AbortController próprio (em vez de AbortSignal.timeout) pra poder
  // cancelar o timer assim que a resposta chegar — com buscas em paralelo
  // (busca ampla + variações de acento), um timer que não é limpo pode
  // disparar um abort "fantasma" depois que a requisição já terminou, e
  // isso vira uma promise rejeitada sem ninguém ouvindo (derruba o
  // processo do servidor).
  const url = `${TUSS_BASE_URL}/${table}?q=${encodeURIComponent(trimmed)}&page=1`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
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

/** Dispara várias buscas em paralelo e devolve as páginas que deram certo
 * (ignora as que falharam) — e se TODAS falharem, o primeiro erro, pra
 * quem chama decidir se propaga ou segue com o que já tem. */
async function fetchTussPages(
  table: TussTable,
  terms: string[]
): Promise<{ pages: TussResult[][]; error: unknown }> {
  const settled = await Promise.allSettled(terms.map((term) => fetchTussPage(table, term)));
  const pages = settled
    .filter((s): s is PromiseFulfilledResult<TussResult[]> => s.status === "fulfilled")
    .map((s) => s.value);
  const firstRejected = settled.find((s): s is PromiseRejectedResult => s.status === "rejected");
  return { pages, error: firstRejected?.reason };
}

/** Junta, remove duplicados e reordena por relevância (quantas palavras
 * da busca aparecem no nome do item, frase exata primeiro, acentos e
 * caixa ignorados) — a ordem que a ANS devolve nem sempre traz o mais
 * provável primeiro, ainda mais com milhares de itens na tabela. */
function rankResults(pages: TussResult[][], trimmed: string, tokens: string[]): TussResult[] {
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

/** Já achou o suficiente sem precisar da 2ª rodada (mais lenta, com
 * variações de acento)? Considera "suficiente" ter uma lista com um bom
 * tanto de opções, ou já ter achado algo com o termo exato digitado. */
function isGoodEnough(ranked: TussResult[], trimmed: string): boolean {
  if (ranked.length >= 8) return true;
  const normalizedQuery = normalize(trimmed);
  return ranked.some((item) => normalize(item.name).includes(normalizedQuery));
}

/**
 * Busca "ampla" na base da ANS, em 2 rodadas pra não deixar toda busca
 * lenta por causa de um caso específico:
 *
 * 1ª rodada (rápida): a frase completa digitada + cada palavra
 * significativa separadamente — a base da ANS não lida bem com buscas de
 * várias palavras ("fio guia roadrunner" pode não achar nada mesmo
 * quando "fio guia" ou "roadrunner" sozinhos acham), então já busca os 2
 * jeitos. Se isso já trouxer um resultado bom, para por aqui.
 *
 * 2ª rodada (só quando a 1ª veio fraca/vazia): variações com curinga no
 * lugar de vogais/cedilha, pra achar o item mesmo quando a busca ou o
 * nome oficial tem acento e o outro não (confirmado testando contra a
 * base real: buscar "protese" não achava nada escrito "Prótese"). Mais
 * lenta (bem mais requisições em paralelo), então só roda quando precisa.
 */
async function searchTuss(table: TussTable, query: string): Promise<TussResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const tokens = significantTokens(trimmed);
  const baseTerms = Array.from(new Set([trimmed, ...tokens]));

  const base = await fetchTussPages(table, baseTerms);
  if (base.pages.length === 0) {
    if (base.error) throw base.error;
    return [];
  }

  const baseRanked = rankResults(base.pages, trimmed, tokens);
  if (isGoodEnough(baseRanked, trimmed)) return baseRanked;

  const wildcardTerms = Array.from(new Set(baseTerms.flatMap((term) => accentWildcardVariants(term))));
  const wildcard = await fetchTussPages(table, wildcardTerms);
  return rankResults([...base.pages, ...wildcard.pages], trimmed, tokens);
}

export function searchTussProcedures(query: string): Promise<TussResult[]> {
  return searchTuss("tuss-22", query);
}

export function searchTussMaterials(query: string): Promise<TussResult[]> {
  return searchTuss("tuss-19", query);
}
