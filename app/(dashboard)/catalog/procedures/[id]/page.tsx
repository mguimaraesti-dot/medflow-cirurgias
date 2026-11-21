import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getProcedure } from "@/lib/data/procedures";
import { listDefaultMaterials } from "@/lib/data/procedure-materials";
import { listActiveMaterialsForSelect } from "@/lib/data/materials";
import { listActiveSuppliersForSelect } from "@/lib/data/suppliers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveBadge } from "@/components/shared/active-badge";
import { ProcedureDefaultMaterialsCard } from "@/components/procedures/procedure-default-materials-card";

export default async function ProcedureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModuleView("procedures");
  const { id } = await params;
  const supabase = await createClient();

  const [procedure, defaultMaterials, materials, suppliers] = await Promise.all([
    getProcedure(supabase, id),
    listDefaultMaterials(supabase, id),
    listActiveMaterialsForSelect(supabase),
    listActiveSuppliersForSelect(supabase),
  ]);

  return (
    <div>
      <Link
        href="/catalog/procedures"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Procedimentos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-foreground">{procedure.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {procedure.internal_code ? `Código ${procedure.internal_code} · ` : ""}
            {procedure.specialty || "Sem especialidade"}
          </p>
        </div>
        <ActiveBadge active={procedure.active} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Materiais padrão</CardTitle>
          <p className="text-sm text-muted-foreground">
            Lista de materiais que o médico costuma usar neste procedimento. Ao criar uma
            cirurgia, essa lista é sugerida automaticamente — e pode ser atualizada depois de
            cada cirurgia, se o que for usado for diferente.
          </p>
        </CardHeader>
        <CardContent>
          <ProcedureDefaultMaterialsCard
            procedureId={procedure.id}
            items={defaultMaterials}
            materials={materials}
            suppliers={suppliers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
