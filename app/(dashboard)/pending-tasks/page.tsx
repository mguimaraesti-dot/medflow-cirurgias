import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listTasks } from "@/lib/data/tasks";
import { listSurgeriesForSelect } from "@/lib/data/surgeries";
import { listActiveUsers } from "@/lib/data/access";
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
  const [tasks, surgeries, users] = await Promise.all([
    listTasks(supabase, filters),
    listSurgeriesForSelect(supabase),
    listActiveUsers(),
  ]);

  const hasActiveFilters = filters.category || filters.priority || filters.status || filters.q;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Tarefas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tarefas e alertas por categoria, prioridade e prazo.
          </p>
        </div>
        <TaskFormDialog surgeries={surgeries} users={users} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <TaskFilters />
        <p className="whitespace-nowrap text-sm text-muted-foreground">
          {tasks.length} tarefa{tasks.length === 1 ? "" : "s"}
        </p>
      </div>

      <PendingTasksTable
        tasks={tasks}
        surgeries={surgeries}
        users={users}
        emptyMessage={
          hasActiveFilters
            ? "Nenhuma tarefa encontrada para esses filtros."
            : "Nenhuma tarefa cadastrada ainda."
        }
      />
    </div>
  );
}
