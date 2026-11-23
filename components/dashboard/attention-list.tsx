"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ChevronRight, ClipboardX, FileWarning, FlaskConical, ListChecks, Building2, CalendarClock, User, Clock } from "lucide-react";

import type { AttentionItem, AttentionKind, AttentionLevel } from "@/lib/data/dashboard-attention";
import { cn } from "@/lib/utils";

const LEVEL: Record<AttentionLevel, { label: string; bar: string; badge: string }> = {
  critical: { label: "Crítico", bar: "bg-red-500", badge: "bg-red-500/15 text-red-400 border-red-500/30" },
  high: { label: "Alto", bar: "bg-amber-500", badge: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  medium: { label: "Médio", bar: "bg-blue-500", badge: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
};

const ICON: Record<AttentionKind, typeof Clock> = {
  authorization: Clock,
  materials: FlaskConical,
  documents: FileWarning,
  hospital: Building2,
  task: ListChecks,
  unconfirmed: CalendarClock,
};

function ageLabel(d: number) {
  if (d <= 0) return "hoje";
  return `${d} dia${d === 1 ? "" : "s"}`;
}

export function AttentionList({ items, initial = 5 }: { items: AttentionItem[]; initial?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, initial);
  const counts = { critical: 0, high: 0, medium: 0 } as Record<AttentionLevel, number>;
  for (const i of items) counts[i.level]++;

  return (
    <section id="central-de-atencao" className="scroll-mt-4 rounded-xl border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Central de atenção
          {items.length > 0 ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{items.length}</span> : null}
        </h2>
        {items.length > 0 ? (
          <div className="flex items-center gap-1.5 text-[11px]">
            {(["critical", "high", "medium"] as AttentionLevel[]).map((l) => (
              <span key={l} className={cn("rounded-full border px-2 py-0.5", LEVEL[l].badge)}>
                {counts[l]} {LEVEL[l].label.toLowerCase()}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
          <ClipboardX className="h-4 w-4" /> Nenhuma pendência identificada pelas regras atuais.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {shown.map((it) => {
            const Icon = ICON[it.kind];
            return (
              <li key={it.id}>
                <Link href={it.href} className="flex items-stretch gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                  <span className={cn("w-1 shrink-0 rounded-full", LEVEL[it.level].bar)} />
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-medium text-foreground">{it.title}</p>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", LEVEL[it.level].badge)}>{LEVEL[it.level].label}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{it.detail}</p>
                    <p className="mt-1 truncate text-xs text-foreground/80">
                      {[it.patient, it.procedure].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{it.responsible ?? "Sem responsável"}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ageLabel(it.ageDays)}</span>
                    </p>
                  </div>
                  <ChevronRight className="my-auto h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > initial ? (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border px-4 py-2.5 text-xs font-medium text-primary hover:bg-muted/50"
        >
          {all ? "Mostrar menos" : `Ver todas (${items.length})`}
          <ArrowRight className={cn("h-3.5 w-3.5 transition-transform", all && "-rotate-90")} />
        </button>
      ) : null}
    </section>
  );
}
