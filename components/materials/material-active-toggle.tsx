"use client";

import { useTransition } from "react";

import { toggleMaterialActiveAction } from "@/app/(dashboard)/catalog/materials/actions";
import { Button } from "@/components/ui/button";

export function MaterialActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleMaterialActiveAction(id, !active))}
    >
      {active ? "Inativar" : "Reativar"}
    </Button>
  );
}
