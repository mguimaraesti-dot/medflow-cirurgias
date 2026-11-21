"use client";

import Link from "next/link";

import type { Task } from "@/lib/data/tasks";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/components/tasks/task-filters";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

const PRIORITY_VARIANT: Record<string, "outline" | "secondary" | "destructive"> = {
  low: "outline",
  normal: "outline",
  high: "secondary",
  urgent: "destructive",
};

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "done" || status === "cancelled") return false;
  return new Date(dueDate + "T00:00:00") < new Date(new Date().toDateString());
}

export function PendingTasksTable({
  tasks,
  surgeries,
  emptyMessage,
}: {
  tasks: Task[];
  surgeries: { id: string; code: string }[];
  emptyMessage: string;
}) {
  const columns: SortableColumn<Task>[] = [
    {
      key: "title",
      label: "Título",
      accessor: (task) => task.title,
      cell: (task) => <span className="font-medium text-foreground">{task.title}</span>,
    },
    {
      key: "category",
      label: "Categoria",
      accessor: (task) => CATEGORY_LABEL[task.category] ?? task.category,
      cell: (task) => <span className="text-muted-foreground">{CATEGORY_LABEL[task.category]}</span>,
    },
    {
      key: "priority",
      label: "Prioridade",
      accessor: (task) => PRIORITY_ORDER[task.priority] ?? 9,
      cell: (task) => (
        <Badge variant={PRIORITY_VARIANT[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
      ),
    },
    {
      key: "surgery",
      label: "Cirurgia",
      accessor: (task) => task.surgery?.code ?? null,
      cell: (task) => (
        <span className="text-muted-foreground">
          {task.surgery ? (
            <Link href={`/surgeries/${task.surgery.id}`} className="hover:underline">
              {task.surgery.code}
            </Link>
          ) : (
            "—"
          )}
        </span>
      ),
    },
    {
      key: "due_date",
      label: "Prazo",
      accessor: (task) => task.due_date,
      cell: (task) => (
        <span
          className={
            isOverdue(task.due_date, task.status)
              ? "font-medium text-red-600 dark:text-red-400"
              : "text-muted-foreground"
          }
        >
          {formatDate(task.due_date)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      accessor: (task) => STATUS_LABEL[task.status] ?? task.status,
      cell: (task) => <TaskStatusSelect task={task} />,
    },
    {
      key: "actions",
      label: "",
      cell: (task) => <TaskFormDialog task={task} surgeries={surgeries} />,
    },
  ];

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable columns={columns} rows={tasks} rowKey={(task) => task.id} emptyMessage={emptyMessage} />
    </div>
  );
}
