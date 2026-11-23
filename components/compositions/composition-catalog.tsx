"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronRight, FileText, Loader2, Package, Pencil, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { renameCompositionAction } from "@/app/(dashboard)/catalog/compositions/actions";
import { formatCompositionCode } from "@/lib/compositions/signature";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export type CatalogRow = {
  id: string;
  number: number;
  name: string;
  primary_name: string | null;
  created_at: string;
  updated_at: string;
  procedures: { id: string; name: string; tuss_code: string | null; is_primary: boolean }[];
  materials: { material_id: string; name: string; tuss_code: string | null; quantity: number }[];
  surgeries: { id: string; code: string; indication_date: string | null; status: string; hospital_name: string | null }[];
};

export type SortKey = "code" | "date" | "uses";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function SortHeader({
  label,
  field,
  sort,
  dir,
  hrefFor,
  className,
}: {
  label: string;
  field: SortKey;
  sort: SortKey;
  dir: "asc" | "desc";
  hrefFor: (field: SortKey) => string;
  className?: string;
}) {
  const active = sort === field;
  return (
    <th scope="col" className={cn("px-3 py-2.5 text-left font-semibold", className)} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={hrefFor(field)} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}>
        {label}
        {active ? <span aria-hidden="true">{dir === "asc" ? "↑" : "↓"}</span> : null}
      </Link>
    </th>
  );
}

export function CompositionCatalog({
  rows,
  sort,
  dir,
  sortHrefs,
  canEdit,
}: {
  rows: CatalogRow[];
  sort: SortKey;
  dir: "asc" | "desc";
  sortHrefs: Record<SortKey, string>;
  canEdit: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="mt-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <SortHeader label="Código" field="code" sort={sort} dir={dir} hrefFor={(f) => sortHrefs[f]} />
                <th scope="col" className="px-3 py-2.5 text-left font-semibold">Composição</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold">Proced.</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold">Materiais</th>
                <SortHeader label="Guias" field="uses" sort={sort} dir={dir} hrefFor={(f) => sortHrefs[f]} />
                <SortHeader label="Criada em" field="date" sort={sort} dir={dir} hrefFor={(f) => sortHrefs[f]} />
                <th scope="col" className="w-8 px-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const open = r.id === selectedId;
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(open ? null : r.id)}
                    className={cn("cursor-pointer border-b border-border last:border-0 hover:bg-muted/40", open && "bg-primary/10")}
                  >
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={`${open ? "Fechar" : "Abrir"} detalhes de ${formatCompositionCode(r.number)}`}
                        className="rounded-md bg-primary/15 px-2 py-1 font-mono text-xs font-semibold text-primary"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(open ? null : r.id); }}
                      >
                        {formatCompositionCode(r.number)}
                      </button>
                    </td>
                    <td className="max-w-[360px] px-3 py-2.5">
                      <p className="truncate font-medium text-foreground">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.primary_name ? `Principal: ${r.primary_name}` : "Sem procedimento principal"}
                      </p>
                    </td>
                    <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5 text-sky-500" />{r.procedures.length}</span></td>
                    <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-violet-500" />{r.materials.length}</span></td>
                    <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-muted-foreground" />{r.surgeries.length}</span></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{fmt(r.created_at)}</td>
                    <td className="px-2"><ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-90")} /></td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhuma composição encontrada.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected ? <DetailPanel key={selected.id} row={selected} canEdit={canEdit} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  rescheduled: "Reagendada",
  cancelled: "Cancelada",
  completed: "Realizada",
};

type Tab = "procedures" | "materials" | "guides";

function DetailPanel({ row, canEdit }: { row: CatalogRow; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const [tab, setTab] = useState<Tab>("procedures");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await renameCompositionAction(row.id, name);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Nome atualizado.");
        setEditing(false);
      }
    });
  }

  const tabs: { key: Tab; label: string; icon: typeof Stethoscope; count: number; tone: string }[] = [
    { key: "procedures", label: "Procedimentos", icon: Stethoscope, count: row.procedures.length, tone: "text-sky-500" },
    { key: "materials", label: "Materiais", icon: Package, count: row.materials.length, tone: "text-violet-500" },
    { key: "guides", label: "Guias", icon: FileText, count: row.surgeries.length, tone: "text-emerald-500" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <SheetHeader className="gap-2 pr-8 text-left">
        <span className="w-fit rounded-md bg-primary/15 px-2 py-1 font-mono text-sm font-semibold text-primary">
          {formatCompositionCode(row.number)}
        </span>
        {editing ? (
          <div className="flex flex-col gap-2">
            <SheetTitle className="sr-only">Renomear composição</SheetTitle>
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={name}
              maxLength={150}
              aria-label="Nome da composição"
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={pending} onClick={save}>
                {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}Salvar nome
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => { setName(row.name); setEditing(false); }}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <SheetTitle className="text-lg leading-snug">{row.name}</SheetTitle>
            {canEdit ? (
              <Button type="button" variant="outline" size="sm" className="h-8 w-fit" onClick={() => setEditing(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />Renomear
              </Button>
            ) : null}
          </>
        )}
        <SheetDescription>
          Criada em {fmt(row.created_at)} · atualizada em {fmt(row.updated_at)}
        </SheetDescription>
      </SheetHeader>

      {/* Os três indicadores funcionam como abas */}
      <div role="tablist" aria-label="Detalhes da composição" className="grid grid-cols-3 gap-2">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 text-center transition-colors",
                active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
              )}
            >
              <t.icon className={cn("h-4 w-4", t.tone)} />
              <span className="text-xl font-semibold leading-none text-foreground">{t.count}</span>
              <span className="text-[11px] text-muted-foreground">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === "procedures" ? (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 text-left font-semibold">TUSS</th>
                <th className="py-2 text-left font-semibold">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {row.procedures.map((p) => (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-xs text-muted-foreground">{p.tuss_code ?? "s/ TUSS"}</td>
                  <td className="py-2.5 text-foreground">
                    {p.name}
                    {p.is_primary ? (
                      <span className="ml-2 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">principal</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "materials" ? (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 text-left font-semibold">Material</th>
                <th className="py-2 pr-3 text-left font-semibold">TUSS</th>
                <th className="py-2 text-right font-semibold">Qtd.</th>
              </tr>
            </thead>
            <tbody>
              {row.materials.map((m) => (
                <tr key={m.material_id} className="border-t border-border align-top">
                  <td className="py-2.5 pr-3 text-foreground">{m.name}</td>
                  <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-xs text-muted-foreground">{m.tuss_code ?? "—"}</td>
                  <td className="py-2.5 text-right font-medium">{m.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "guides" ? (
          row.surgeries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhuma guia usa esta composição ainda.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {row.surgeries.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/surgeries/${g.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{g.code}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {g.hospital_name ?? "Hospital não informado"}
                        {g.indication_date ? ` · solicitação ${new Date(g.indication_date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{STATUS_LABEL[g.status] ?? g.status}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  );
}
