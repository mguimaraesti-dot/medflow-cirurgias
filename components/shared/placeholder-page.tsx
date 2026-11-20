import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPage({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div>
      <h1 className="text-lg font-medium text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <Card className="mt-6 border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-1 py-16 text-center">
          <p className="text-sm font-medium text-slate-700">Módulo ainda não implementado</p>
          <p className="max-w-sm text-sm text-slate-500">
            Previsto para a {phase} do backlog. Nenhum dado fictício é exibido aqui —
            esta tela será construída com dados reais do banco quando chegar sua vez.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
