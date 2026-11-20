"use client";

import { useActionState } from "react";

import {
  createOrReservationAction,
  updateOrReservationAction,
  type OrReservationFormState,
} from "@/app/(dashboard)/surgeries/operations-actions";
import type { OrReservation } from "@/lib/data/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "not_requested", label: "Não solicitada" },
  { value: "requested", label: "Solicitada" },
  { value: "awaiting_confirmation", label: "Aguardando confirmação" },
  { value: "confirmed", label: "Confirmada" },
  { value: "rescheduled", label: "Reagendada" },
  { value: "cancelled", label: "Cancelada" },
];

const initialState: OrReservationFormState = {};

export function OrReservationCard({
  surgeryId,
  hospitalId,
  reservation,
}: {
  surgeryId: string;
  hospitalId: string;
  reservation: OrReservation | null;
}) {
  const action = reservation
    ? updateOrReservationAction.bind(null, reservation.id, surgeryId)
    : createOrReservationAction.bind(null, surgeryId, hospitalId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={reservation?.status ?? "not_requested"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="room">Sala</Label>
          <Input id="room" name="room" defaultValue={reservation?.room ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="requested_date">Data solicitada</Label>
          <Input
            id="requested_date"
            name="requested_date"
            type="date"
            defaultValue={reservation?.requested_date ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmed_date">Data confirmada</Label>
          <Input
            id="confirmed_date"
            name="confirmed_date"
            type="date"
            defaultValue={reservation?.confirmed_date ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmed_time">Horário</Label>
          <Input
            id="confirmed_time"
            name="confirmed_time"
            type="time"
            defaultValue={reservation?.confirmed_time ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="change_reason">Motivo de mudança/cancelamento (se houver)</Label>
        <Textarea
          id="change_reason"
          name="change_reason"
          defaultValue={reservation?.change_reason ?? ""}
        />
      </div>

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Salvando..." : reservation ? "Salvar reserva" : "Registrar solicitação"}
        </Button>
      </div>
    </form>
  );
}
