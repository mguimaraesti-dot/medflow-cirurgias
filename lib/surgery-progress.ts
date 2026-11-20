import type { WorkflowStage } from "@/lib/data/surgeries";
import type { ProgressStep } from "@/components/surgeries/surgery-progress-bar";

/**
 * Converte as etapas reais do fluxo (workflow_stages) + a etapa atual da
 * cirurgia (stage_id) e seu status em passos para o indicador visual de
 * andamento. Reflete sempre dados reais já registrados (etapa atual e
 * status da cirurgia) — nunca o simples fato de um formulário ter sido
 * aberto.
 */
export function computeSurgeryProgressSteps(
  stages: WorkflowStage[],
  surgery: { stage_id: string; status: string }
): ProgressStep[] {
  const currentIndex = stages.findIndex((stage) => stage.id === surgery.stage_id);

  return stages.map((stage, index) => {
    if (surgery.status === "completed") {
      return { label: stage.name, state: "done" };
    }
    if (surgery.status === "cancelled" && index === currentIndex) {
      return { label: stage.name, state: "blocked" };
    }
    if (index < currentIndex) {
      return { label: stage.name, state: "done" };
    }
    if (index === currentIndex) {
      return { label: stage.name, state: "current" };
    }
    return { label: stage.name, state: "pending" };
  });
}
