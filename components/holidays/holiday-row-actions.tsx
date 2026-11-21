"use client";

import { deleteHolidayAction } from "@/app/(dashboard)/settings/holidays/actions";
import { DeleteRowButton } from "@/components/shared/delete-row-button";

export function HolidayRowActions({ holiday }: { holiday: { id: string; name: string } }) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <DeleteRowButton
        confirmMessage={`Excluir o feriado "${holiday.name}"? Essa ação não pode ser desfeita.`}
        onDelete={() => deleteHolidayAction(holiday.id)}
      />
    </div>
  );
}
