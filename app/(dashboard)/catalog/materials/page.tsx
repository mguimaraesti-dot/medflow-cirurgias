import Link from "next/link";
import { Truck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listMaterials } from "@/lib/data/materials";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { ActiveBadge } from "@/components/shared/active-badge";
import { MaterialFormDialog } from "@/components/materials/material-form-dialog";
import { MaterialActiveToggle } from "@/components/materials/material-active-toggle";

export default async function MaterialsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const materials = await listMaterials(supabase, q);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-slate-900">Catálogo de materiais</h1>
          <p className="mt-1 text-sm text-slate-500">
            Materiais e OPME. Um material pode ter vários fornecedores.
          </p>
        </div>
        <MaterialFormDialog />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome..." />
        <p className="text-sm text-slate-500">
          {materials.length} material{materials.length === 1 ? "" : "is"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {materials.length === 0 ? (
              <EmptyRow
                colSpan={5}
                message={
                  q
                    ? "Nenhum material encontrado para essa busca."
                    : "Nenhum material cadastrado ainda."
                }
              />
            ) : (
              materials.map((material) => (
                <tr key={material.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{material.name}</td>
                  <td className="px-4 py-3 text-slate-600">{material.internal_code || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{material.category || "—"}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={material.active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/catalog/materials/${material.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Fornecedores
                      </Link>
                      <MaterialFormDialog material={material} />
                      <MaterialActiveToggle id={material.id} active={material.active} />
                    </div>
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
