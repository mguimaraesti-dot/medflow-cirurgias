"use client";

import { useEffect, useRef, useState } from "react";
import { Star, X, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProcedureOption = { id: string; name: string };
type SelectedProcedure = ProcedureOption & { is_primary: boolean };

export function ProceduresMultiSelect({
  procedures,
  defaultSelected,
}: {
  procedures: ProcedureOption[];
  /** Procedimentos já vinculados (edição) — o primeiro `is_primary: true`
   * encontrado vira o principal inicial. */
  defaultSelected?: SelectedProcedure[];
}) {
  const [selected, setSelected] = useState<SelectedProcedure[]>(defaultSelected ?? []);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedIds = new Set(selected.map((s) => s.id));
  const available = procedures.filter(
    (p) => !selectedIds.has(p.id) && p.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  function addProcedure(procedure: ProcedureOption) {
    setSelected((prev) => [...prev, { ...procedure, is_primary: prev.length === 0 }]);
    setQuery("");
    setOpen(false);
  }

  function removeProcedure(id: string) {
    setSelected((prev) => {
      const next = prev.filter((p) => p.id !== id);
      // Se removeu o principal, promove o primeiro que sobrou.
      if (!next.some((p) => p.is_primary) && next.length > 0) {
        next[0] = { ...next[0], is_primary: true };
      }
      return next;
    });
  }

  function setPrimary(id: string) {
    setSelected((prev) => prev.map((p) => ({ ...p, is_primary: p.id === id })));
  }

  const primary = selected.find((p) => p.is_primary) ?? selected[0];

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      <Label htmlFor="procedure_search">Procedimentos *</Label>

      {selected.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {selected.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
            >
              <button
                type="button"
                onClick={() => setPrimary(p.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                title={p.is_primary ? "Procedimento principal" : "Marcar como principal"}
              >
                <Star
                  className={
                    p.is_primary
                      ? "h-4 w-4 shrink-0 fill-amber-400 text-amber-400"
                      : "h-4 w-4 shrink-0 text-muted-foreground"
                  }
                />
                <span className="truncate">{p.name}</span>
                {p.is_primary ? (
                  <span className="shrink-0 text-xs text-muted-foreground">(principal)</span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => removeProcedure(p.id)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remover ${p.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="procedure_search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? "Buscar procedimento..." : "Adicionar outro procedimento..."}
          className="pl-7"
          autoComplete="off"
        />

        {open ? (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
            {available.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {procedures.length === 0
                  ? "Nenhum procedimento cadastrado."
                  : "Nenhum procedimento encontrado."}
              </p>
            ) : (
              <ul className="max-h-48 overflow-y-auto">
                {available.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => addProcedure(p)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-muted"
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {selected.length === 0 ? (
        <p className="text-xs text-muted-foreground">Selecione ao menos um procedimento.</p>
      ) : null}

      {/* Marque o primeiro adicionado com uma ⭐ — ele já começa como
       * principal; clique na estrela de outro pra trocar. */}
      {selected.length > 1 ? (
        <p className="text-xs text-muted-foreground">
          Clique na ⭐ de um procedimento pra marcá-lo como principal.
        </p>
      ) : null}

      {selected.map((p) => (
        <input key={p.id} type="hidden" name="procedure_ids" value={p.id} />
      ))}
      <input type="hidden" name="primary_procedure_id" value={primary?.id ?? ""} />
    </div>
  );
}
