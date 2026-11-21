// Uma cor de destaque por etapa do fluxo cirúrgico — usada no número da
// coluna do Kanban, na borda superior do card de coluna e no "ponto"
// colorido da coluna "Etapa" na visão em Lista. A última etapa
// ("Realizada/Encerrada") sempre fica verde, as demais ciclam pela
// paleta abaixo.
const STAGE_COLORS = [
  "#3B82F6", // azul
  "#2563EB", // azul mais escuro
  "#F59E0B", // âmbar
  "#EC4899", // rosa
  "#8B5CF6", // roxo
  "#A855F7", // violeta
  "#14B8A6", // teal
];

const DONE_COLOR = "#10B981"; // verde — última etapa

export function getStageColor(index: number, total: number): string {
  if (index === total - 1) return DONE_COLOR;
  return STAGE_COLORS[index % STAGE_COLORS.length];
}
