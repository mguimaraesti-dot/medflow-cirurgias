import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getMaterial, listMaterialSuppliers } from "@/lib/data/materials";
import { listActiveSuppliersForSelect } from "@/lib/data/suppliers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveBadge } from "@/components/shared/active-badge";
import { MaterialSuppliersCard } from "@/components/materials/material-suppliers-card";

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModuleView("materials");
  const { id } = await params;
  const supabase = await createClient();

  const [material, links, activeSuppliers] = await Promise.all([
    getMaterial(supabase, id),
    listMaterialSuppliers(supabase, id),
    listActiveSuppliersForSelect(supabase),
  ]);

  return (
    <div>
      <Link
        href="/catalog/materials"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Materiais
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">{material.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {material.internal_code ? `Código ${material.internal_code} · ` : ""}
            {material.category || "Sem categoria"}
            {material.tuss_code ? ` · TUSS ${material.tuss_code}` : ""}
          </p>
          {material.manufacturer || material.anvisa_registration ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {material.manufacturer ? `Fabricante: ${material.manufacturer}` : ""}
              {material.manufacturer && material.anvisa_registration ? " · " : ""}
              {material.anvisa_registration ? `Registro ANVISA: ${material.anvisa_registration}` : ""}
            </p>
          ) : null}
        </div>
        <ActiveBadge active={material.active} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Fornecedores vinculados</CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialSuppliersCard materialId={material.id} links={links} activeSuppliers={activeSuppliers} />
        </CardContent>
      </Card>
    </div>
  );
}
