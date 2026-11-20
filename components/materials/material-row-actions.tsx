"use client";

import Link from "next/link";
import { Truck } from "lucide-react";

import { deleteMaterialAction } from "@/app/(dashboard)/catalog/materials/actions";
import { MaterialActiveToggle } from "@/components/materials/material-active-toggle";
import { DeleteRowButton } from "@/components/shared/delete-row-button";

export function MaterialRowActions({
  material,
}: {
  material: { id: string; name: string; active: boolean };
}) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Link
        href={`/catalog/materials/${material.id}`}
        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
      >
        <Truck className="h-3.5 w-3.5" />
        Fornecedores
      </Link>
      <MaterialActiveToggle id={material.id} active={material.active} />
      <DeleteRowButton
        confirmMessage={`Excluir o material "${material.name}"? Essa ação não pode ser desfeita.`}
        onDelete={() => deleteMaterialAction(material.id)}
      />
    </div>
  );
}
