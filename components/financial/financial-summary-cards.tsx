import { Card, CardContent } from "@/components/ui/card";

export type FinancialSummary = {
  expected: number;
  received: number;
  outstanding: number;
  /** Opcionais: só a tela Financeiro informa; nos Relatórios ficam só os 3 totais. */
  count?: number;
  withoutValue?: number;
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinancialSummaryCards({ totals }: { totals: FinancialSummary }) {
  const detailed = totals.count !== undefined && totals.withoutValue !== undefined;
  const withoutValue = totals.withoutValue ?? 0;
  const items = [
    { label: "Valor acordado", value: formatBRL(totals.expected), hint: detailed ? `${totals.count} cirurgia(s)` : "", className: "text-foreground" },
    { label: "Recebido", value: formatBRL(totals.received), hint: detailed ? (totals.expected > 0 ? `${Math.round((totals.received / totals.expected) * 100)}% do acordado` : "—") : "", className: "text-emerald-600 dark:text-emerald-400" },
    { label: "Em aberto", value: formatBRL(totals.outstanding), hint: detailed ? "a receber" : "", className: "text-amber-600 dark:text-amber-400" },
    {
      label: "Sem valor definido",
      value: String(withoutValue),
      hint: withoutValue > 0 ? "defina o valor na cirurgia" : "tudo com valor",
      className: withoutValue > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground",
    },
  ].slice(0, detailed ? 4 : 3);

  return (
    <div className={`grid grid-cols-2 gap-3 ${detailed ? "lg:grid-cols-4" : "md:grid-cols-3"}`}>
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`mt-1 text-lg font-semibold ${item.className}`}>{item.value}</p>
            {item.hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{item.hint}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
