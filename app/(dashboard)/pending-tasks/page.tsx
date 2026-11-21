import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listTasks } from "@/lib/data/tasks";
import { listSurgeriesForSelect } from "@/lib/data/surgeries";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { PendingTasksTable } from "@/components/tasks/pending-tasks-table";

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

      <PendingTasksTable
        tasks={tasks}
        surgeries={surgeries}
        emptyMessage={
          hasActiveFilters
            ? "Nenhuma pendência encontrada para esses filtros."
            : "Nenhuma pendência cadastrada ainda."
        }
      />
    </div>
  );
}
