"use client";

import { deleteSupplierAction } from "@/app/(dashboard)/suppliers/actions";
import { SupplierActiveToggle } from "@/components/suppliers/supplier-active-toggle";
import { DeleteRowButton } from "@/components/shared/delete-row-button";

export function SupplierRowActions({
  supplier,
}: {
  supplier: { id: string; company_name: string; active: boolean };
}) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <SupplierActiveToggle id={supplier.id} active={supplier.active} />
      <DeleteRowButton
        confirmMessage={`Excluir o fornecedor "${supplier.company_name}"? Essa ação não pode ser desfeita.`}
        onDelete={() => deleteSupplierAction(supplier.id)}
      />
    </div>
  );
}
