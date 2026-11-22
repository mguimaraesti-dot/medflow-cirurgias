"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Package, Plus, Save, Search, Trash2 } from "lucide-react";

import { saveDefaultMaterialsAction, searchMaterialsAction } from "@/app/(dashboard)/catalog/procedures/actions";
import type { MaterialSearchResult, ProcedureDefaultMaterial } from "@/lib/data/procedure-materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaterialFormDialog } from "@/components/materials/material-form-dialog";

type Draft = {
  material_id: string;
  name: string;
  code: string | null;
  quantity: string;
  unit: string;
  supplier_id: string; // "" = sem fornecedor preferencial
};

const NO_SUPPLIER = "__none";

function fromItem(i: ProcedureDefaultMaterial): Draft {
  return {
    material_id: i.material_id,
    name: i.material?.name ?? "Material removido",
    code: i.material?.internal_code ?? null,
    quantity: String(i.quantity),
    unit: i.unit ?? "",
    supplier_id: i.preferred_supplier_id ?? "",
  };
}

const signature = (rows: Draft[]) =>
  JSON.stringify(rows.map((r) => [r.material_id, Number(r.quantity), r.unit.trim(), r.supplier_id]));

/**
 * Editor do kit de materiais padrão. Trabalha num rascunho local (adicionar,
 * pesquisar, mudar quantidade/unidade, remover) e só grava ao clicar em
 * "Salvar configuração". O kit é uma referência: cada cirurgia pode ajustar
 * os materiais depois.
 */
export function ProcedureKitEditor({
  procedureId,
  initialItems,
  suppliers,
  canEdit,
  onSaved,
  onDirtyChange,
}: {
  procedureId: string;
  initialItems: ProcedureDefaultMaterial[];
  suppliers: { id: string; company_name: string }[];
  canEdit: boolean;
  onSaved?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Draft[]>(() => initialItems.map(fromItem));
  const [baseline, setBaseline] = useState(() => signature(initialItems.map(fromItem)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(() => signature(rows) !== baseline, [rows, baseline]);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  // --- busca de materiais ---
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MaterialSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setSearching(true);
      const { results: found } = await searchMaterialsAction(query);
      if (id !== reqId.current) return;
      setResults(found);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  function addMaterial(m: { id: string; name: string; internal_code?: string | null; unit?: string | null }) {
    setOpen(false);
    setQuery("");
    setError(null);
    setRows((cur) =>
      cur.some((r) => r.material_id === m.id)
        ? cur
        : [
            ...cur,
            {
              material_id: m.id,
              name: m.name,
              code: m.internal_code ?? null,
              quantity: "1",
              unit: m.unit ?? "",
              supplier_id: "",
            },
          ]
    );
  }

  const patch = (id: string, p: Partial<Draft>) =>
    setRows((cur) => cur.map((r) => (r.material_id === id ? { ...r, ...p } : r)));

  async function save() {
    setError(null);
    const items = rows.map((r) => ({
      material_id: r.material_id,
      quantity: Number(r.quantity.replace(",", ".")),
      unit: r.unit.trim() || null,
      preferred_supplier_id: r.supplier_id || null,
    }));
    const bad = items.find((i) => !Number.isFinite(i.quantity) || i.quantity <= 0);
    if (bad) {
      const name = rows.find((r) => r.material_id === bad.material_id)?.name;
      return setError(`Informe uma quantidade maior que zero para "${name}".`);
    }
    setSaving(true);
    const result = await saveDefaultMaterialsAction(procedureId, items);
    setSaving(false);
    if (result.error) return setError(result.error);
    setBaseline(signature(rows));
    toast.success("Materiais padrão salvos.");
    onSaved?.();
    router.refresh();
  }

  const unitListId = `units-${procedureId}`;

  return (
    <div className="flex flex-col gap-5">
      {canEdit ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">Adicionar material</h3>
          <div className="flex gap-2">
            <div ref={boxRef} className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Pesquisar material por nome, código ou TUSS..."
                aria-label="Pesquisar material"
                className="h-10 pl-9"
                autoComplete="off"
              />
              {open ? (
                <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                  {searching && !results ? (
                    <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                    </p>
                  ) : results && results.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">Nenhum material encontrado.</p>
                  ) : (
                    <ul>
                      {(results ?? []).map((m) => {
                        const already = rows.some((r) => r.material_id === m.id);
                        return (
                          <li key={m.id} className="border-b border-border last:border-b-0">
                            <button
                              type="button"
                              disabled={already}
                              onClick={() => addMaterial(m)}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-foreground">{m.name}</span>
                                <span className="block text-xs text-muted-foreground">
                                  {[m.internal_code, m.tuss_code ? `TUSS ${m.tuss_code}` : null, m.unit]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {already ? "No kit" : "Adicionar"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
            <MaterialFormDialog
              trigger={
                <Button type="button" variant="outline" size="icon" className="h-10 w-10" title="Cadastrar novo material">
                  <Plus className="h-4 w-4" />
                </Button>
              }
              onCreated={(created) => addMaterial({ id: created.id, name: created.name })}
            />
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">
          Itens do kit {rows.length > 0 ? `(${rows.length})` : ""}
        </h3>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum material no kit padrão. Ao criar uma cirurgia com este procedimento, nada será
              sugerido até você montar a lista{canEdit ? " (opcional)" : ""}.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            <datalist id={unitListId}>
              {["Unidade", "Caixa", "Pacote", "Par", "Kit", "Metro", "mL"].map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            {rows.map((r) => (
              <li key={r.material_id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground" title={r.name}>
                      {r.name}
                    </p>
                    {r.code ? <p className="text-xs text-muted-foreground">{r.code}</p> : null}
                  </div>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                      aria-label={`Remover ${r.name} do kit`}
                      title="Remover do kit"
                      onClick={() => setRows((cur) => cur.filter((x) => x.material_id !== r.material_id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <div className="mt-2 grid grid-cols-[6rem_1fr] gap-2 sm:grid-cols-[6rem_8rem_1fr]">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    value={r.quantity}
                    disabled={!canEdit}
                    onChange={(e) => patch(r.material_id, { quantity: e.target.value })}
                    aria-label={`Quantidade de ${r.name}`}
                    className="h-9"
                  />
                  <Input
                    value={r.unit}
                    list={unitListId}
                    disabled={!canEdit}
                    onChange={(e) => patch(r.material_id, { unit: e.target.value })}
                    placeholder="Unidade"
                    aria-label={`Unidade de ${r.name}`}
                    className="h-9"
                  />
                  <div className="col-span-2 sm:col-span-1">
                    <Select
                      value={r.supplier_id || NO_SUPPLIER}
                      disabled={!canEdit}
                      onValueChange={(v) => patch(r.material_id, { supplier_id: v === NO_SUPPLIER ? "" : v })}
                    >
                      <SelectTrigger className="h-9 text-xs" aria-label={`Fornecedor preferencial de ${r.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_SUPPLIER}>Sem fornecedor preferencial</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {canEdit ? (
        <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t border-border bg-card px-1 pt-3">
          <p className="text-xs text-muted-foreground">
            {dirty ? "Alterações não salvas." : "O kit é uma sugestão: cada cirurgia pode ajustar os materiais."}
          </p>
          <Button type="button" disabled={!dirty || saving} onClick={save} className="shrink-0">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Salvando..." : "Salvar configuração"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
