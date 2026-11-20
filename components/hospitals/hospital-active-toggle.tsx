"use client";

import { useTransition } from "react";

import { toggleHospitalActiveAction } from "@/app/(dashboard)/settings/hospitals/actions";
import { Button } from "@/components/ui/button";

export function HospitalActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleHospitalActiveAction(id, !active))}
    >
      {active ? "Inativar" : "Reativar"}
    </Button>
  );
}
