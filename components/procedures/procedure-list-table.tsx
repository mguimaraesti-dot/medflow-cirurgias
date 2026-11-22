"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import type { ProcedureListRow } from "@/lib/data/procedures-list";
import { procedureListQuery, type ProcedureListParams, type ProcedureSortKey } from "@/lib/procedure-list-params";
import { cn } from "@/lib/utils";
import { ActiveBadge } from "@/components/shared/active-badge";
import { ProcedureMaterialsButton } from "@/components/procedures/procedure-materials-button";
import { ProcedureRowActions } from "@/components/procedures/procedure-row-actions";

const COLUMNS: { key: ProcedureSortKey; label: string }[] = [
  { key: "name", label: "Nome" },
  { key: "code", label: "Código" },
  { key: "tuss", label: "TUSS" },
  { key: "specialty", label: "Especialidade" },
  { key: "location", label: "Local" },
  { key: "materials", label: "Materiais" },
  { key: "status", label: "Status" },
];

function Cell({ value, className }: { value: string | null; className?: string }) {
  return (
    <span className={cn("block truncate", !value && "text-muted-foreground/60", className)} title={value ?? undefined}>
      {value || "—"}
    </span>
  );
}

export function ProcedureListTable({
  rows,
  params,
  canEdit,
  emptyMessage,
}: {
  rows: ProcedureListRow[];
  params: ProcedureListParams;
  canEdit: boolean;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <div className="px-4 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[60rem] table-fixed text-sm">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[7rem]" />
            <col className="w-[7.5rem]" />
            <col className="w-[15%]" />
            <col className="w-[12%]" />
            <col className="w-[8.5rem]" />
            <col className="w-[6.5rem]" />
            <col className="w-16" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              {COLUMNS.map(({ key, label }) => {
                const active = params.sort === key;
                const Icon = !active ? ChevronsUpDown : params.dir === "asc" ? ChevronUp : ChevronDown;
                const nextDir = active && params.dir === "asc" ? "desc" : "asc";
                return (
                  <th
                    key={key}
                    scope="col"
                    aria-sort={active ? (params.dir === "asc" ? "ascending" : "descending") : "none"}
                    className="px-3 py-3 font-semibold"
                  >
                    <Link
                      href={`/catalog/procedures${procedureListQuery(params, { sort: key, dir: nextDir, page: 1 })}`}
                      className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
                    >
                      {label}
                      <Icon className="h-3 w-3" />
                    </Link>
                  </th>
                );
              })}
              <th scope="col" className="px-3 py-3 text-right font-semibold">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-muted/40">
                <td className="px-3 py-3">
                  <Link
                    href={`/catalog/procedures/${p.id}`}
                    title={p.name}
                    className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">
                  <Cell value={p.internal_code} />
                </td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">
                  <Cell value={p.tuss_code} />
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  <Cell value={p.specialty} />
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  <Cell value={p.location} />
                </td>
                <td className="px-3 py-3">
                  <ProcedureMaterialsButton procedure={p} count={p.materials_count} canEdit={canEdit} />
                </td>
                <td className="px-3 py-3">
                  <ActiveBadge active={p.active} />
                </td>
                <td className="px-3 py-3 text-right">
                  <ProcedureRowActions procedure={p} canEdit={canEdit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet */}
      <ul className="divide-y divide-border lg:hidden">
        {rows.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/catalog/procedures/${p.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                  {p.name}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[p.internal_code, p.tuss_code ? `TUSS ${p.tuss_code}` : null].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <ProcedureRowActions procedure={p} canEdit={canEdit} />
            </div>
            <p className="text-sm text-muted-foreground">
              {[p.specialty, p.location].filter(Boolean).join(" · ") || "Sem especialidade/local"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <ActiveBadge active={p.active} />
              <ProcedureMaterialsButton procedure={p} count={p.materials_count} canEdit={canEdit} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
