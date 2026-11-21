import { LAYOUT, PAGE } from "@/lib/pdf/theme";

/**
 * Pagina as linhas da tabela "na mão" (em vez de confiar no reflow
 * automático do @react-pdf/renderer) — garante, sem exceção, que:
 *   - o cabeçalho da tabela se repete no topo de toda página;
 *   - nenhuma linha é cortada ao meio entre páginas;
 *   - nunca sobra página em branco (o número de páginas é exatamente o
 *     necessário pra caber `rows.length` linhas).
 *
 * Importante: a altura de cada linha é estimada *por linha* (via
 * `estimateRowHeight`), não um valor fixo — células como "Paciente" e
 * "Procedimento" frequentemente quebram em 2-3 linhas com nomes/termos
 * longos, e um valor fixo baixo demais faz o conteúdo de uma página
 * "explícita" estourar fisicamente e o @react-pdf/renderer inserir uma
 * página extra automática no meio — nessa página automática o cabeçalho
 * da tabela NÃO se repete (só os elementos `fixed`), violando o
 * requisito de cabeçalho repetido. Empacotar por altura real evita isso.
 *
 * `firstPageExtraHeight` é o espaço ocupado só na 1ª página por conteúdo
 * que não se repete (ex.: os cards de indicadores) — raciocínio
 * detalhado em lib/pdf/surgeries-report-pdf.tsx.
 */
export function paginateRows<T>(
  rows: T[],
  estimateRowHeight: (row: T) => number,
  firstPageExtraHeight: number
): T[][] {
  const usableHeight = PAGE.height - PAGE.margin * 2 - LAYOUT.headerHeight - LAYOUT.footerHeight;

  const pages: T[][] = [];
  let cursor = 0;
  let isFirstPage = true;

  // Pelo menos 1 página sempre, mesmo sem nenhuma linha (relatório vazio
  // ainda mostra o cabeçalho da tabela + "nenhum registro").
  while (cursor < rows.length || isFirstPage) {
    const extraHeight = isFirstPage ? firstPageExtraHeight : 0;
    const available = usableHeight - extraHeight - LAYOUT.tableHeaderRowHeight;

    const chunk: T[] = [];
    let used = 0;
    let i = cursor;
    while (i < rows.length) {
      const rowHeight = estimateRowHeight(rows[i]);
      // Sempre cabe ao menos 1 linha por página, mesmo que ela sozinha
      // já exceda o espaço disponível (evita loop infinito com conteúdo
      // anormalmente grande).
      if (chunk.length > 0 && used + rowHeight > available) break;
      chunk.push(rows[i]);
      used += rowHeight;
      i += 1;
    }

    pages.push(chunk);
    cursor += chunk.length;
    isFirstPage = false;
    if (chunk.length === 0 && cursor >= rows.length) break;
  }

  return pages;
}
