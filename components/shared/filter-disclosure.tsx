"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * No mobile, uma fileira de filtros (busca + vários selects) não cabe
 * numa linha só — cada campo quebra pra ocupar a tela toda, empurrando
 * a lista de verdade pra baixo da dobra ("esse monte de filtros não
 * ficou bom"). Em vez disso, os filtros ficam escondidos atrás de um
 * botão "Filtros" (com contador de quantos estão ativos) por padrão no
 * mobile; no desktop continuam todos visíveis numa linha só, como
 * sempre foram. Usado em toda tela com mais de um filtro: Mapa
 * Cirúrgico, Pendências, Financeiro, Relatórios, Agenda.
 */
export function FilterDisclosure({
  activeCount,
  children,
  forceExpanded,
  className,
}: {
  activeCount: number;
  children: ReactNode;
  className?: string;
  /** Quando definido, o controle de abrir/fechar é externo (some o botão "Filtros" interno). */
  forceExpanded?: boolean;
}) {
  const [internalExpanded, setExpanded] = useState(false);
  const external = forceExpanded !== undefined;
  const expanded = external ? forceExpanded : internalExpanded;

  return (
    <div className={cn("w-full md:w-auto", className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn("flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground md:hidden", external && "hidden")}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          Filtros
          {activeCount > 0 ? <Badge variant="info">{activeCount}</Badge> : null}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      <div
        className={cn(
          "mt-2 flex-col gap-2 md:mt-0 md:flex md:flex-row md:flex-wrap md:items-center md:gap-x-2 md:gap-y-2.5",
          expanded ? "flex" : "hidden"
        )}
      >
        {children}
      </div>
    </div>
  );
}
