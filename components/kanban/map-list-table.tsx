import Link from "next/link";

import type { SurgeryListItem } from "@/lib/data/surgeries";
import { Badge } from "@/components/ui/badge";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

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

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

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

/** Status de requisito traduzido pra número, pra ordenação da coluna poder
 * comparar: Pendente < Dispensado < OK (quanto mais "resolvido", maior). */
function requirementRank(req: { is_satisfied: boolean; waived: boolean } | undefined) {
  if (!req) return -1;
  if (req.is_satisfied) return 2;
  if (req.waived) return 1;
  return 0;
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
  const today = new Date().toISOString().slice(0, 10);

  const columns: SortableColumn<SurgeryListItem>[] = [
    {
      key: "code",
      label: "Código",
      accessor: (s) => s.code,
      cell: (surgery) => (
        <Link href={`/surgeries/${surgery.id}`} className="font-medium text-foreground hover:underline">
          {surgery.code}
        </Link>
      ),
    },
    {
      key: "patient",
      label: "Paciente",
      accessor: (s) => s.patient?.full_name ?? null,
      cell: (surgery) => <span className="text-muted-foreground">{surgery.patient?.full_name ?? "—"}</span>,
    },
    {
      key: "hospital",
      label: "Hospital / Procedimento",
      accessor: (s) => s.hospital?.name ?? null,
      cell: (surgery) => (
        <div className="text-muted-foreground">
          <p>{surgery.hospital?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {surgery.primary_procedure?.name ?? "—"}
            {surgery.procedures.length > 1 ? ` +${surgery.procedures.length - 1}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "insurance",
      label: "Convênio",
      accessor: (s) => (s.attendance_type === "particular" ? "Particular" : s.insurance_provider?.name ?? "Convênio"),
      cell: (surgery) => (
        <span className="text-muted-foreground">
          {surgery.attendance_type === "particular" ? "Particular" : surgery.insurance_provider?.name ?? "Convênio"}
        </span>
      ),
    },
    {
      key: "date",
      label: "Data",
      accessor: (s) => s.confirmed_date ?? s.expected_date ?? null,
      cell: (surgery) => {
        const isOverdue =
          surgery.status === "active" &&
          !surgery.confirmed_date &&
          surgery.expected_date &&
          surgery.expected_date < today;
        return (
          <span className={isOverdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"}>
            {formatDate(surgery.confirmed_date ?? surgery.expected_date)}
            {isOverdue ? " (atrasada)" : ""}
          </span>
        );
      },
    },
    {
      key: "priority",
      label: "Prioridade",
      accessor: (s) => PRIORITY_ORDER[s.priority] ?? 9,
      cell: (surgery) => <span className="text-muted-foreground">{PRIORITY_LABEL[surgery.priority]}</span>,
    },
    {
      key: "documents",
      label: "Solic. hospitalar",
      className: "px-3",
      accessor: (s) => ((documentsBySurgery[s.id] ?? 0) > 0 ? 1 : 0),
      cell: (surgery) => {
        const hasDocuments = (documentsBySurgery[surgery.id] ?? 0) > 0;
        return hasDocuments ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">OK</span>
        ) : (
          <span className="text-xs text-red-600 dark:text-red-400">Pendente</span>
        );
      },
    },
    {
      key: "authorization",
      label: "Autorização",
      className: "px-3",
      accessor: (s) => requirementRank(s.requirements.find((r) => r.requirement_key === "authorization")),
      cell: (surgery) => <StageBadge req={surgery.requirements.find((r) => r.requirement_key === "authorization")} />,
    },
    {
      key: "materials",
      label: "Materiais",
      className: "px-3",
      accessor: (s) => requirementRank(s.requirements.find((r) => r.requirement_key === "materials")),
      cell: (surgery) => <StageBadge req={surgery.requirements.find((r) => r.requirement_key === "materials")} />,
    },
    {
      key: "or_reservation",
      label: "Reserva",
      className: "px-3",
      accessor: (s) => requirementRank(s.requirements.find((r) => r.requirement_key === "or_reservation")),
      cell: (surgery) => <StageBadge req={surgery.requirements.find((r) => r.requirement_key === "or_reservation")} />,
    },
    {
      key: "preoperative",
      label: "Pré-op",
      className: "px-3",
      accessor: (s) => requirementRank(s.requirements.find((r) => r.requirement_key === "preoperative")),
      cell: (surgery) => <StageBadge req={surgery.requirements.find((r) => r.requirement_key === "preoperative")} />,
    },
    {
      key: "tasks",
      label: "Tarefas",
      className: "px-3",
      accessor: (s) => openTasksBySurgery[s.id] ?? 0,
      cell: (surgery) => (
        <span className="text-muted-foreground">{openTasksBySurgery[surgery.id] ?? "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Situação",
      accessor: (s) => STATUS_LABEL[s.status] ?? s.status,
      cell: (surgery) => (
        <Badge variant={STATUS_VARIANT[surgery.status] ?? "outline"}>
          {STATUS_LABEL[surgery.status] ?? surgery.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={surgeries}
        rowKey={(s) => s.id}
        emptyMessage="Nenhuma cirurgia encontrada para esse filtro."
      />
    </div>
  );
}
