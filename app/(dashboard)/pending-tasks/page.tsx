import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listTasks, type Task } from "@/lib/data/tasks";
import { listSurgeriesForSelect } from "@/lib/data/surgeries";
import { Badge } from "@/components/ui/badge";
import { TaskFilters, CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/components/tasks/task-filters";
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

export default async function PendingTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; priority?: string; status?: string; q?: string }>;
}) {
  await requireModuleView("pending_tasks");
  const filters = await searchParams;
  const supabase = await createClient();
  const [tasks, surgeries] = await Promise.all([
    listTasks(supabase, filters),
    listSurgeriesForSelect(supabase),
  ]);

  const hasActiveFilters = filters.category || filters.priority || filters.status || filters.q;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Pendências</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tarefas e alertas por categoria, prioridade e prazo.
          </p>
        </div>
        <TaskFormDialog surgeries={surgeries} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <TaskFilters />
        <p className="whitespace-nowrap text-sm text-muted-foreground">
          {tasks.length} pendência{tasks.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <SortableTable
          columns={buildColumns(surgeries)}
          rows={tasks}
          rowKey={(task) => task.id}
          emptyMessage={
            hasActiveFilters
              ? "Nenhuma pendência encontrada para esses filtros."
              : "Nenhuma pendência cadastrada ainda."
          }
        />
      </div>
    </div>
  );
}

function buildColumns(surgeries: Awaited<ReturnType<typeof listSurgeriesForSelect>>): SortableColumn<Task>[] {
  return [
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
}
