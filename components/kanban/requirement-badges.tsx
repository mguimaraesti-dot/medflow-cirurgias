import { Shield, Package, Building2, FileText } from "lucide-react";

import type { SurgeryListItem } from "@/lib/data/surgeries";
import { cn } from "@/lib/utils";

// Um ícone fixo por tipo de requisito — a cor do badge é que muda
// conforme o estado (pendente/dispensado/satisfeito), não o tipo, pra
// bater o olho rapidamente no quanto falta sem precisar ler texto.
const REQUIREMENT_ICON: Record<string, typeof Shield> = {
  authorization: Shield,
  materials: Package,
  or_reservation: Building2,
  preoperative: FileText,
};

const REQUIREMENT_LABEL: Record<string, string> = {
  authorization: "Autorização do convênio",
  materials: "Materiais e OPME",
  or_reservation: "Reserva do centro cirúrgico",
  preoperative: "Preparação pré-operatória",
};

const ORDER = ["authorization", "materials", "or_reservation", "preoperative"];

export function RequirementBadges({
  requirements,
  className,
}: {
  requirements: SurgeryListItem["requirements"];
  className?: string;
}) {
  const byKey = new Map(requirements.map((r) => [r.requirement_key, r]));
  const satisfiedCount = ORDER.filter((key) => byKey.get(key)?.is_satisfied).length;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {ORDER.map((key) => {
        const req = byKey.get(key);
        const Icon = REQUIREMENT_ICON[key];
        const isSatisfied = req?.is_satisfied ?? false;
        const isWaived = req?.waived ?? false;
        return (
          <span
            key={key}
            title={`${REQUIREMENT_LABEL[key]}${isSatisfied ? " — OK" : isWaived ? " — dispensado" : " — pendente"}`}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
              isSatisfied
                ? "border-transparent bg-emerald-500 text-white dark:bg-emerald-600"
                : isWaived
                  ? "border-border bg-muted text-muted-foreground"
                  : "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        );
      })}
      <span
        className={cn(
          "ml-1 text-xs font-medium tabular-nums",
          satisfiedCount === ORDER.length ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
        )}
      >
        {satisfiedCount}/{ORDER.length}
      </span>
    </div>
  );
}
