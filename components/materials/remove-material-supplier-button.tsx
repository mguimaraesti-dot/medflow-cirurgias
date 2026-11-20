"use client";

import { useTransition } from "react";
import { X } from "lucide-react";

import { removeMaterialSupplierAction } from "@/app/(dashboard)/catalog/materials/actions";
import { Button } from "@/components/ui/button";

export function RemoveMaterialSupplierButton({ linkId }: { linkId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() => startTransition(() => removeMaterialSupplierAction(linkId))}
      aria-label="Remover vínculo"
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
