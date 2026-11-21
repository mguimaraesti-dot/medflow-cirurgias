"use client";

import { deleteMaterialAction } from "@/app/(dashboard)/catalog/materials/actions";
import { MaterialActiveToggle } from "@/components/materials/material-active-toggle";
import { MaterialSuppliersSheet } from "@/components/materials/material-suppliers-sheet";
import { DeleteRowButton } from "@/components/shared/delete-row-button";

export function MaterialRowActions({
  material,
  activeSuppliers,
}: {
  material: { id: string; name: string; active: boolean };
  activeSuppliers: { id: string; company_name: string }[];
}) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <MaterialSuppliersSheet material={material} activeSuppliers={activeSuppliers} />
      <MaterialActiveToggle id={material.id} active={material.active} />
      <DeleteRowButton
        confirmMessage={`Excluir o material "${material.name}"? Essa ação não pode ser desfeita.`}
        onDelete={() => deleteMaterialAction(material.id)}
      />
    </div>
  );
}
