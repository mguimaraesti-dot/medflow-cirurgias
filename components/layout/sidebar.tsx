"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { NAV_ITEMS } from "@/lib/navigation";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();

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
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="text-sm font-medium text-slate-900">Medflow Cirurgias</p>
        <p className="text-xs text-slate-500">Dr. Flávio Morita</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-slate-900 text-slate-50"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3">
        <p className="truncate text-xs text-slate-500">{userEmail}</p>
        <form action={logout}>
          <button
            type="submit"
            className="mt-2 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
