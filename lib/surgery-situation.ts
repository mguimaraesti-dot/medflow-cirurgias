/**
 * "Situação" de uma cirurgia na listagem, derivada dos dados que já existem
 * (nenhum status novo no banco):
 *
 *  - cancelada  → surgeries.status = cancelled
 *  - realizada  → surgeries.status = completed
 *  - confirmada → em aberto (active/rescheduled) com data confirmada
 *  - aguardando → em aberto, sem data confirmada, mas com data prevista
 *                 (esperando o hospital confirmar)
 *  - planning   → em aberto, sem nenhuma data ainda
 *
 * As 5 situações não se sobrepõem: somam o total de cirurgias.
 */
export type SurgerySituation = "planning" | "awaiting" | "confirmed" | "completed" | "cancelled";

export const SITUATIONS: SurgerySituation[] = ["planning", "awaiting", "confirmed", "completed", "cancelled"];

export const SITUATION_LABEL: Record<SurgerySituation, string> = {
  planning: "Em planejamento",
  awaiting: "Aguardando confirmação",
  confirmed: "Confirmada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

export const SITUATION_LABEL_PLURAL: Record<SurgerySituation, string> = {
  planning: "Em planejamento",
  awaiting: "Aguardando confirmação",
  confirmed: "Confirmadas",
  completed: "Realizadas",
  cancelled: "Canceladas",
};

export function deriveSituation(s: {
  status: string;
  confirmed_date: string | null;
  expected_date: string | null;
}): SurgerySituation {
  if (s.status === "cancelled") return "cancelled";
  if (s.status === "completed") return "completed";
  if (s.confirmed_date) return "confirmed";
  if (s.expected_date) return "awaiting";
  return "planning";
}

export function isSituation(value: string | undefined): value is SurgerySituation {
  return !!value && (SITUATIONS as string[]).includes(value);
}
