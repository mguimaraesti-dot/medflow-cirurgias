"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";

import { NAV_ITEMS } from "@/lib/navigation";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const STORAGE_KEY = "medflow-sidebar-collapsed";

export function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

  // Entre os itens cujo href bate com a rota atual (exato ou prefixo),
  // só o mais específico (href mais longo) fica marcado como ativo — sem
  // isso, "/surgeries/patients" também acendia "Cirurgias" (href "/surgeries"),
  // já que um é prefixo do outro.
  const activeHref = NAV_ITEMS.reduce<string | null>((best, item) => {
    const matches = pathname === item.href || pathname.startsWith(item.href + "/");
    if (!matches) return best;
    if (best === null || item.href.length > best.length) return item.href;
    return best;
  }, null);

  return (
    <aside
      className={cn(
        "relative flex h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? "Expandir menu" : "Encolher menu"}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div
        className={cn(
          "flex items-center border-b border-border px-4 py-4",
          collapsed ? "justify-center px-2" : "justify-between"
        )}
      >
        <Logo collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          const link = (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
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
          return link;
        })}
      </nav>

      <div className="border-t border-border px-2 py-2">
        <ThemeToggle collapsed={collapsed} />
      </div>

      <div className={cn("border-t border-border px-4 py-3", collapsed && "px-2")}>
        {!collapsed ? <p className="truncate text-xs text-muted-foreground">{userEmail}</p> : null}
        <form action={logout}>
          <button
            type="submit"
            title={collapsed ? "Sair" : undefined}
            className={cn(
              "mt-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground",
              collapsed && "w-full justify-center"
            )}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {!collapsed ? "Sair" : null}
          </button>
        </form>
      </div>
    </aside>
  );
}
