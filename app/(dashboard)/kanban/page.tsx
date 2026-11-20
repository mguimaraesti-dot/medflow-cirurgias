import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listWorkflowStages, listKanbanSurgeries } from "@/lib/data/surgeries";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { Button } from "@/components/ui/button";

export default async function KanbanPage() {
  const supabase = await createClient();
  const [stages, surgeries] = await Promise.all([
    listWorkflowStages(supabase),
    listKanbanSurgeries(supabase),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-slate-900">Kanban cirúrgico</h1>
          <p className="mt-1 text-sm text-slate-500">
            Arraste o cartão para mudar a etapa. Cirurgias canceladas ou encerradas não aparecem aqui.
          </p>
        </div>
        <Link href="/surgeries/new">
          <Button>
            <Plus className="h-4 w-4" />
            Nova cirurgia
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        {surgeries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Nenhuma cirurgia ativa ainda. Crie a primeira com o botão acima.
          </p>
        ) : (
          <KanbanBoard stages={stages} surgeries={surgeries} />
        )}
      </div>
    </div>
  );
}
