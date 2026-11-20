import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getProtocol, getProtocolVersion, listProtocolItems } from "@/lib/data/protocols";
import { listActiveMaterialsForSelect } from "@/lib/data/materials";
import { listActiveSuppliersForSelect } from "@/lib/data/suppliers";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtocolItemForm } from "@/components/protocols/protocol-item-form";
import { RemoveProtocolItemButton } from "@/components/protocols/remove-protocol-item-button";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_approval: "Aguardando aprovação",
  approved: "Aprovado",
  archived: "Arquivado",
};

export default async function ProtocolVersionPage({
  params,
}: {
  params: Promise<{ id: string; versionId: string }>;
}) {
  const { id, versionId } = await params;
  const supabase = await createClient();
  const [protocol, version, items, materials, suppliers] = await Promise.all([
    getProtocol(supabase, id),
    getProtocolVersion(supabase, versionId),
    listProtocolItems(supabase, versionId),
    listActiveMaterialsForSelect(supabase),
    listActiveSuppliersForSelect(supabase),
  ]);

  const editable = version.status === "draft";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/protocols/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {protocol.name}
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-lg font-medium text-foreground">
          {protocol.name} — Versão {version.version_number}
        </h1>
        <Badge variant="outline">{STATUS_LABEL[version.status]}</Badge>
      </div>
      {!editable ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Esta versão não está em rascunho — os itens não podem mais ser alterados. Crie uma nova
          versão para editar.
        </p>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Itens de material</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item adicionado ainda.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {item.material?.name ?? "—"}{" "}
                      <span className="text-muted-foreground">
                        × {item.quantity}
                        {item.unit ? ` ${item.unit}` : ""}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.preferred_supplier ? `Preferencial: ${item.preferred_supplier.company_name}` : ""}
                      {item.specs ? ` · ${item.specs}` : ""}
                    </p>
                  </div>
                  {editable ? (
                    <RemoveProtocolItemButton itemId={item.id} protocolId={id} versionId={versionId} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {editable ? (
            <ProtocolItemForm
              versionId={versionId}
              protocolId={id}
              materials={materials}
              suppliers={suppliers}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
