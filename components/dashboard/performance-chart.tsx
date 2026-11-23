"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, BarChart3 } from "lucide-react";

import type { PerformanceData } from "@/lib/data/dashboard-performance";
import { cn } from "@/lib/utils";

function Rate({ label, value, tone }: { label: string; value: number | null; tone: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold", tone)}>{value === null ? "—" : `${value}%`}</p>
    </div>
  );
}

export function PerformanceChart({ data, monthsBack, hrefs }: { data: PerformanceData; monthsBack: 6 | 12; hrefs: Record<6 | 12, string> }) {
  const empty = data.totals.previstas === 0;
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <BarChart3 className="h-5 w-5 text-primary" /> Desempenho cirúrgico
        </h2>
        <div className="flex gap-1 rounded-lg border border-border p-0.5 text-xs">
          {([6, 12] as const).map((m) => (
            <Link key={m} href={hrefs[m]} scroll={false} className={cn("rounded-md px-2.5 py-1", monthsBack === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              {m} meses
            </Link>
          ))}
        </div>
      </header>
      {empty ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Sem cirurgias com data no período.</p>
      ) : (
        <>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.months} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={monthsBack === 12 ? 1 : 0} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={32} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "var(--foreground)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="previstas" name="Previstas" fill="#8da2fb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="realizadas" name="Realizadas" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="canceladas" name="Canceladas" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Rate label="Taxa de realização" value={data.completionRate} tone="text-emerald-400" />
            <Rate label="Taxa de cancelamento" value={data.cancellationRate} tone="text-red-400" />
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Evolução (realizadas)</p>
              <p className={cn("flex items-center gap-1 text-lg font-semibold", data.evolution === null ? "text-muted-foreground" : data.evolution >= 0 ? "text-emerald-400" : "text-red-400")}>
                {data.evolution === null ? "—" : (<>{data.evolution >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{Math.abs(data.evolution)}%</>)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Cada cirurgia conta uma vez, no mês da data confirmada (ou prevista). Previstas = programadas no mês; realizadas e canceladas são parte delas.
          </p>
        </>
      )}
    </section>
  );
}
