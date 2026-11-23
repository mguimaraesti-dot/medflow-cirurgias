import Link from "next/link";
import {
  AlertOctagon, ArrowDownRight, ArrowUpRight, CalendarCheck, CheckCircle2, ClipboardList, FileText, Hourglass,
  Landmark, ShieldCheck, Stethoscope, Wallet, XCircle, Workflow,
} from "lucide-react";

import type { DashboardFilters, DashboardOverview, FinancePanelDataShape, KpiKey } from "@/components/dashboard/dashboard-types";
import type { ScheduleSurgeryItem } from "@/lib/data/surgeries";
import { deriveScheduleStatus, SCHEDULE_STATUS_COLOR, SCHEDULE_STATUS_LABEL } from "@/lib/schedule-status";
import { cn } from "@/lib/utils";

export function PanelSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl border border-border bg-card/60", className)} aria-busy="true" aria-label="Carregando" />;
}

export function PanelError({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
      Não foi possível carregar: {title}. Tente atualizar a página.
    </div>
  );
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Parâmetros que levam o filtro do Dashboard para a lista do Mapa Cirúrgico. */
function mapHref(f: DashboardFilters, extra: Record<string, string>, withPeriod = true) {
  const p = new URLSearchParams({ view: "lista", ...extra });
  if (withPeriod) {
    p.set("dfrom", f.from);
    p.set("dto", f.to);
  }
  if (f.hospitalId) p.set("hospital", f.hospitalId);
  if (f.attendance) p.set("attendance", f.attendance);
  return `/kanban?${p.toString()}`;
}

const KPI_META: Record<KpiKey, { label: string; icon: typeof Stethoscope; tone: string; ring: string }> = {
  total: { label: "Cirurgias no período", icon: Stethoscope, tone: "bg-blue-500/15 text-blue-400", ring: "hover:border-blue-500/50" },
  confirmed: { label: "Confirmadas", icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-400", ring: "hover:border-emerald-500/50" },
  awaiting: { label: "Aguardando autorização", icon: Hourglass, tone: "bg-amber-500/15 text-amber-400", ring: "hover:border-amber-500/50" },
  critical: { label: "Pendências críticas", icon: AlertOctagon, tone: "bg-red-500/15 text-red-400", ring: "hover:border-red-500/50" },
  completed: { label: "Realizadas", icon: CalendarCheck, tone: "bg-emerald-500/15 text-emerald-400", ring: "hover:border-emerald-500/50" },
  cancelled: { label: "Canceladas", icon: XCircle, tone: "bg-red-500/15 text-red-400", ring: "hover:border-red-500/50" },
};

export function KpiGrid({ overview, filters }: { overview: DashboardOverview; filters: DashboardFilters }) {
  const hrefs: Record<KpiKey, string> = {
    total: mapHref(filters, {}),
    confirmed: mapHref(filters, { status: "active", confirmed: "1" }),
    awaiting: mapHref(filters, { status: "active", pending: "authorization" }),
    critical: "#central-de-atencao",
    completed: mapHref(filters, { status: "completed" }),
    cancelled: mapHref(filters, { status: "cancelled" }),
  };
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
      {overview.kpis.map((k) => {
        const m = KPI_META[k.key];
        const Icon = m.icon;
        const good = k.delta === null || k.delta === 0 || k.upIsGood === null ? null : (k.delta > 0) === k.upIsGood;
        const critical = k.key === "critical" && k.value > 0;
        return (
          <Link
            key={k.key}
            href={hrefs[k.key]}
            className={cn("rounded-xl border bg-card p-3 shadow-sm transition-colors sm:p-4", critical ? "border-red-500/50" : "border-border", m.ring)}
          >
            <div className="flex items-start gap-2.5">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", m.tone)}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <p className="min-w-0 text-xs font-medium leading-tight text-muted-foreground">{m.label}</p>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="text-2xl font-semibold leading-none text-foreground sm:text-3xl">{k.value}</p>
              {k.delta === null ? (
                <span className="text-[11px] text-muted-foreground">{k.key === "awaiting" || k.key === "critical" ? "agora" : "s/ base"}</span>
              ) : (
                <span className={cn("flex items-center text-xs font-semibold", good === null ? "text-muted-foreground" : good ? "text-emerald-400" : "text-red-400")}>
                  {k.delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {Math.abs(k.delta)}%
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const FLOW_ICON: Record<string, typeof FileText> = {
  new_indication: FileText,
  authorization: ShieldCheck,
  or_reservation: CalendarCheck,
  preoperative: ClipboardList,
  released: CheckCircle2,
  completed: CheckCircle2,
};
const FLOW_TONE = ["text-blue-400 bg-blue-500/15", "text-emerald-400 bg-emerald-500/15", "text-amber-400 bg-amber-500/15", "text-pink-400 bg-pink-500/15", "text-violet-400 bg-violet-500/15", "text-emerald-400 bg-emerald-500/15"];

export function FlowPanel({ overview, filters }: { overview: DashboardOverview; filters: DashboardFilters }) {
  const last = overview.flow.length - 1;
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
        <Workflow className="h-5 w-5 text-primary" /> Visão do fluxo
      </h2>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {overview.flow.map(({ stage, count }, i) => {
          const Icon = FLOW_ICON[stage.code] ?? FileText;
          const href = mapHref(filters, i === last ? { status: "completed", stage: stage.id } : { status: "active", stage: stage.id });
          return (
            <li key={stage.id}>
              <Link href={href} className="flex h-full flex-col items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2 py-3 text-center transition-colors hover:border-primary/50 hover:bg-muted/60">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", FLOW_TONE[i % FLOW_TONE.length])}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground">{stage.name}</span>
                <span className="text-2xl font-semibold text-foreground">{count}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[11px] text-muted-foreground">Etapas reais do Mapa Cirúrgico, com as cirurgias do período (ativas e realizadas).</p>
    </section>
  );
}

function fmtDate(v: string | null) {
  if (!v) return "—";
  const d = new Date(`${v}T12:00:00`);
  const wd = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  const [, m, day] = v.split("-");
  return `${day}/${m} ${wd.charAt(0).toUpperCase()}${wd.slice(1)}`;
}

export function AgendaPanel({ surgeries }: { surgeries: ScheduleSurgeryItem[] }) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CalendarCheck className="h-5 w-5 text-primary" /> Agenda dos próximos 7 dias
        </h2>
        <Link href="/kanban" className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground hover:bg-muted">Ver agenda →</Link>
      </header>
      {surgeries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma cirurgia nos próximos 7 dias.</p>
      ) : (
        <>
          {/* Desktop: tabela */}
          <table className="hidden w-full text-sm md:table">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium">Data</th>
                <th className="px-2 py-2 text-left font-medium">Paciente</th>
                <th className="px-2 py-2 text-left font-medium">Procedimento</th>
                <th className="px-2 py-2 text-left font-medium">Hospital</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {surgeries.map((s) => {
                const st = deriveScheduleStatus(s);
                return (
                  <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-foreground">
                      <Link href={`/surgeries/${s.id}`} className="block">{fmtDate(s.confirmed_date ?? s.expected_date)}{s.confirmed_time ? ` · ${s.confirmed_time.slice(0, 5)}` : ""}</Link>
                    </td>
                    <td className="px-2 py-2.5 font-medium text-foreground">{s.patient?.full_name ?? "—"}</td>
                    <td className="max-w-[220px] truncate px-2 py-2.5 text-muted-foreground" title={s.primary_procedure?.name ?? ""}>{s.primary_procedure?.name ?? "—"}</td>
                    <td className="max-w-[160px] truncate px-2 py-2.5 text-muted-foreground">{s.hospital?.name ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", SCHEDULE_STATUS_COLOR[st].badge)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", SCHEDULE_STATUS_COLOR[st].dot)} />
                        {SCHEDULE_STATUS_LABEL[st]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Mobile: cards */}
          <ul className="divide-y divide-border md:hidden">
            {surgeries.map((s) => {
              const st = deriveScheduleStatus(s);
              return (
                <li key={s.id}>
                  <Link href={`/surgeries/${s.id}`} className={cn("flex items-start justify-between gap-3 border-l-4 px-4 py-3", SCHEDULE_STATUS_COLOR[st].border)}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{s.patient?.full_name ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.primary_procedure?.name ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.hospital?.name ?? "—"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-foreground">{fmtDate(s.confirmed_date ?? s.expected_date)}</p>
                      {s.confirmed_time ? <p className="text-[11px] text-muted-foreground">{s.confirmed_time.slice(0, 5)}</p> : null}
                      <span className={cn("mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium", SCHEDULE_STATUS_COLOR[st].badge)}>{SCHEDULE_STATUS_LABEL[st]}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

export function FinancePanel({ data, hrefs }: { data: FinancePanelDataShape; hrefs: Record<"particular" | "convenio", string> }) {
  const items = [
    { label: "Previsto", value: data.expected, tone: "text-blue-400" },
    { label: "Recebido", value: data.received, tone: "text-emerald-400" },
    { label: "Em aberto", value: data.outstanding, tone: "text-amber-400" },
    { label: "Vencido", value: data.overdue, tone: "text-red-400" },
  ];
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          {data.mode === "particular" ? <Wallet className="h-5 w-5 text-emerald-400" /> : <Landmark className="h-5 w-5 text-emerald-400" />}
          Financeiro {data.mode === "particular" ? "particular" : "de convênios"}
        </h2>
        <div className="flex gap-1 rounded-lg border border-border p-0.5 text-xs">
          {(["particular", "convenio"] as const).map((m) => (
            <Link key={m} href={hrefs[m]} scroll={false} className={cn("rounded-md px-2.5 py-1", data.mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              {m === "particular" ? "Particular" : "Convênios"}
            </Link>
          ))}
        </div>
      </header>
      {data.records === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum registro financeiro {data.mode === "particular" ? "particular" : "de convênio"} nas cirurgias do período.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {items.map((i) => (
              <div key={i.label} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{i.label}</p>
                <p className={cn("truncate text-base font-semibold sm:text-sm lg:text-base", i.tone)}>{brl(i.value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Recebido sobre o previsto</span>
              <span className="font-semibold text-foreground">{data.percentReceived === null ? "—" : `${data.percentReceived}%`}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${data.percentReceived ?? 0}%` }} />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {data.records} registro(s). Valores previstos nunca entram como recebidos; recebimentos parciais e baixas vêm dos registros financeiros.
          </p>
        </>
      )}
    </section>
  );
}
