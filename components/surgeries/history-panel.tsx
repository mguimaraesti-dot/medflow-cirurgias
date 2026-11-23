"use client";

import { useState } from "react";
import { ChevronDown, Clock } from "lucide-react";

import { cn } from "@/lib/utils";

export type HistoryEntry = { id: string; description: string; changedAt: string; changedByName: string | null };

const fmt = (value: string) => new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Histórico recolhível: consultável sem ocupar espaço permanente. */
export function HistoryPanel({ history: entries }: { history: HistoryEntry[] }) {
  const [open, setOpen] = useState(false);
  // Mais recente no topo, independente da ordem em que os dados chegam.
  const history = [...entries].sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  return (
    <section className="rounded-xl border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Clock className="h-4 w-4" /></span>
          Histórico da cirurgia
          <span className="text-xs font-normal text-muted-foreground">({history.length})</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="border-t border-border p-4">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>
          ) : (
            <ol className="flex flex-col gap-2.5 border-l border-border pl-4">
              {history.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-foreground">{entry.description}</span>
                    <span className="text-xs text-muted-foreground">{fmt(entry.changedAt)}</span>
                  </div>
                  {entry.changedByName ? <p className="text-xs text-muted-foreground">Por {entry.changedByName}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </section>
  );
}
