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

async function searchTuss(table: TussTable, query: string): Promise<TussResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const cacheKey = `${table}:${trimmed.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.results;
  }

  // A base da ANS pode demorar bastante (observado ~8-15s em termos mais
  // genéricos), então damos uma margem generosa antes de desistir.
  const url = `${TUSS_BASE_URL}/${table}?q=${encodeURIComponent(trimmed)}&page=1`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: "application/json" },
  });

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
    }))
    .slice(0, 20);

  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, results });
  return results;
}

export function searchTussProcedures(query: string): Promise<TussResult[]> {
  return searchTuss("tuss-22", query);
}

export function searchTussMaterials(query: string): Promise<TussResult[]> {
  return searchTuss("tuss-19", query);
}
