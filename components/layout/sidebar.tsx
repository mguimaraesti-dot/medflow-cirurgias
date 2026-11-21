"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { SidebarBody, findActiveHref } from "@/components/layout/sidebar-body";

const STORAGE_KEY = "medflow-sidebar-collapsed";

/** Sidebar fixo de desktop — escondido abaixo de `md`, onde quem assume
 * a navegação é o drawer de components/layout/mobile-nav.tsx. */
export function Sidebar({
  userEmail,
  roleName,
  permissions,
}: {
  userEmail: string | null;
  roleName: string;
  permissions: string[];
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const visibleItems = NAV_ITEMS.filter((item) => permissions.includes(`${item.module}:view`));
  const activeHref = findActiveHref(visibleItems, pathname);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

  return (
    <aside
      className={cn(
        "relative hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex",
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

      <SidebarBody
        visibleItems={visibleItems}
        activeHref={activeHref}
        collapsed={collapsed}
        userEmail={userEmail}
        roleName={roleName}
      />
    </aside>
  );
}
