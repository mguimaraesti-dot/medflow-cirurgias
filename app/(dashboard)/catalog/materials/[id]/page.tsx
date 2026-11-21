import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getMaterial, listMaterialSuppliers } from "@/lib/data/materials";
import { listActiveSuppliersForSelect } from "@/lib/data/suppliers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActiveBadge } from "@/components/shared/active-badge";
import { AddMaterialSupplierForm } from "@/components/materials/add-material-supplier-form";
import { RemoveMaterialSupplierButton } from "@/components/materials/remove-material-supplier-button";

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

  const linkedSupplierIds = new Set(links.map((l) => l.supplier_id));
  const availableSuppliers = activeSuppliers.filter((s) => !linkedSupplierIds.has(s.id));

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
        <CardContent className="flex flex-col gap-4">
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum fornecedor vinculado ainda.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {links.map((link) => (
                <li key={link.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">
                      {link.supplier?.company_name ?? "Fornecedor removido"}
                    </span>
                    {link.preferred ? <Badge variant="outline">Preferencial</Badge> : null}
                    {link.supplier && !link.supplier.active ? (
                      <Badge variant="secondary">Fornecedor inativo</Badge>
                    ) : null}
                  </div>
                  <RemoveMaterialSupplierButton linkId={link.id} />
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border pt-4">
            <AddMaterialSupplierForm materialId={material.id} availableSuppliers={availableSuppliers} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
