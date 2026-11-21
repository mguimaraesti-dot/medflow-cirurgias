"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { NAV_ITEMS } from "@/lib/navigation";
import { Logo } from "@/components/brand/logo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarBody, findActiveHref } from "@/components/layout/sidebar-body";

/** Cabeçalho compacto + drawer de navegação pra telas pequenas — some a
 * partir de `md`, onde o sidebar fixo (components/layout/sidebar.tsx)
 * assume. O conteúdo do drawer (itens de menu, usuário, tema, sair) é o
 * mesmo SidebarBody do sidebar de desktop, só que sempre expandido. */
export function MobileNav({
  userEmail,
  roleName,
  permissions,
}: {
  userEmail: string | null;
  roleName: string;
  permissions: string[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visibleItems = NAV_ITEMS.filter((item) => permissions.includes(`${item.module}:view`));
  const activeHref = findActiveHref(visibleItems, pathname);

  useEffect(() => {
    // Fecha o drawer automaticamente depois de navegar pra outra tela.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" aria-label="Ir para o início">
          <Logo collapsed={false} />
        </Link>
        {/* Espaçador do mesmo tamanho do botão, pra manter a logo centralizada. */}
        <span className="h-9 w-9" aria-hidden="true" />
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 max-w-[85vw] flex-col gap-0 p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="flex items-center border-b border-border px-4 py-4">
            <Link href="/dashboard" aria-label="Ir para o início" onClick={() => setOpen(false)}>
              <Logo collapsed={false} />
            </Link>
          </div>
          <SidebarBody
            visibleItems={visibleItems}
            activeHref={activeHref}
            userEmail={userEmail}
            roleName={roleName}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
