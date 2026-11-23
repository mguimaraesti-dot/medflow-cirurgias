"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronRight, FileText, Loader2, Package, Pencil, Stethoscope, X } from "lucide-react";
import { toast } from "sonner";

import { renameCompositionAction } from "@/app/(dashboard)/catalog/compositions/actions";
import { formatCompositionCode } from "@/lib/compositions/signature";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type CatalogRow = {
  id: string;
  number: number;
  name: string;
  primary_name: string | null;
  created_at: string;
  updated_at: string;
  procedures: { id: string; name: string; tuss_code: string | null; is_primary: boolean }[];
  materials: { material_id: string; name: string; tuss_code: string | null; quantity: number }[];
  surgeries: { id: string; code: string }[];
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
    <div className={cn("mt-4 grid gap-4", selected ? "xl:grid-cols-[minmax(0,1fr)_400px]" : "")}>
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

      {selected ? <DetailPanel key={selected.id} row={selected} canEdit={canEdit} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}

function DetailPanel({ row, canEdit, onClose }: { row: CatalogRow; canEdit: boolean; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
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

  return (
    <aside aria-label={`Detalhes de ${formatCompositionCode(row.number)}`} className="h-fit rounded-xl border border-border bg-card p-4 xl:sticky xl:top-4">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-md bg-primary/15 px-2 py-1 font-mono text-sm font-semibold text-primary">{formatCompositionCode(row.number)}</span>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Fechar detalhes" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <input
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={name}
            maxLength={150}
            aria-label="Nome da composição"
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={save}>{pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}Salvar nome</Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => { setName(row.name); setEditing(false); }}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold leading-snug text-foreground">{row.name}</h2>
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={() => setEditing(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Renomear</Button>
          ) : null}
        </div>
      )}
      <p className="mt-1 text-xs text-muted-foreground">Criada em {fmt(row.created_at)} · atualizada em {fmt(row.updated_at)}</p>

      <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border border-border text-center">
        {[
          ["Procedimentos", row.procedures.length],
          ["Materiais", row.materials.length],
          ["Guias", row.surgeries.length],
        ].map(([label, value]) => (
          <div key={label} className="py-2"><p className="text-lg font-semibold text-foreground">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
        ))}
      </div>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">Procedimentos TUSS</h3>
      <ul className="mt-1.5 flex flex-col gap-1.5 text-sm">
        {row.procedures.map((p) => (
          <li key={p.id} className="flex gap-2">
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{p.tuss_code ?? "s/ TUSS"}</span>
            <span>{p.name}{p.is_primary ? <span className="ml-1.5 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">principal</span> : null}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">Materiais / OPME</h3>
      <ul className="mt-1.5 flex flex-col gap-1.5 text-sm">
        {row.materials.map((m) => (
          <li key={m.material_id} className="flex items-baseline justify-between gap-2">
            <span>{m.name}{m.tuss_code ? <span className="ml-1.5 font-mono text-xs text-muted-foreground">TUSS {m.tuss_code}</span> : null}</span>
            <span className="shrink-0 font-medium">{m.quantity}</span>
          </li>
        ))}
      </ul>

      {row.surgeries.length > 0 ? (
        <>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guias vinculadas</h3>
          <p className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-xs">
            {row.surgeries.slice(0, 20).map((s) => (
              <Link key={s.id} href={`/surgeries/${s.id}`} className="font-medium text-foreground hover:underline">{s.code}</Link>
            ))}
            {row.surgeries.length > 20 ? <span className="text-muted-foreground">e mais {row.surgeries.length - 20}</span> : null}
          </p>
        </>
      ) : null}
    </aside>
  );
}
