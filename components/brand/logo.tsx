import { cn } from "@/lib/utils";

/**
 * Logo recriado em SVG a partir do guia de marca do MedFlow Cirurgias
 * (ícone de barras ascendentes + wordmark "MedFlow | Cirurgias"), usando
 * as cores oficiais da paleta (#60A5FA / #2563EB / #1E3A8A). `collapsed`
 * mostra só o ícone, pra caber no menu lateral encolhido.
 */
export function Logo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect x="1" y="15" width="6" height="12" rx="1.5" fill="#60A5FA" />
        <rect x="11" y="8" width="6" height="19" rx="1.5" fill="#2563EB" />
        <rect x="21" y="1" width="6" height="26" rx="1.5" fill="#1E3A8A" />
      </svg>
      {!collapsed ? (
        <span className="flex items-baseline gap-1.5 whitespace-nowrap leading-none">
          <span className="text-base font-semibold text-foreground">MedFlow</span>
          <span className="text-border">|</span>
          <span className="text-base font-medium italic text-primary">Cirurgias</span>
        </span>
      ) : null}
    </div>
  );
}
