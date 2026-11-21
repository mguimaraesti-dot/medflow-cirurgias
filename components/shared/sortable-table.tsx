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

  return (
    <table className="w-full text-sm">
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
  );
}
