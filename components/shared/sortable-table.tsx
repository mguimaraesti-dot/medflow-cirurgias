"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyRow } from "@/components/shared/empty-row";

export type SortDirection = "asc" | "desc";

export type SortableColumn<T> = {
  /** Chave única da coluna; usada para identificar o critério de ordenação ativo. */
  key: string;
  label: ReactNode;
  /** Classe aplicada no <th> e em cada <td> dessa coluna. */
  className?: string;
  /**
   * Valor usado para comparar linhas ao ordenar por essa coluna. Colunas sem
   * accessor (ex.: coluna de ações, sem título) não ficam clicáveis.
   */
  accessor?: (row: T) => string | number | null | undefined;
  cell: (row: T) => ReactNode;
};

/**
 * Tabela genérica com cabeçalho clicável para ordenar os dados exibidos na
 * tela (client-side, sobre os dados já carregados — não re-busca nada no
 * servidor). Usada em todas as listagens do sistema para manter o mesmo
 * comportamento de ordenação em qualquer tabela.
 */
export function SortableTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage,
  defaultSort,
  rowClassName,
  /** Envolve o <tr> já montado — usado pelas telas em que a linha inteira
   * é o gatilho de um diálogo de edição (ex.: catálogos, cadastros). */
  wrapRow,
  onRowClick,
  /**
   * Quando informado, o card inteiro no mobile vira clicável e leva pra
   * essa URL (com uma setinha ">" indicando isso) — em vez de precisar
   * tocar exatamente no título/código pra abrir o detalhe. Só afeta a
   * visão mobile; a tabela no desktop continua como está.
   */
  mobileCardHref,
}: {
  columns: SortableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage: string;
  defaultSort?: { key: string; direction: SortDirection };
  rowClassName?: (row: T) => string | undefined;
  wrapRow?: (row: T, rowNode: ReactNode) => ReactNode;
  /** Clique na linha (desktop). Nos cartões mobile use `mobileCardHref`. */
  onRowClick?: (row: T) => void;
  mobileCardHref?: (row: T) => string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(
    defaultSort ?? null
  );

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.accessor) return rows;
    const accessor = column.accessor;
    const withIndex = rows.map((row, index) => ({ row, index, value: accessor(row) }));
    withIndex.sort((a, b) => {
      const av = a.value;
      const bv = b.value;
      if (av == null && bv == null) return a.index - b.index;
      if (av == null) return 1;
      if (bv == null) return -1;
      let diff: number;
      if (typeof av === "number" && typeof bv === "number") {
        diff = av - bv;
      } else {
        diff = String(av).localeCompare(String(bv), "pt-BR", { sensitivity: "base", numeric: true });
      }
      if (diff === 0) diff = a.index - b.index;
      return sort.direction === "desc" ? -diff : diff;
    });
    return withIndex.map((item) => item.row);
  }, [rows, sort, columns]);

  function handleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }

  // Abaixo de `md`, uma tabela larga não cabe na tela sem rolagem
  // horizontal incômoda — em vez disso, cada linha vira um card
  // empilhado: a 1ª coluna com accessor/label vira o "título" do card,
  // colunas sem label (ex.: uma coluna de ações, sem cabeçalho) viram
  // botões no canto, e o resto aparece como uma lista de rótulo/valor.
  // Funciona pra qualquer tabela que já use esse componente, sem precisar
  // mexer em cada tela que o consome.
  const [titleColumn, ...otherColumns] = columns;
  const fieldColumns = otherColumns.filter((c) => c.label);
  const actionColumns = otherColumns.filter((c) => !c.label);

  return (
    <>
      <table className="hidden w-full text-sm md:table">
        <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            {columns.map((column) => {
              const sortable = !!column.accessor;
              const active = sort?.key === column.key;
              return (
                <th key={column.key} className={cn("px-4 py-3", column.className)}>
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground"
                    >
                      {column.label}
                      {active ? (
                        sort!.direction === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedRows.length === 0 ? (
            <EmptyRow colSpan={columns.length} message={emptyMessage} />
          ) : (
            sortedRows.map((row) => {
              const tr = (
                <tr key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn("hover:bg-muted", rowClassName?.(row))}>
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-4 py-3", column.className)}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
              return wrapRow ? wrapRow(row, tr) : tr;
            })
          )}
        </tbody>
      </table>

      <div className="divide-y divide-border md:hidden">
        {sortedRows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          sortedRows.map((row) => {
            const href = mobileCardHref?.(row);
            const card = (
              <div
                key={rowKey(row)}
                onClick={href ? () => router.push(href) : undefined}
                className={cn(
                  "flex flex-col gap-2 p-4 text-sm",
                  href && "cursor-pointer active:bg-muted/60",
                  rowClassName?.(row)
                )}
              >
                {/* Título em linha própria, sem dividir espaço com as
                 * ações: numa linha só, uma ação "larga" (ex.: um botão
                 * com texto, não só ícone) sobrava pouquíssimo espaço pro
                 * título, forçando-o a quebrar em várias linhas estreitas
                 * enquanto as ações ficavam coladas ao lado/por cima.
                 * Quando o card é clicável (mobileCardHref), a setinha
                 * deixa claro que dá pra tocar em qualquer parte do card
                 * pra abrir o detalhe — não só no título. */}
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">{titleColumn?.cell(row)}</div>
                  {href ? <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : null}
                </div>
                {fieldColumns.length > 0 ? (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                    {fieldColumns.map((column, index) => {
                      // Quando o número de campos é ímpar, o último fica
                      // sozinho numa grade de 2 colunas — sobrando metade
                      // da linha vazia do lado (ex.: o badge de Status
                      // "flutuando" sozinho). Nesse caso ele ocupa a linha
                      // toda em vez de ficar pela metade.
                      const spansFullRow = index === fieldColumns.length - 1 && fieldColumns.length % 2 === 1;
                      return (
                        <div key={column.key} className={cn("min-w-0", spansFullRow && "col-span-2")}>
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {column.label}
                          </dt>
                          <dd className="mt-1 text-sm leading-snug text-foreground">{column.cell(row)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                ) : null}
                {actionColumns.length > 0 ? (
                  <div
                    className="flex flex-wrap items-center justify-end gap-1 border-t border-border pt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actionColumns.map((column) => (
                      <span key={column.key}>{column.cell(row)}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
            return wrapRow ? wrapRow(row, card) : card;
          })
        )}
      </div>
    </>
  );
}
