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
};

/**
 * Os módulos do menu lateral (seção 4 do prompt mestre). Mesma ordem
 * usada lá, exceto o reposicionamento natural do Kanban logo após o
 * Dashboard, já que é a tela operacional de uso diário.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mapa Cirúrgico", href: "/kanban", icon: KanbanSquare },
  { label: "Cirurgias", href: "/surgeries", icon: Stethoscope },
  { label: "Pacientes", href: "/surgeries/patients", icon: Users },
  { label: "Agenda", href: "/schedule", icon: CalendarDays },
  { label: "Pendências", href: "/pending-tasks", icon: ListChecks },
  { label: "Procedimentos", href: "/catalog/procedures", icon: BookMarked },
  { label: "Materiais", href: "/catalog/materials", icon: Boxes },
  { label: "Fornecedores", href: "/suppliers", icon: Truck },
  { label: "Financeiro", href: "/financial", icon: Wallet },
  { label: "Relatórios", href: "/reports", icon: BarChart3 },
  { label: "Configurações", href: "/settings", icon: Settings },
];
