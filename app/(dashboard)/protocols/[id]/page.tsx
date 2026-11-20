import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getProtocol, listProtocolVersions } from "@/lib/data/protocols";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VersionStatusAction, NewVersionButton } from "@/components/protocols/version-actions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_approval: "Aguardando aprovação",
  approved: "Aprovado",
  archived: "Arquivado",
};

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "default"> = {
  draft: "outline",
  pending_approval: "secondary",
  approved: "default",
  archived: "secondary",
};

export default async function ProtocolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [protocol, versions] = await Promise.all([
    getProtocol(supabase, id),
    listProtocolVersions(supabase, id),
  ]);

  const latestVersion = versions[0];

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/protocols"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Protocolos
      </Link>

      <h1 className="text-lg font-medium text-slate-900">{protocol.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {protocol.procedure?.name} · {protocol.hospital?.name ?? "Todos os hospitais"}
      </p>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Versões</CardTitle>
          <NewVersionButton protocolId={protocol.id} cloneFromVersionId={latestVersion?.id} />
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {versions.map((version) => (
              <li
                key={version.id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3"
              >
                <div>
                  <Link
                    href={`/protocols/${protocol.id}/versions/${version.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    Versão {version.version_number}
                  </Link>
                  <div className="mt-1">
                    <Badge variant={STATUS_VARIANT[version.status]}>
                      {STATUS_LABEL[version.status]}
                    </Badge>
                  </div>
                </div>
                <VersionStatusAction version={version} protocolId={protocol.id} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
