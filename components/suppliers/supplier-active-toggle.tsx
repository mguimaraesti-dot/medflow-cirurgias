"use client";

import { useTransition } from "react";

import { toggleSupplierActiveAction } from "@/app/(dashboard)/suppliers/actions";
import { Button } from "@/components/ui/button";

export function SupplierActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleSupplierActiveAction(id, !active))}
    >
      {active ? "Inativar" : "Reativar"}
    </Button>
  );
}
