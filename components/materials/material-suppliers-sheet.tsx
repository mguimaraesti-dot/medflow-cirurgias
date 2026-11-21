"use client";

import { useState } from "react";
import { Truck } from "lucide-react";

import { getMaterialSuppliersAction } from "@/app/(dashboard)/catalog/materials/actions";
import type { MaterialSupplierRow } from "@/lib/data/materials";
import { MaterialSuppliersCard } from "@/components/materials/material-suppliers-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";

export function MaterialSuppliersSheet({
  material,
  activeSuppliers,
}: {
  material: { id: string; name: string };
  activeSuppliers: { id: string; company_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<MaterialSupplierRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setLoading(true);
      try {
        const data = await getMaterialSuppliersAction(material.id);
        setLinks(data);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          <Truck className="h-3.5 w-3.5" />
          Fornecedores
        </button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Fornecedores — {material.name}</SheetTitle>
          <SheetDescription>
            Fornecedores que costumam fornecer este material, com o preferencial destacado.
          </SheetDescription>
        </SheetHeader>

        {loading || links === null ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <MaterialSuppliersCard
            materialId={material.id}
            links={links}
            activeSuppliers={activeSuppliers}
            onLinksChange={setLinks}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
