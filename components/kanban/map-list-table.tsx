"use client";

import Link from "next/link";

import type { SurgeryListItem, WorkflowStage } from "@/lib/data/surgeries";
import { Badge } from "@/components/ui/badge";
import { RequirementBadges } from "@/components/kanban/requirement-badges";
import { getStageColor } from "@/components/kanban/stage-palette";
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

const PRIORITY_VARIANT: Record<string, "secondary" | "info" | "warning" | "destructive"> = {
  low: "secondary",
  normal: "info",
  high: "warning",
  urgent: "destructive",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function satisfiedCount(requirements: SurgeryListItem["requirements"]) {
  return requirements.filter((r) => r.is_satisfied).length;
}

export function MapListTable({
  surgeries,
  stages,
  openTasksBySurgery,
  documentsBySurgery,
}: {
  surgeries: SurgeryListItem[];
  stages: WorkflowStage[];
  openTasksBySurgery: Record<string, number>;
  documentsBySurgery: Record<string, number>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const stageIndexById = new Map(stages.map((stage, index) => [stage.id, index]));

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
      key: "procedure",
      label: "Procedimento",
      accessor: (s) => s.primary_procedure?.name ?? null,
      cell: (surgery) => (
        <span className="text-muted-foreground">
          {surgery.primary_procedure?.name ?? "—"}
          {surgery.procedures.length > 1 ? ` +${surgery.procedures.length - 1}` : ""}
        </span>
      ),
    },
    {
      key: "hospital",
      label: "Hospital",
      accessor: (s) => s.hospital?.name ?? null,
      cell: (surgery) => <span className="text-muted-foreground">{surgery.hospital?.name ?? "—"}</span>,
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
      key: "priority",
      label: "Prioridade",
      accessor: (s) => PRIORITY_ORDER[s.priority] ?? 9,
      cell: (surgery) => (
        <Badge variant={PRIORITY_VARIANT[surgery.priority]}>{PRIORITY_LABEL[surgery.priority]}</Badge>
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
            {isOverdue ? " · atrasada" : ""}
          </span>
        );
      },
    },
    {
      key: "stage",
      label: "Etapa",
      accessor: (s) => stageIndexById.get(s.stage_id) ?? 0,
      cell: (surgery) => {
        const index = stageIndexById.get(surgery.stage_id) ?? 0;
        const stage = stages[index];
        return (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: getStageColor(index, stages.length) }}
            />
            {stage?.name ?? "—"}
          </span>
        );
      },
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
          <span className="text-xs text-amber-600 dark:text-amber-400">Pendente</span>
        );
      },
    },
    {
      key: "requirements",
      label: "Pendências",
      className: "px-3",
      accessor: (s) => satisfiedCount(s.requirements),
      cell: (surgery) => <RequirementBadges requirements={surgery.requirements} />,
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
