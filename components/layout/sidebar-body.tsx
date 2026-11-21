"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import type { NAV_ITEMS } from "@/lib/navigation";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

/**
 * Navegação + rodapé (usuário/tema/sair) do menu — compartilhado entre o
 * sidebar fixo de desktop (components/layout/sidebar.tsx) e o drawer
 * mobile (components/layout/mobile-nav.tsx), pra não duplicar a lista de
 * itens e a lógica de "qual está ativo" em dois lugares.
 */
export function SidebarBody({
  visibleItems,
  activeHref,
  collapsed = false,
  userEmail,
  roleName,
  onNavigate,
}: {
  visibleItems: (typeof NAV_ITEMS)[number][];
  activeHref: string | null;
  collapsed?: boolean;
  userEmail: string | null;
  roleName: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {visibleItems.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed ? item.label : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-border px-3 py-3", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary">
              {(userEmail ?? "?").charAt(0).toUpperCase()}
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{userEmail}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {roleName === "admin_full_access" ? "Acesso total" : roleName}
                </p>
              </div>
            ) : null}
          </div>
          <ThemeToggle />
        </div>

        <form action={logout} className="mt-3">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            title={collapsed ? "Sair" : undefined}
            className={cn("w-full gap-2 text-muted-foreground", collapsed && "px-0")}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {!collapsed ? "Sair" : null}
          </Button>
        </form>
      </div>
    </>
  );
}

/** Mesma regra usada no sidebar: entre os itens cujo href bate com a rota
 * atual (exato ou prefixo), só o mais específico fica marcado como
 * ativo — evita que uma rota mais genérica (ex: "/surgeries") acenda
 * junto com uma mais específica que a contém (ex: "/surgeries/patients"). */
export function findActiveHref(visibleItems: (typeof NAV_ITEMS)[number][], pathname: string) {
  return visibleItems.reduce<string | null>((best, item) => {
    const matches = pathname === item.href || pathname.startsWith(item.href + "/");
    if (!matches) return best;
    if (best === null || item.href.length > best.length) return item.href;
    return best;
  }, null);
}
