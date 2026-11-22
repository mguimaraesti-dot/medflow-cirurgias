"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import type { SurgeryListRow } from "@/lib/data/surgeries-list";
import { SITUATION_LABEL, type SurgerySituation } from "@/lib/surgery-situation";
import { surgeryListQuery, type SortKey, type SurgeryListParams } from "@/lib/surgery-list-params";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SurgeryRowActions } from "@/components/surgeries/surgery-row-actions";

const SITUATION_VARIANT: Record<SurgerySituation, "secondary" | "warning" | "info" | "success" | "destructive"> = {
  planning: "secondary",
  awaiting: "warning",
  confirmed: "info",
  completed: "success",
  cancelled: "destructive",
};

const PRIORITY_TAG: Record<string, { label: string; className: string } | undefined> = {
  high: { label: "Alta", className: "bg-amber-500/15 text-amber-500" },
  urgent: { label: "Urgente", className: "bg-red-500/15 text-red-400" },
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function procedureSummary(row: SurgeryListRow) {
  const [first, ...rest] = row.procedures;
  if (!first) return { label: "—", title: "" };
  const label = rest.length > 0 ? `${first.name} +${rest.length}` : first.name;
  const title = row.procedures
    .map((p) => (p.tuss_code ? `${p.name} (TUSS ${p.tuss_code})` : p.name))
    .join("\n");
  return { label, title };
}

function StatusCell({ row }: { row: SurgeryListRow }) {
  const isOpen = row.situation !== "completed" && row.situation !== "cancelled";
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant={SITUATION_VARIANT[row.situation]}>
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
          {SITUATION_LABEL[row.situation]}
        </Badge>
        {row.status === "rescheduled" ? <Badge variant="outline">Reagendada</Badge> : null}
      </div>
      {isOpen && row.stage_name ? (
        <span className="text-xs text-muted-foreground" title="Etapa atual do fluxo">
          {row.stage_name}
        </span>
      ) : null}
    </div>
  );
}

/** Abre a ficha ao clicar/Enter na linha, sem atrapalhar links e botões dentro dela. */
function useRowNavigation() {
  const router = useRouter();
  // Eventos de conteúdo em portal (diálogo de cancelar) também sobem pela
  // árvore do React até a linha — por isso exige que o alvo esteja DENTRO
  // da linha no DOM, e ignora links/botões/campos.
  const shouldOpen = (e: { target: EventTarget | null; currentTarget: Element }) =>
    e.target instanceof Element &&
    e.currentTarget.contains(e.target) &&
    !e.target.closest("a,button,[role='menu'],input,select,textarea");
  return (id: string) => ({
    onClick: (e: MouseEvent) => {
      if (shouldOpen(e)) router.push(`/surgeries/${id}`);
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" && shouldOpen(e)) router.push(`/surgeries/${id}`);
    },
  });
}

type Column = { key: SortKey; label: string; className?: string; defaultDir: "asc" | "desc" };

const COLUMNS: Column[] = [
  { key: "code", label: "Código", defaultDir: "desc" },
  { key: "patient", label: "Paciente", defaultDir: "asc" },
  { key: "hospital", label: "Hospital", defaultDir: "asc" },
  { key: "procedure", label: "Procedimento", defaultDir: "asc" },
  { key: "indication_date", label: "Solicitação", defaultDir: "desc" },
  { key: "expected_date", label: "Prevista", defaultDir: "asc" },
  { key: "confirmed_date", label: "Confirmada", defaultDir: "asc" },
  { key: "status", label: "Status", defaultDir: "asc" },
];

function SortHeader({ column, params }: { column: Column; params: SurgeryListParams }) {
  const active = params.sort === column.key;
  const nextDir = active ? (params.dir === "asc" ? "desc" : "asc") : column.defaultDir;
  const Icon = !active ? ArrowUpDown : params.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Link
      href={`/surgeries${surgeryListQuery(params, { sort: column.key, dir: nextDir, page: 1 })}`}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground"
      )}
      title={`Ordenar por ${column.label.toLowerCase()}`}
    >
      {column.label}
      <Icon className={cn("h-3.5 w-3.5", !active && "opacity-50")} />
    </Link>
  );
}

function Truncate({ children, title, className }: { children: ReactNode; title?: string; className?: string }) {
  return (
    <span className={cn("block truncate", className)} title={title}>
      {children}
    </span>
  );
}

export function SurgeryListTable({
  rows,
  params,
  canEdit,
  emptyMessage,
}: {
  rows: SurgeryListRow[];
  params: SurgeryListParams;
  canEdit: boolean;
  emptyMessage: string;
}) {
  const rowNav = useRowNavigation();

  if (rows.length === 0) {
    return <div className="px-4 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[56rem] table-fixed text-sm">
          <colgroup>
            <col className="w-[8.5rem]" />
            <col className="w-[17%]" />
            <col className="w-[16%]" />
            <col className="w-[24%]" />
            <col className="w-[6.5rem]" />
            <col className="w-[6.5rem]" />
            <col className="w-[6.5rem]" />
            <col className="w-[13rem]" />
            <col className="w-14" />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="px-3 py-3"
                  aria-sort={params.sort === c.key ? (params.dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <SortHeader column={c} params={params} />
                </th>
              ))}
              <th scope="col" className="px-3 py-3 text-right text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const proc = procedureSummary(row);
              const priority = PRIORITY_TAG[row.priority];
              return (
                <tr
                  key={row.id}
                  tabIndex={0}
                  {...rowNav(row.id)}
                  className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40 focus:bg-muted/40 focus:outline-none"
                >
                  <td className="px-3 py-3 align-middle">
                    <Link
                      href={`/surgeries/${row.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {row.code}
                    </Link>
                    {priority ? (
                      <span className={cn("mt-1 block w-fit rounded px-1.5 py-0.5 text-[10px] font-medium", priority.className)}>
                        {priority.label}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-middle text-foreground">
                    <Truncate title={row.patient_name ?? undefined}>{row.patient_name ?? "—"}</Truncate>
                  </td>
                  <td className="px-3 py-3 align-middle text-muted-foreground">
                    <Truncate title={row.hospital_name ?? undefined}>{row.hospital_name ?? "—"}</Truncate>
                  </td>
                  <td className="px-3 py-3 align-middle text-muted-foreground">
                    <Truncate title={proc.title}>{proc.label}</Truncate>
                  </td>
                  <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">
                    {formatDate(row.indication_date)}
                  </td>
                  <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">
                    {formatDate(row.expected_date)}
                  </td>
                  <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">
                    {formatDate(row.confirmed_date)}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <StatusCell row={row} />
                  </td>
                  <td className="px-3 py-3 text-right align-middle">
                    <SurgeryRowActions
                      surgeryId={row.id}
                      code={row.code}
                      canEdit={canEdit}
                      isOpen={row.situation !== "completed" && row.situation !== "cancelled"}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Celular: cartões */}
      <ul className="divide-y divide-border lg:hidden">
        {rows.map((row) => {
          const proc = procedureSummary(row);
          const priority = PRIORITY_TAG[row.priority];
          return (
            <li
              key={row.id}
              tabIndex={0}
              {...rowNav(row.id)}
              className="flex cursor-pointer flex-col gap-2 p-4 active:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/surgeries/${row.id}`} className="font-semibold text-primary hover:underline">
                      {row.code}
                    </Link>
                    {priority ? (
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", priority.className)}>
                        {priority.label}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">{row.patient_name ?? "—"}</p>
                </div>
                <SurgeryRowActions
                  surgeryId={row.id}
                  code={row.code}
                  canEdit={canEdit}
                  isOpen={row.situation !== "completed" && row.situation !== "cancelled"}
                />
              </div>
              <p className="text-sm text-muted-foreground">{row.hospital_name ?? "—"}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground" title={proc.title}>
                {proc.label}
              </p>
              <dl className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Solicitação</dt>
                  <dd className="tabular-nums text-foreground">{formatDate(row.indication_date)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Prevista</dt>
                  <dd className="tabular-nums text-foreground">{formatDate(row.expected_date)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Confirmada</dt>
                  <dd className="tabular-nums text-foreground">{formatDate(row.confirmed_date)}</dd>
                </div>
              </dl>
              <StatusCell row={row} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
