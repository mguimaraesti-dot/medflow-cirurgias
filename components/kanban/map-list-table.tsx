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

/** Mesmo critério OK/Pendente/Dispensado usado nos cards de requisito da
 * tela de detalhe da cirurgia ("Requisitos para liberação"), só que
 * compacto pra caber numa célula de tabela. */
function StageBadge({ req }: { req: { is_satisfied: boolean; waived: boolean } | undefined }) {
  if (!req) return <span className="text-xs text-muted-foreground">—</span>;
  if (req.waived) return <span className="text-xs text-muted-foreground">Dispensado</span>;
  if (req.is_satisfied) {
    return <span className="text-xs text-emerald-600 dark:text-emerald-400">OK</span>;
  }
  return <span className="text-xs text-red-600 dark:text-red-400">Pendente</span>;
}

export function MapListTable({
  surgeries,
  openTasksBySurgery,
  documentsBySurgery,
}: {
  surgeries: SurgeryListItem[];
  openTasksBySurgery: Record<string, number>;
  documentsBySurgery: Record<string, number>;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Paciente</th>
            <th className="px-4 py-3">Hospital / Procedimento</th>
            <th className="px-4 py-3">Convênio</th>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Prioridade</th>
            <th className="px-3 py-3">Solic. hospitalar</th>
            <th className="px-3 py-3">Autorização</th>
            <th className="px-3 py-3">Materiais</th>
            <th className="px-3 py-3">Reserva</th>
            <th className="px-3 py-3">Pré-op</th>
            <th className="px-3 py-3">Tarefas</th>
            <th className="px-4 py-3">Situação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {surgeries.length === 0 ? (
            <EmptyRow colSpan={13} message="Nenhuma cirurgia encontrada para esse filtro." />
          ) : (
            surgeries.map((surgery) => {
              const authorization = surgery.requirements.find((r) => r.requirement_key === "authorization");
              const materials = surgery.requirements.find((r) => r.requirement_key === "materials");
              const orReservation = surgery.requirements.find((r) => r.requirement_key === "or_reservation");
              const preoperative = surgery.requirements.find((r) => r.requirement_key === "preoperative");
              const hasDocuments = (documentsBySurgery[surgery.id] ?? 0) > 0;
              const openTasks = openTasksBySurgery[surgery.id] ?? 0;
              const today = new Date().toISOString().slice(0, 10);
              const isOverdue =
                surgery.status === "active" &&
                !surgery.confirmed_date &&
                surgery.expected_date &&
                surgery.expected_date < today;

              return (
                <tr key={surgery.id} className="hover:bg-muted">
                  <td className="px-4 py-3">
                    <Link
                      href={`/surgeries/${surgery.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {surgery.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{surgery.patient?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <p>{surgery.hospital?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {surgery.primary_procedure?.name ?? "—"}
                      {surgery.procedures.length > 1 ? ` +${surgery.procedures.length - 1}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {surgery.attendance_type === "particular"
                      ? "Particular"
                      : surgery.insurance_provider?.name ?? "Convênio"}
                  </td>
                  <td className={cn("px-4 py-3", isOverdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                    {formatDate(surgery.confirmed_date ?? surgery.expected_date)}
                    {isOverdue ? " (atrasada)" : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{PRIORITY_LABEL[surgery.priority]}</td>
                  <td className="px-3 py-3">
                    {hasDocuments ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">OK</span>
                    ) : (
                      <span className="text-xs text-red-600 dark:text-red-400">Pendente</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <StageBadge req={authorization} />
                  </td>
                  <td className="px-3 py-3">
                    <StageBadge req={materials} />
                  </td>
                  <td className="px-3 py-3">
                    <StageBadge req={orReservation} />
                  </td>
                  <td className="px-3 py-3">
                    <StageBadge req={preoperative} />
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{openTasks || "—"}</td>
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
