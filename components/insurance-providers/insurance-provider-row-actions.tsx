"use client";

import { deleteInsuranceProviderAction } from "@/app/(dashboard)/settings/insurance-providers/actions";
import { InsuranceProviderActiveToggle } from "@/components/insurance-providers/insurance-provider-active-toggle";
import { DeleteRowButton } from "@/components/shared/delete-row-button";

export function InsuranceProviderRowActions({
  provider,
}: {
  provider: { id: string; name: string; active: boolean };
}) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <InsuranceProviderActiveToggle id={provider.id} active={provider.active} />
      <DeleteRowButton
        confirmMessage={`Excluir a operadora "${provider.name}"? Essa ação não pode ser desfeita.`}
        onDelete={() => deleteInsuranceProviderAction(provider.id)}
      />
    </div>
  );
}
