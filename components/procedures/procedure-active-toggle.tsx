"use client";

import { useTransition } from "react";

import { toggleProcedureActiveAction } from "@/app/(dashboard)/catalog/procedures/actions";
import { Button } from "@/components/ui/button";

export function ProcedureActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleProcedureActiveAction(id, !active))}
    >
      {active ? "Inativar" : "Reativar"}
    </Button>
  );
}
