import { createClient } from "@/lib/supabase/server";
import { listProcedures } from "@/lib/data/procedures";
import { deleteProcedureAction } from "@/app/(dashboard)/catalog/procedures/actions";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { ActiveBadge } from "@/components/shared/active-badge";
import { DeleteRowButton } from "@/components/shared/delete-row-button";
import { ProcedureFormDialog } from "@/components/procedures/procedure-form-dialog";
import { ProcedureActiveToggle } from "@/components/procedures/procedure-active-toggle";

export default async function ProceduresCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const procedures = await listProcedures(supabase, q);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Procedimentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Procedimentos reutilizáveis, com protocolos de materiais associados.
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
              <th className="px-4 py-3">Especialidade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {procedures.length === 0 ? (
              <EmptyRow
                colSpan={5}
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
                        {procedure.specialty || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ActiveBadge active={procedure.active} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <ProcedureActiveToggle id={procedure.id} active={procedure.active} />
                          <DeleteRowButton
                            confirmMessage={`Excluir o procedimento "${procedure.name}"? Essa ação não pode ser desfeita.`}
                            onDelete={() => deleteProcedureAction(procedure.id)}
                          />
                        </div>
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
