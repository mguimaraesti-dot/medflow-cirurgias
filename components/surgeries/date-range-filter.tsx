"use client";

import { useState } from "react";

import { todayInSaoPaulo } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ANY = "__any";
const CUSTOM = "__custom";

type Range = { from: string; to: string };
type Preset = { id: string; label: string; range: (today: string) => Range };

function parse(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fmt(date: Date) {
  return date.toISOString().slice(0, 10);
}
function addDays(ymd: string, days: number) {
  const d = parse(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}
function monthRange(ymd: string, offset: number): Range {
  const d = parse(ymd);
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1));
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset + 1, 0));
  return { from: fmt(first), to: fmt(last) };
}

const PAST: Preset[] = [
  { id: "today", label: "Hoje", range: (t) => ({ from: t, to: t }) },
  { id: "7d", label: "Últimos 7 dias", range: (t) => ({ from: addDays(t, -6), to: t }) },
  { id: "30d", label: "Últimos 30 dias", range: (t) => ({ from: addDays(t, -29), to: t }) },
  { id: "month", label: "Este mês", range: (t) => monthRange(t, 0) },
  { id: "lastmonth", label: "Mês passado", range: (t) => monthRange(t, -1) },
];

const FUTURE: Preset[] = [
  { id: "today", label: "Hoje", range: (t) => ({ from: t, to: t }) },
  { id: "n7", label: "Próximos 7 dias", range: (t) => ({ from: t, to: addDays(t, 6) }) },
  { id: "n30", label: "Próximos 30 dias", range: (t) => ({ from: t, to: addDays(t, 29) }) },
  { id: "month", label: "Este mês", range: (t) => monthRange(t, 0) },
  { id: "nextmonth", label: "Próximo mês", range: (t) => monthRange(t, 1) },
];

const BOTH: Preset[] = [
  { id: "today", label: "Hoje", range: (t) => ({ from: t, to: t }) },
  { id: "30d", label: "Últimos 30 dias", range: (t) => ({ from: addDays(t, -29), to: t }) },
  { id: "n30", label: "Próximos 30 dias", range: (t) => ({ from: t, to: addDays(t, 29) }) },
  { id: "lastmonth", label: "Mês passado", range: (t) => monthRange(t, -1) },
  { id: "month", label: "Este mês", range: (t) => monthRange(t, 0) },
  { id: "nextmonth", label: "Próximo mês", range: (t) => monthRange(t, 1) },
];

/**
 * Filtro de período em menu suspenso: períodos prontos + "Personalizado"
 * (que mostra os dois campos de data). Grava de/até na URL via `onChange`.
 */
export function DateRangeFilter({
  label,
  kind,
  from,
  to,
  onChange,
  inline = false,
}: {
  /** Compacto: o rótulo vai dentro do botão e os campos de data ficam na mesma linha. */
  inline?: boolean;
  label: string;
  /** past = datas já ocorridas (solicitação); future = datas a vir (previsão); both = passado e futuro. */
  kind: "past" | "future" | "both";
  from: string;
  to: string;
  onChange: (range: Range | null) => void;
}) {
  const [forceCustom, setForceCustom] = useState(false);
  const today = todayInSaoPaulo();
  const presets = kind === "past" ? PAST : kind === "future" ? FUTURE : BOTH;

  const matched = presets.find((p) => {
    const r = p.range(today);
    return r.from === from && r.to === to;
  });
  const hasRange = Boolean(from || to);
  const value = forceCustom ? CUSTOM : matched ? matched.id : hasRange ? CUSTOM : ANY;
  const showInputs = value === CUSTOM;

  function select(v: string) {
    if (v === ANY) {
      setForceCustom(false);
      onChange(null);
    } else if (v === CUSTOM) {
      setForceCustom(true);
    } else {
      setForceCustom(false);
      const preset = presets.find((p) => p.id === v);
      if (preset) onChange(preset.range(today));
    }
  }

  const id = `f-${kind}-${label.replace(/\W/g, "")}`;

  return (
    <div className={cn("flex min-w-[10rem] flex-1 md:flex-none", inline ? "flex-row flex-wrap items-center gap-1.5" : "flex-col gap-1")}>
      {inline ? null : (
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={select}>
        <SelectTrigger id={id} className={cn(inline ? "h-9 w-full gap-1.5 md:w-auto" : "h-10 md:w-48")} aria-label={label}>
          {inline ? <span className="shrink-0 text-muted-foreground">{label}:</span> : null}
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Qualquer data</SelectItem>
          {presets.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM}>Personalizado…</SelectItem>
        </SelectContent>
      </Select>
      {showInputs ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label={`${label} — de`}
            className={cn("min-w-0 flex-1", inline ? "h-9 md:w-36 md:flex-none" : "h-10")}
            value={from}
            max={to || undefined}
            onChange={(e) => onChange({ from: e.target.value, to })}
          />
          <span className="text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            aria-label={`${label} — até`}
            className={cn("min-w-0 flex-1", inline ? "h-9 md:w-36 md:flex-none" : "h-10")}
            value={to}
            min={from || undefined}
            onChange={(e) => onChange({ from, to: e.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}
