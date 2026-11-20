"use client";

import { useTransition } from "react";

import { toggleInsuranceProviderActiveAction } from "@/app/(dashboard)/settings/insurance-providers/actions";
import { Button } from "@/components/ui/button";

export function InsuranceProviderActiveToggle({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleInsuranceProviderActiveAction(id, !active))}
    >
      {active ? "Inativar" : "Reativar"}
    </Button>
  );
}
