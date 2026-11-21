"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterDisclosure } from "@/components/shared/filter-disclosure";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Calcula o intervalo de um atalho de período, com base na data de hoje
 * — mesma ideia do atalho de período do Mapa Cirúrgico (map-filters.tsx),
 * mas sem a opção "Todo período": relatório sempre tem um período. */
function presetRange(preset: string): { from: string; to: string } | null {
  const today = new Date();
  if (preset === "month") {
    return { from: toISODate(startOfMonth(today)), to: toISODate(endOfMonth(today)) };
  }
  if (preset === "last_month") {
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { from: toISODate(startOfMonth(prev)), to: toISODate(endOfMonth(prev)) };
  }
  if (preset === "year") {
    return { from: `${today.getFullYear()}-01-01`, to: `${today.getFullYear()}-12-31` };
  }
  return null;
}

const PRESETS = ["month", "last_month", "year"] as const;

const REPORT_TYPES = [
  { value: "cirurgias", label: "Cirurgias no período" },
  { value: "financeiro", label: "Financeiro (particular)" },
  { value: "produtividade", label: "Produtividade mensal" },
] as const;

const STATUS_OPTIONS = [
  { value: "active", label: "Ativa" },
  { value: "rescheduled", label: "Reagendada" },
  { value: "completed", label: "Realizada" },
  { value: "cancelled", label: "Cancelada" },
];

export function ReportFilters({ hospitals }: { hospitals: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const type = searchParams.get("type") ?? "cirurgias";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function matchedPreset(): string {
    const match = PRESETS.find((p) => {
      const range = presetRange(p);
      return range && range.from === from && range.to === to;
    });
    return match ?? "custom";
  }

  const [selectedPreset, setSelectedPreset] = useState(matchedPreset);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com a URL (back/forward, troca de atalho), não é estado derivável em render
    setSelectedPreset(matchedPreset());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  function setParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function handlePresetChange(value: string) {
    setSelectedPreset(value);
    if (value === "custom") return; // espera o usuário preencher as datas
    const range = presetRange(value);
    if (range) setParams({ from: range.from, to: range.to });
  }

  const exportParams = new URLSearchParams();
  exportParams.set("type", type);
  exportParams.set("from", from);
  exportParams.set("to", to);
  const hospitalParam = searchParams.get("hospital");
  if (hospitalParam) exportParams.set("hospital", hospitalParam);
  const statusParam = searchParams.get("status");
  if (type === "cirurgias" && statusParam) exportParams.set("status", statusParam);
  const exportHref = `/api/reports/export?${exportParams.toString()}`;

  const activeCount = [hospitalParam, type === "cirurgias" ? statusParam : null].filter(Boolean).length;

  return (
    <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
      <FilterDisclosure activeCount={activeCount}>
        <Select value={type} onValueChange={(v) => setParams({ type: v, status: undefined })}>
          <SelectTrigger className="w-full shrink-0 md:w-[200px]">
            <SelectValue placeholder="Relatório" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full shrink-0 md:w-[135px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="last_month">Mês anterior</SelectItem>
            <SelectItem value="year">Este ano</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {selectedPreset === "custom" ? (
          <>
            <Input
              type="date"
              className="w-[calc(50%-12px)] shrink-0 md:w-[150px]"
              value={from}
              onChange={(e) => setParams({ from: e.target.value, to })}
            />
            <span className="shrink-0 text-xs text-muted-foreground">até</span>
            <Input
              type="date"
              className="w-[calc(50%-12px)] shrink-0 md:w-[150px]"
              value={to}
              onChange={(e) => setParams({ from, to: e.target.value })}
            />
          </>
        ) : null}

        <Select value={searchParams.get("hospital") ?? "all"} onValueChange={(v) => setParams({ hospital: v })}>
          <SelectTrigger className="w-full shrink-0 md:w-[170px]">
            <SelectValue placeholder="Hospital" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os hospitais</SelectItem>
            {hospitals.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {type === "cirurgias" ? (
          <Select value={statusParam ?? "all"} onValueChange={(v) => setParams({ status: v })}>
            <SelectTrigger className="w-full shrink-0 md:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </FilterDisclosure>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={exportHref} download>
            Exportar CSV
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="print:hidden"
          onClick={() => window.print()}
        >
          Imprimir / PDF
        </Button>
      </div>
    </div>
  );
}
