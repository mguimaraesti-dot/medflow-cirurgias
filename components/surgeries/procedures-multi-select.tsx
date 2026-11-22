"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Star, X, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type ProcedureOption = {
  id: string;
  name: string;
  tuss_code?: string | null;
  specialty?: string | null;
  /** Materiais no kit padrão (sugeridos ao criar a cirurgia). */
  materials_count?: number;
};
export type SelectedProcedure = { id: string; is_primary: boolean };

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Seleção múltipla de procedimentos (busca por nome ou código TUSS). Estado
 * controlado pelo formulário; o primeiro adicionado vira o principal (⭐) e
 * isso é o que o servidor grava em `surgery_procedures`.
 */
export function ProceduresMultiSelect({
  procedures,
  selected,
  onChange,
  invalid,
}: {
  procedures: ProcedureOption[];
  selected: SelectedProcedure[];
  onChange: (next: SelectedProcedure[]) => void;
  invalid?: boolean;
}) {
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

  const byId = useMemo(() => new Map(procedures.map((p) => [p.id, p])), [procedures]);
  const selectedIds = new Set(selected.map((s) => s.id));

  const available = useMemo(() => {
    const q = normalize(query.trim());
    return procedures
      .filter((p) => !selectedIds.has(p.id))
      .filter((p) => !q || normalize(`${p.name} ${p.tuss_code ?? ""} ${p.specialty ?? ""}`).includes(q))
      .slice(0, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedures, query, selected]);

  function addProcedure(procedure: ProcedureOption) {
    if (selectedIds.has(procedure.id)) return; // sem duplicidade
    onChange([...selected, { id: procedure.id, is_primary: selected.length === 0 }]);
    setQuery("");
    setOpen(false);
  }

  function removeProcedure(id: string) {
    const next = selected.filter((p) => p.id !== id);
    // Se removeu o principal, promove o primeiro que sobrou.
    if (next.length > 0 && !next.some((p) => p.is_primary)) {
      next[0] = { ...next[0], is_primary: true };
    }
    onChange(next);
  }

  function setPrimary(id: string) {
    onChange(selected.map((p) => ({ ...p, is_primary: p.id === id })));
  }

  const primary = selected.find((p) => p.is_primary) ?? selected[0];

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="procedure_search"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            else if (e.key === "Enter" && open) {
              e.preventDefault();
              if (available[0]) addProcedure(available[0]);
            }
          }}
          placeholder={
            selected.length === 0
              ? "Buscar procedimento por nome, código TUSS ou especialidade..."
              : "Adicionar outro procedimento..."
          }
          autoComplete="off"
          aria-invalid={invalid || undefined}
          className={cn(
            "h-10 w-full rounded-md border bg-card pl-9 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            invalid ? "border-red-500" : "border-input"
          )}
        />

        {open ? (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
            {available.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {procedures.length === 0 ? "Nenhum procedimento cadastrado." : "Nenhum procedimento encontrado."}
              </p>
            ) : (
              <ul className="max-h-60 overflow-y-auto py-1">
                {available.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => addProcedure(p)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="min-w-0 flex-1">
                        {p.name}
                        {p.specialty ? (
                          <span className="block text-xs text-muted-foreground">{p.specialty}</span>
                        ) : null}
                      </span>
                      {p.tuss_code ? (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          TUSS {p.tuss_code}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {selected.map((s) => {
            const p = byId.get(s.id);
            const label = p?.name ?? "Procedimento";
            return (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => setPrimary(s.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                  title={s.is_primary ? "Procedimento principal" : "Marcar como principal"}
                >
                  <Star
                    className={cn(
                      "h-4 w-4 shrink-0",
                      s.is_primary ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[
                        p?.tuss_code ? `TUSS ${p.tuss_code}` : "Sem código TUSS",
                        p?.specialty,
                        p?.materials_count ? `Kit padrão: ${p.materials_count} ${p.materials_count === 1 ? "material" : "materiais"}` : null,
                        s.is_primary ? "principal" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeProcedure(s.id)}
                  className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remover ${label}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selected.length > 1 ? (
        <p className="text-xs text-muted-foreground">Toque na ⭐ para marcar o procedimento principal.</p>
      ) : null}

      {selected.map((s) => (
        <input key={s.id} type="hidden" name="procedure_ids" value={s.id} />
      ))}
      <input type="hidden" name="primary_procedure_id" value={primary?.id ?? ""} />
    </div>
  );
}
