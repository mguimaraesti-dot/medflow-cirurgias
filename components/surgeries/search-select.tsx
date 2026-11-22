"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchSelectOption = {
  id: string;
  label: string;
  /** Texto secundário (ex.: CPF) mostrado ao lado e usado na busca. */
  hint?: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Campo de busca com lista (combobox). Valor controlado pelo pai; o `name`
 * gera um input hidden pro formulário. A busca ignora acento e caixa.
 */
export function SearchSelect({
  id,
  name,
  options,
  value,
  onChange,
  placeholder,
  emptyText = "Nenhum resultado.",
  invalid,
  action,
}: {
  id: string;
  name: string;
  options: SearchSelectOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  emptyText?: string;
  invalid?: boolean;
  /** Botão extra ao lado (ex.: "+" pra cadastro rápido). */
  action?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options.slice(0, 50);
    return options
      .filter((o) => normalize(`${o.label} ${o.hint ?? ""}`).includes(q))
      .slice(0, 50);
  }, [options, query]);

  function choose(option: SearchSelectOption) {
    onChange(option.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="flex items-stretch gap-2">
      <div ref={containerRef} className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          value={open ? query : (selected?.label ?? "")}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
            } else if (e.key === "Enter" && open) {
              e.preventDefault();
              if (filtered[0]) choose(filtered[0]);
            }
          }}
          placeholder={placeholder}
          className={cn(
            "h-10 w-full rounded-md border bg-card pl-9 pr-9 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            invalid ? "border-red-500" : "border-input"
          )}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-60" />

        {open ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>
            ) : (
              filtered.map((o) => (
                <li key={o.id} role="option" aria-selected={o.id === value}>
                  <button
                    type="button"
                    onClick={() => choose(o)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.hint ? <span className="shrink-0 text-xs text-muted-foreground">{o.hint}</span> : null}
                    {o.id === value ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
        <input type="hidden" name={name} value={value} />
      </div>
      {action}
    </div>
  );
}
