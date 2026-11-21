import { Shield, Package, Building2, FileText } from "lucide-react";

// Metadados comuns dos requisitos de liberação de uma cirurgia exibidos
// no Mapa Cirúrgico — compartilhados entre o badge compacto do
// Kanban/Lista (requirement-badges.tsx) e o checklist do painel de
// detalhe (surgery-detail-sheet.tsx), pra manter ícone/rótulo/ordem
// consistentes. "materials" fica de fora da lista por pedido do usuário
// (não aparece mais nesses dois lugares), mas o card de materiais
// continua existindo normalmente na ficha completa da cirurgia
// (surgery-requirements-panel.tsx), que não depende desta lista.
export const REQUIREMENT_ORDER = ["authorization", "or_reservation", "preoperative"] as const;

export type RequirementKey = (typeof REQUIREMENT_ORDER)[number];

export const REQUIREMENT_ICON: Record<string, typeof Shield> = {
  authorization: Shield,
  materials: Package,
  or_reservation: Building2,
  preoperative: FileText,
};

export const REQUIREMENT_LABEL: Record<string, string> = {
  authorization: "Autorização do convênio",
  materials: "Materiais e OPME",
  or_reservation: "Agendamento",
  preoperative: "Preparação pré-operatória",
};

export const REQUIREMENT_DESCRIPTION: Record<string, string> = {
  authorization: "Guia TISS aprovada e autorização do convênio emitida.",
  materials: "Kits cirúrgicos, próteses e instrumentos conferidos com o fornecedor.",
  or_reservation: "Sala, equipamentos e equipe do centro cirúrgico reservados.",
  preoperative: "Exames, termo de consentimento e avaliação pré-operatória concluídos.",
};
