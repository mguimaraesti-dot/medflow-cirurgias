import Link from "next/link";
import { Plus, LayoutGrid } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listSurgeries } from "@/lib/data/surgeries";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  rescheduled: "Reagendada",
  cancelled: "Cancelada",
  completed: "Realizada",
};

const STATUS_VARIANT: Record<string, "secondary" | "destructive" | "default" | "outline"> = {
  active: "secondary",
  rescheduled: "outline",
  cancelled: "destructive",
  completed: "default",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function SurgeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleView("surgeries");
  const { q } = await searchParams;
  const supabase = await createClient();
  const surgeries = await listSurgeries(supabase, q);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Cirurgias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todas as cirurgias cadastradas, incluindo realizadas e canceladas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/kanban">
            <Button variant="outline" size="sm">
              <LayoutGrid className="h-4 w-4" />
              Mapa Cirúrgico
            </Button>
          </Link>
          <Link href="/surgeries/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Nova cirurgia
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por código (ex: CIR-2026-0001)..." />
        <p className="text-sm text-muted-foreground">
          {surgeries.length} cirurgia{surgeries.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Paciente</th>
              <th className="px-4 py-3">Hospital</th>
              <th className="px-4 py-3">Procedimento</th>
              <th className="px-4 py-3">Solicitação</th>
              <th className="px-4 py-3">Prevista</th>
              <th className="px-4 py-3">Confirmada</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {surgeries.length === 0 ? (
              <EmptyRow
                colSpan={8}
                message={
                  q
                    ? "Nenhuma cirurgia encontrada para essa busca."
                    : "Nenhuma cirurgia cadastrada ainda."
                }
              />
            ) : (
              surgeries.map((surgery) => (
                <tr key={surgery.id} className="hover:bg-muted">
                  <td className="px-4 py-3">
                    <Link
                      href={`/surgeries/${surgery.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {surgery.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{surgery.patient?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{surgery.hospital?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {surgery.primary_procedure?.name ?? "—"}
                    {surgery.procedures.length > 1 ? ` +${surgery.procedures.length - 1}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(surgery.indication_date)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(surgery.expected_date)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(surgery.confirmed_date)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[surgery.status] ?? "outline"}>
                      {STATUS_LABEL[surgery.status] ?? surgery.status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
