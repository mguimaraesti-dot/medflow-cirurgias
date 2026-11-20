import Link from "next/link";

import type { SurgeryListItem } from "@/lib/data/surgeries";
import { EmptyRow } from "@/components/shared/empty-row";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  rescheduled: "Reagendada",
  cancelled: "Cancelada",
  completed: "Realizada",
};

const STATUS_VARIANT: Record<string, "secondary" | "destructive" | "default" | "outline"> = {
  active: "secondary",
  rescheduled: "outline",
  cancelled: "destructive",
  completed: "default",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export function MapListTable({
  surgeries,
  openTasksBySurgery,
}: {
  surgeries: SurgeryListItem[];
  openTasksBySurgery: Record<string, number>;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Paciente</th>
            <th className="px-4 py-3">Hospital / Procedimento</th>
            <th className="px-4 py-3">Convênio</th>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Prioridade</th>
            <th className="px-4 py-3">Materiais</th>
            <th className="px-4 py-3">Pendências</th>
            <th className="px-4 py-3">Situação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {surgeries.length === 0 ? (
            <EmptyRow colSpan={9} message="Nenhuma cirurgia encontrada para esse filtro." />
          ) : (
            surgeries.map((surgery) => {
              const materials = surgery.requirements.find((r) => r.requirement_key === "materials");
              const openTasks = openTasksBySurgery[surgery.id] ?? 0;
              const today = new Date().toISOString().slice(0, 10);
              const isOverdue =
                surgery.status === "active" &&
                !surgery.confirmed_date &&
                surgery.expected_date &&
                surgery.expected_date < today;

              return (
                <tr key={surgery.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/surgeries/${surgery.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {surgery.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{surgery.patient?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{surgery.hospital?.name ?? "—"}</p>
                    <p className="text-xs text-slate-400">{surgery.primary_procedure?.name ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {surgery.attendance_type === "particular"
                      ? "Particular"
                      : surgery.insurance_provider?.name ?? "Convênio"}
                  </td>
                  <td className={cn("px-4 py-3", isOverdue ? "font-medium text-red-600" : "text-slate-600")}>
                    {formatDate(surgery.confirmed_date ?? surgery.expected_date)}
                    {isOverdue ? " (atrasada)" : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{PRIORITY_LABEL[surgery.priority]}</td>
                  <td className="px-4 py-3">
                    {!materials || materials.waived ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : materials.is_satisfied ? (
                      <span className="text-xs text-emerald-600">OK</span>
                    ) : (
                      <span className="text-xs text-red-600">Pendente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{openTasks || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[surgery.status] ?? "outline"}>
                      {STATUS_LABEL[surgery.status] ?? surgery.status}
                    </Badge>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
