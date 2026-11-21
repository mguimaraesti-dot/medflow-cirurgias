"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";

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
}: {
  columns: SortableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage: string;
  defaultSort?: { key: string; direction: SortDirection };
  rowClassName?: (row: T) => string | undefined;
  wrapRow?: (row: T, rowNode: ReactNode) => ReactNode;
}) {
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
                <tr key={rowKey(row)} className={cn("hover:bg-muted", rowClassName?.(row))}>
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
            const card = (
              <div
                key={rowKey(row)}
                className={cn("flex flex-col gap-2 p-4 text-sm", rowClassName?.(row))}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">{titleColumn?.cell(row)}</div>
                  {actionColumns.length > 0 ? (
                    <div className="flex shrink-0 items-center gap-1">
                      {actionColumns.map((column) => (
                        <span key={column.key}>{column.cell(row)}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {fieldColumns.length > 0 ? (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    {fieldColumns.map((column) => (
                      <div key={column.key} className="min-w-0">
                        <dt className="text-muted-foreground">{column.label}</dt>
                        <dd className="mt-0.5 text-foreground">{column.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
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
