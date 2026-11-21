import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listProcedures } from "@/lib/data/procedures";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { ActiveBadge } from "@/components/shared/active-badge";
import { ProcedureFormDialog } from "@/components/procedures/procedure-form-dialog";
import { ProcedureRowActions } from "@/components/procedures/procedure-row-actions";

// A busca de código TUSS (ANS) pode demorar além do padrão de 10s das
// Server Actions na Vercel — damos mais margem para essa rota.
export const maxDuration = 30;

export default async function ProceduresCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleView("procedures");
  const { q } = await searchParams;
  const supabase = await createClient();
  const procedures = await listProcedures(supabase, q);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Procedimentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Procedimentos reutilizáveis, cada um com seu kit de materiais padrão.
          </p>
        </div>
        <ProcedureFormDialog />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome..." />
        <p className="text-sm text-muted-foreground">
          {procedures.length} procedimento{procedures.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">TUSS</th>
              <th className="px-4 py-3">Especialidade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {procedures.length === 0 ? (
              <EmptyRow
                colSpan={6}
                message={
                  q
                    ? "Nenhum procedimento encontrado para essa busca."
                    : "Nenhum procedimento cadastrado ainda."
                }
              />
            ) : (
              procedures.map((procedure) => (
                <ProcedureFormDialog
                  key={procedure.id}
                  procedure={procedure}
                  trigger={
                    <tr className="cursor-pointer transition-colors hover:bg-muted/60">
                      <td className="px-4 py-3 font-medium text-foreground">{procedure.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {procedure.internal_code || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {procedure.tuss_code || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {procedure.specialty || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ActiveBadge active={procedure.active} />
                      </td>
                      <td className="px-4 py-3">
                        <ProcedureRowActions procedure={procedure} />
                      </td>
                    </tr>
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
