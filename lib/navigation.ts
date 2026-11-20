import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  KanbanSquare,
  Stethoscope,
  CalendarDays,
  ListChecks,
  BookMarked,
  Boxes,
  Truck,
  FileStack,
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
 * Os 12 módulos do menu lateral (seção 4 do prompt mestre). Mesma ordem
 * usada lá, exceto o reposicionamento natural do Kanban logo após o
 * Dashboard, já que é a tela operacional de uso diário.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kanban cirúrgico", href: "/kanban", icon: KanbanSquare },
  { label: "Cirurgias", href: "/surgeries", icon: Stethoscope },
  { label: "Agenda", href: "/schedule", icon: CalendarDays },
  { label: "Pendências", href: "/pending-tasks", icon: ListChecks },
  { label: "Catálogo de procedimentos", href: "/catalog/procedures", icon: BookMarked },
  { label: "Catálogo de materiais", href: "/catalog/materials", icon: Boxes },
  { label: "Fornecedores", href: "/suppliers", icon: Truck },
  { label: "Protocolos de materiais", href: "/protocols", icon: FileStack },
  { label: "Financeiro", href: "/financial", icon: Wallet },
  { label: "Relatórios", href: "/reports", icon: BarChart3 },
  { label: "Configurações", href: "/settings", icon: Settings },
];
