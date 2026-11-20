import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { listProtocols } from "@/lib/data/protocols";
import { listActiveProceduresForSelect } from "@/lib/data/procedures";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { ProtocolFormDialog } from "@/components/protocols/protocol-form-dialog";

export default async function ProtocolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const [protocols, procedures, hospitals] = await Promise.all([
    listProtocols(supabase, q),
    listActiveProceduresForSelect(supabase),
    listActiveHospitalsForSelect(supabase),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Protocolos de materiais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lista de materiais padrão por procedimento (e, opcionalmente, por hospital), com
            versionamento e aprovação.
          </p>
        </div>
        <ProtocolFormDialog procedures={procedures} hospitals={hospitals} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome do protocolo..." />
        <p className="text-sm text-muted-foreground">
          {protocols.length} protocolo{protocols.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Procedimento</th>
              <th className="px-4 py-3">Hospital</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {protocols.length === 0 ? (
              <EmptyRow
                colSpan={3}
                message={
                  q ? "Nenhum protocolo encontrado para essa busca." : "Nenhum protocolo criado ainda."
                }
              />
            ) : (
              protocols.map((protocol) => (
                <tr key={protocol.id} className="hover:bg-muted">
                  <td className="px-4 py-3">
                    <Link
                      href={`/protocols/${protocol.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {protocol.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{protocol.procedure?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {protocol.hospital?.name ?? "Todos os hospitais"}
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
