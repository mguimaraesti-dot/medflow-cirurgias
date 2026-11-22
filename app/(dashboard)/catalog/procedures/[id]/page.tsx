import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { countProcedureSurgeries, getProcedure } from "@/lib/data/procedures";
import { listDefaultMaterials } from "@/lib/data/procedure-materials";
import { listActiveSuppliersForSelect } from "@/lib/data/suppliers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveBadge } from "@/components/shared/active-badge";
import { ProcedureFormDialog } from "@/components/procedures/procedure-form-dialog";
import { ProcedureKitEditor } from "@/components/procedures/procedure-kit-editor";
import { ProcedureStatusButton } from "@/components/procedures/procedure-status-button";

export default async function ProcedureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModuleView("procedures");
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [procedure, defaultMaterials, suppliers, surgeryCount, canEdit] = await Promise.all([
    getProcedure(supabase, id),
    listDefaultMaterials(supabase, id),
    listActiveSuppliersForSelect(supabase),
    countProcedureSurgeries(supabase, id),
    user ? hasPermission(user, "procedures", "edit") : Promise.resolve(false),
  ]);

  const info: { label: string; value: string | null }[] = [
    { label: "Código interno", value: procedure.internal_code },
    { label: "Código TUSS", value: procedure.tuss_code },
    { label: "Especialidade", value: procedure.specialty },
    { label: "Local de realização", value: procedure.location },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link
        href="/catalog/procedures"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Procedimentos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{procedure.name}</h1>
            <ActiveBadge active={procedure.active} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {surgeryCount > 0
              ? `Usado em ${surgeryCount} cirurgia${surgeryCount === 1 ? "" : "s"}.`
              : "Ainda não usado em cirurgias."}
          </p>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <ProcedureFormDialog procedure={procedure} />
            <ProcedureStatusButton id={procedure.id} active={procedure.active} />
          </div>
        ) : null}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dados do procedimento</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {info.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-foreground">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          {procedure.description ? (
            <div className="mt-4 border-t border-border pt-3">
              <dt className="text-xs text-muted-foreground">Descrição</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{procedure.description}</dd>
            </div>
          ) : null}
          {procedure.admin_notes ? (
            <div className="mt-4 border-t border-border pt-3">
              <dt className="text-xs text-muted-foreground">Observações administrativas</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{procedure.admin_notes}</dd>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card id="materiais" className="mt-4 scroll-mt-4">
        <CardHeader>
          <CardTitle>Materiais padrão</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kit de materiais e OPME que o médico costuma usar neste procedimento. Ao criar uma cirurgia, a lista é
            sugerida e pode ser revisada para aquela cirurgia — não é uma lista obrigatória.
          </p>
        </CardHeader>
        <CardContent>
          <ProcedureKitEditor
            procedureId={procedure.id}
            initialItems={defaultMaterials}
            suppliers={suppliers}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
