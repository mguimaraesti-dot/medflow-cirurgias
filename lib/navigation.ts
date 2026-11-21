import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  KanbanSquare,
  Stethoscope,
  Users,
  CalendarDays,
  ListChecks,
  BookMarked,
  Boxes,
  Truck,
  Wallet,
  BarChart3,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Módulo de permissão (migration 0017) — item só aparece pra quem tem
   * "<module>:view" na própria role. */
  module: string;
};

/**
 * Os módulos do menu lateral (seção 4 do prompt mestre). Mesma ordem
 * usada lá, exceto o reposicionamento natural do Kanban logo após o
 * Dashboard, já que é a tela operacional de uso diário.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  { label: "Mapa Cirúrgico", href: "/kanban", icon: KanbanSquare, module: "kanban" },
  { label: "Agenda", href: "/schedule", icon: CalendarDays, module: "schedule" },
  { label: "Cirurgias", href: "/surgeries", icon: Stethoscope, module: "surgeries" },
  { label: "Pacientes", href: "/surgeries/patients", icon: Users, module: "patients" },
  { label: "Pendências", href: "/pending-tasks", icon: ListChecks, module: "pending_tasks" },
  { label: "Procedimentos", href: "/catalog/procedures", icon: BookMarked, module: "procedures" },
  { label: "Materiais", href: "/catalog/materials", icon: Boxes, module: "materials" },
  { label: "Fornecedores", href: "/suppliers", icon: Truck, module: "suppliers" },
  { label: "Financeiro", href: "/financial", icon: Wallet, module: "financial" },
  { label: "Relatórios", href: "/reports", icon: BarChart3, module: "reports" },
  { label: "Configurações", href: "/settings", icon: Settings, module: "settings" },
];
