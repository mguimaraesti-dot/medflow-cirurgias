import { Card, CardContent } from "@/components/ui/card";
import type { FinancialTotals } from "@/lib/data/financial";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinancialSummaryCards({ totals }: { totals: FinancialTotals }) {
  const items = [
    { label: "Valor acordado", value: totals.expected, className: "text-foreground" },
    { label: "Recebido", value: totals.received, className: "text-emerald-600 dark:text-emerald-400" },
    { label: "Em aberto", value: totals.outstanding, className: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`mt-1 text-lg font-medium ${item.className}`}>{formatBRL(item.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
