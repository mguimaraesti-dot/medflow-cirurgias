/**
 * Consulta à tabela TUSS 22 (procedimentos e eventos em saúde) via a
 * plataforma pública da ANS (base OCL - Open Concept Lab), sem
 * necessidade de autenticação:
 *
 *   GET https://consulta-ocl.apps.sa-1a.mendixcloud.com/rest/oclservice/ANS/concepts/tuss-22?q=<termo>&page=1
 *
 * Retorna um array de conceitos como:
 *   { "id": "40201082", "source": "tuss-22", "display_name": "Colonoscopia (inclui a retossigmoidoscopia)",
 *     "extras": { "fim_vigencia": "-", ... } }
 *
 * "fim_vigencia": "-" significa que o código ainda está vigente; qualquer
 * outro valor indica que foi descontinuado/substituído.
 */

const TUSS_PROCEDURES_URL =
  "https://consulta-ocl.apps.sa-1a.mendixcloud.com/rest/oclservice/ANS/concepts/tuss-22";

export type TussResult = {
  code: string;
  name: string;
  active: boolean;
};

type TussApiItem = {
  id: string;
  display_name: string;
  extras?: { fim_vigencia?: string };
};

export async function searchTussProcedures(query: string): Promise<TussResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  // A base da ANS pode demorar bastante (observado ~8-15s em termos mais
  // genéricos), então damos uma margem generosa antes de desistir.
  const url = `${TUSS_PROCEDURES_URL}?q=${encodeURIComponent(trimmed)}&page=1`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Tabela TUSS (ANS) respondeu ${response.status}`);
  }

  const data = (await response.json()) as TussApiItem[];
  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => item.id && item.display_name)
    .map((item) => ({
      code: item.id,
      name: item.display_name.trim(),
      active: !item.extras?.fim_vigencia || item.extras.fim_vigencia === "-",
    }))
    .slice(0, 20);
}
