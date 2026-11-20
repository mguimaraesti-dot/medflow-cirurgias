import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { listTasks } from "@/lib/data/tasks";
import { listSurgeriesForSelect } from "@/lib/data/surgeries";
import { EmptyRow } from "@/components/shared/empty-row";
import { Badge } from "@/components/ui/badge";
import { TaskFilters, CATEGORY_LABEL, PRIORITY_LABEL } from "@/components/tasks/task-filters";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";

const PRIORITY_VARIANT: Record<string, "outline" | "secondary" | "destructive"> = {
  low: "outline",
  normal: "outline",
  high: "secondary",
  urgent: "destructive",
};

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
          <h1 className="text-lg font-medium text-slate-900">Pendências</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tarefas e alertas por categoria, prioridade e prazo.
          </p>
        </div>
        <TaskFormDialog surgeries={surgeries} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <TaskFilters />
        <p className="whitespace-nowrap text-sm text-slate-500">
          {tasks.length} pendência{tasks.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Prioridade</th>
              <th className="px-4 py-3">Cirurgia</th>
              <th className="px-4 py-3">Prazo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <EmptyRow
                colSpan={7}
                message={
                  hasActiveFilters
                    ? "Nenhuma pendência encontrada para esses filtros."
                    : "Nenhuma pendência cadastrada ainda."
                }
              />
            ) : (
              tasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{task.title}</td>
                  <td className="px-4 py-3 text-slate-600">{CATEGORY_LABEL[task.category]}</td>
                  <td className="px-4 py-3">
                    <Badge variant={PRIORITY_VARIANT[task.priority]}>
                      {PRIORITY_LABEL[task.priority]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {task.surgery ? (
                      <Link href={`/surgeries/${task.surgery.id}`} className="hover:underline">
                        {task.surgery.code}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    className={
                      isOverdue(task.due_date, task.status)
                        ? "px-4 py-3 font-medium text-red-600"
                        : "px-4 py-3 text-slate-600"
                    }
                  >
                    {formatDate(task.due_date)}
                  </td>
                  <td className="px-4 py-3">
                    <TaskStatusSelect task={task} />
                  </td>
                  <td className="px-4 py-3">
                    <TaskFormDialog task={task} surgeries={surgeries} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
