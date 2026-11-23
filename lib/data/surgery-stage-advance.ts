import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Avanço automático do card no Kanban conforme as etapas vão sendo concluídas:
 *
 *   Solicitações recebidas → Autorização   : há documento anexado ou a
 *                                            solicitação de autorização já foi enviada
 *   Autorização → Agendamento              : autorização aprovada (total/parcial) ou dispensada
 *   Agendamento → Preparação pré-operatória: reserva confirmada ou dispensada
 *   Preparação pré-operatória → Cirurgia liberada: checklist concluído ou dispensado
 *
 * Regras de segurança:
 *   - só AVANÇA (nunca recua um card que alguém posicionou manualmente mais à frente);
 *   - só cirurgias ativas; "Realizada/Encerrada" continua sendo decisão manual;
 *   - as etapas são encadeadas: uma etapa só conta se as anteriores estiverem concluídas.
 * Falhas aqui nunca derrubam a ação principal (best-effort, apenas registradas).
 */
const CHAIN: { fromCode: string; toCode: string }[] = [
  { fromCode: "new_indication", toCode: "authorization" },
  { fromCode: "authorization", toCode: "or_reservation" },
  { fromCode: "or_reservation", toCode: "preoperative" },
  { fromCode: "preoperative", toCode: "released" },
];

export async function advanceSurgeryStage(supabase: SupabaseClient, surgeryId: string): Promise<void> {
  try {
    const [{ data: surgery }, { data: stages }] = await Promise.all([
      supabase.from("surgeries").select("id,status,stage_id").eq("id", surgeryId).maybeSingle(),
      supabase.from("workflow_stages").select("id,code,sort_order").eq("is_active", true).order("sort_order"),
    ]);
    if (!surgery || surgery.status !== "active" || !stages) return;

    const byCode = new Map(stages.map((s) => [s.code as string, s]));
    const current = stages.find((s) => s.id === surgery.stage_id);
    if (!current) return;

    const [{ data: reqs }, { count: docCount }, { data: auth }] = await Promise.all([
      supabase.from("surgery_requirements").select("requirement_key,is_satisfied,waived").eq("surgery_id", surgeryId),
      supabase.from("surgery_documents").select("id", { count: "exact", head: true }).eq("surgery_id", surgeryId),
      supabase.from("authorization_requests").select("status").eq("surgery_id", surgeryId).limit(1).maybeSingle(),
    ]);
    const done = (key: string) => {
      const r = (reqs ?? []).find((x) => x.requirement_key === key);
      return Boolean(r && (r.is_satisfied || r.waived));
    };
    const passed: Record<string, boolean> = {
      new_indication: (docCount ?? 0) > 0 || Boolean(auth && auth.status !== "not_requested"),
      authorization: done("authorization"),
      or_reservation: done("or_reservation"),
      preoperative: done("preoperative"),
    };

    let targetCode = "new_indication";
    for (const step of CHAIN) {
      if (!passed[step.fromCode]) break;
      targetCode = step.toCode;
    }
    const target = byCode.get(targetCode);
    if (!target || target.sort_order <= current.sort_order) return;

    const { error } = await supabase
      .from("surgeries")
      .update({ stage_id: target.id, board_position: Date.now() })
      .eq("id", surgeryId)
      .eq("stage_id", surgery.stage_id);
    if (error) console.error("[stage-advance] falha ao mover:", error);
  } catch (e) {
    console.error("[stage-advance]", e);
  }
}
