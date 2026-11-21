/**
 * Rótulos em português dos módulos de permissão (migration 0017) —
 * compartilhado entre a grid de permissões de uma função
 * (components/access/roles-panel.tsx) e o convite com função nova
 * (components/access/invite-user-dialog.tsx), pra não ter duas listas
 * que podem ficar dessincronizadas.
 */
export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  kanban: "Mapa Cirúrgico",
  surgeries: "Cirurgias",
  patients: "Pacientes",
  schedule: "Agenda",
  pending_tasks: "Pendências",
  procedures: "Procedimentos",
  materials: "Materiais",
  suppliers: "Fornecedores",
  financial: "Financeiro",
  reports: "Relatórios",
  settings: "Configurações",
  users: "Usuários",
};

export const MODULE_ORDER = Object.keys(MODULE_LABELS);
