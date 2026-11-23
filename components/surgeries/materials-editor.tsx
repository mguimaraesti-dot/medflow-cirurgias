"use client";

import { useState, useTransition } from "react";
import { Check, CheckCheck, Loader2, Package, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  createMaterialFromRequestAction,
  searchCatalogMaterialsAction,
} from "@/app/(dashboard)/surgeries/request-reader-actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type EditorItem = {
  key: string;
  material_id: string;
  name: string;
  tuss_code: string | null;
  quantity: number;
  notes: string;
  validated: boolean;
  ai: boolean;
  supplier_name?: string | null;
  supplier_id?: string | null;
};

export type EditorAdapter = {
  /** Retorna mensagem de erro ou null. */
  onAdd: (m: { id: string; name: string; tuss_code: string | null }, quantity: number, notes: string) => Promise<string | null> | string | null;
  onUpdate: (key: string, patch: { quantity?: number; notes?: string; validated?: boolean; tuss_code?: string | null }) => Promise<string | null> | string | null;
  onRemove: (key: string) => Promise<string | null> | string | null;
  onValidateAll: () => Promise<string | null> | string | null;
};

const inputCls = "h-8 rounded-md border border-input bg-background px-2 text-sm";

function Row({ item, adapter, canEdit }: { item: EditorItem; adapter: EditorAdapter; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(item.quantity));
  const [notes, setNotes] = useState(item.notes);
  const [tuss, setTuss] = useState(item.tuss_code ?? "");
  const [pending, start] = useTransition();

  function run(fn: () => Promise<string | null> | string | null, ok?: () => void) {
    start(async () => {
      const err = await fn();
      if (err) toast.error(err);
      else ok?.();
    });
  }

  function save() {
    const q = Number(qty.replace(",", "."));
    const code = tuss.replace(/\s+/g, "");
    const patch: { quantity: number; notes: string; tuss_code?: string | null } = { quantity: q, notes };
    if (code !== (item.tuss_code ?? "")) patch.tuss_code = code || null;
    run(() => adapter.onUpdate(item.key, patch), () => setEditing(false));
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2">
        <p className="font-medium text-foreground">{item.name}</p>
        {item.supplier_name ? <p className="text-xs text-muted-foreground">Fornecedor: {item.supplier_name}</p> : null}
      </td>
      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
        {editing ? (
          <input value={tuss} onChange={(e) => setTuss(e.target.value.replace(/\D/g, "").slice(0, 12))} inputMode="numeric" aria-label="Código TUSS" placeholder="Código TUSS" className={cn(inputCls, "w-28 font-mono")} />
        ) : (
          (item.tuss_code ?? "A definir")
        )}
      </td>
      <td className="px-3 py-2">
        {editing ? (
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" aria-label="Quantidade" className={cn(inputCls, "w-16")} />
        ) : (
          item.quantity
        )}
      </td>
      <td className="max-w-[220px] px-3 py-2">
        {editing ? (
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} aria-label="Justificativa" placeholder="Justificativa de uso" className={cn(inputCls, "w-full")} />
        ) : item.notes ? (
          <span className="line-clamp-2 text-xs text-foreground">{item.notes}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <span className="flex flex-wrap items-center gap-1">
          {item.ai ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400">
              <Sparkles className="h-3 w-3" />IA
            </span>
          ) : null}
          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", item.validated ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400")}>
            {item.validated ? "Validado" : "Pendente"}
          </span>
        </span>
      </td>
      <td className="px-2 py-2">
        {canEdit ? (
          <span className="flex items-center justify-end gap-0.5">
            {editing ? (
              <>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={pending} onClick={save} aria-label="Salvar alterações"><Check className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={pending} onClick={() => { setQty(String(item.quantity)); setNotes(item.notes); setTuss(item.tuss_code ?? ""); setEditing(false); }} aria-label="Cancelar edição"><X className="h-4 w-4" /></Button>
              </>
            ) : (
              <>
                {!item.validated ? (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" disabled={pending} onClick={() => run(() => adapter.onUpdate(item.key, { validated: true }))} aria-label={`Validar ${item.name}`}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)} aria-label={`Editar ${item.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={pending} onClick={() => run(() => adapter.onRemove(item.key))} aria-label={`Remover ${item.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
              </>
            )}
          </span>
        ) : null}
      </td>
    </tr>
  );
}

type Found = { id: string; name: string; tuss_code?: string | null };

function AddPanel({ adapter, onDone }: { adapter: EditorAdapter; onDone: () => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Found[] | null>(null);
  const [chosen, setChosen] = useState<Found | null>(null);
  const [qty, setQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [busy, start] = useTransition();

  function search() {
    if (term.trim().length < 2) return;
    start(async () => {
      const r = await searchCatalogMaterialsAction(term.trim());
      setResults(r.results);
    });
  }

  function createFromTerm() {
    start(async () => {
      const r = await createMaterialFromRequestAction({ name: term.trim(), details: null });
      const item = r.item;
      if (r.error || !item) {
        toast.error(r.error ?? "Não foi possível cadastrar o material.");
        return;
      }
      setChosen({ id: item.id, name: item.name, tuss_code: item.tuss_code });
      toast.success(r.existing ? "Material já cadastrado: selecionado." : "Material cadastrado no catálogo.");
    });
  }

  function add() {
    if (!chosen) return;
    const q = Number(qty.replace(",", "."));
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    start(async () => {
      const err = await adapter.onAdd({ id: chosen.id, name: chosen.name, tuss_code: chosen.tuss_code ?? null }, q, notes);
      if (err) toast.error(err);
      else {
        toast.success("Material adicionado.");
        onDone();
      }
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
      {chosen ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{chosen.name}</span>
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setChosen(null)}>trocar</button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
                placeholder="Buscar material no catálogo (nome, código interno ou TUSS)"
                aria-label="Buscar material"
                className={cn(inputCls, "h-9 w-full pl-8")}
              />
            </div>
            <Button type="button" variant="outline" size="sm" className="h-9" disabled={busy} onClick={search}>Buscar</Button>
          </div>
          {results ? (
            <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto">
              {results.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setChosen(r)} className="w-full rounded-md border border-border p-2 text-left text-xs hover:bg-muted">
                    {r.name}{r.tuss_code ? <span className="ml-2 font-mono text-muted-foreground">TUSS {r.tuss_code}</span> : null}
                  </button>
                </li>
              ))}
              {results.length === 0 ? <li className="text-xs text-muted-foreground">Nada encontrado no catálogo.</li> : null}
            </ul>
          ) : null}
          {term.trim().length >= 2 ? (
            <Button type="button" variant="outline" size="sm" className="h-8 w-fit text-xs" disabled={busy} onClick={createFromTerm}>
              <Plus className="mr-1 h-3.5 w-3.5" />Cadastrar “{term.trim()}” no catálogo
            </Button>
          ) : null}
        </>
      )}

      {chosen ? (
        <div className="grid grid-cols-[5rem_1fr] gap-2">
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" aria-label="Quantidade" className={cn(inputCls, "h-9")} />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} aria-label="Justificativa" placeholder="Justificativa de uso (opcional)" className={cn(inputCls, "h-9")} />
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={!chosen || busy} onClick={add}>{busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}Adicionar à cirurgia</Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>Cancelar</Button>
      </div>
    </div>
  );
}

/**
 * Lista ÚNICA de materiais/OPME da indicação cirúrgica (sem vínculo com
 * procedimento individual), com quantidade, justificativa e validação.
 */
export function MaterialsEditor({
  items,
  adapter,
  canEdit,
}: {
  items: EditorItem[];
  adapter: EditorAdapter;
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const toValidate = items.filter((i) => !i.validated).length;

  return (
    <section data-no-enter-submit className="rounded-xl border border-border bg-card p-4" aria-label="Materiais e OPME">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-500"><Package className="h-4 w-4" /></span>
          Materiais e OPME
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{items.length} {items.length === 1 ? "item" : "itens"}</span>
          {toValidate > 0 ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">{toValidate} a validar</span>
          ) : items.length > 0 ? (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">todos validados</span>
          ) : null}
        </h2>
        {canEdit ? (
          <div className="flex items-center gap-2">
            {toValidate > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={pending}
                onClick={() => start(async () => { const err = await adapter.onValidateAll(); if (err) toast.error(err); else toast.success("Materiais validados."); })}
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" />Validar todos
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setAdding((v) => !v)}>
              <Plus className="mr-1 h-3.5 w-3.5" />{adding ? "Fechar" : "Adicionar"}
            </Button>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum material informado. Use “Adicionar” ou a leitura de guia por IA.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold">Material</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">Código TUSS</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">Qtd.</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">Justificativa</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">Situação</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => <Row key={`${item.key}:${item.quantity}:${item.notes}:${item.validated}`} item={item} adapter={adapter} canEdit={canEdit} />)}
            </tbody>
          </table>
        </div>
      )}

      {adding && canEdit ? <AddPanel adapter={adapter} onDone={() => setAdding(false)} /> : null}
    </section>
  );
}
