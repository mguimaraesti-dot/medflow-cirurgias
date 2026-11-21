import { cn } from "@/lib/utils";

/**
 * Logo recriado em SVG a partir do guia de marca do MedFlow Cirurgias
 * (ícone de barras ascendentes + wordmark "MedFlow | Cirurgias"), usando
 * as cores oficiais da paleta (#60A5FA / #2563EB / #1E3A8A). `collapsed`
 * mostra só o ícone, pra caber no menu lateral encolhido.
 */
function LogoIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}

export function Logo({
  collapsed = false,
  /** Layout vertical (ícone em cima, nome embaixo, tudo centralizado) e
   * maior — usado na tela de login, no lugar do layout horizontal
   * compacto do menu lateral. */
  stacked = false,
  className,
}: {
  collapsed?: boolean;
  stacked?: boolean;
  className?: string;
}) {
  if (stacked) {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <LogoIcon size={40} />
        <span className="flex flex-col items-center leading-tight">
          <span className="text-2xl font-semibold text-foreground">MedFlow</span>
          <span className="text-xl font-medium italic text-primary">Cirurgias</span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoIcon />
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
