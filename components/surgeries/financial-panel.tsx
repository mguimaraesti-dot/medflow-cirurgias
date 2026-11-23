"use client";

import { useState } from "react";
import { ChevronDown, Wallet } from "lucide-react";

import { FinancialForm } from "@/components/surgeries/financial-form";
import { InstallmentsPanel } from "@/components/surgeries/installments-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FinancialRecord, Installment } from "@/lib/data/financial";

const brl = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Financeiro da ficha da cirurgia — resumo compacto (valor acordado e
 * recebido) com os formulários/parcelas existentes recolhíveis.
 *
 * Por enquanto o financeiro só cobre particular. Convênio (faturamento/glosas)
 * segue fora de escopo; os componentes e dados continuam prontos no código.
 */
export function FinancialPanel({
  surgeryId,
  attendanceType,
  financialRecord,
  installments,
}: {
  surgeryId: string;
  attendanceType: "particular" | "convenio";
  financialRecord: FinancialRecord;
  installments: Installment[];
}) {
  const [open, setOpen] = useState(false);

  if (attendanceType !== "particular") {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Wallet className="h-4 w-4 text-muted-foreground" /> Financeiro (convênio)
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O financeiro de convênio (faturamento, glosas) ainda não está disponível nesta tela.
        </p>
      </section>
    );
  }

  const pendingInstallments = installments.filter((i) => i.status !== "received" && i.status !== "cancelled").length;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500"><Wallet className="h-4 w-4" /></span>
          Financeiro
        </h2>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "Recolher" : "Gerenciar financeiro"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </Button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <dt className="text-xs text-muted-foreground">Valor acordado</dt>
          <dd className="text-base font-semibold text-foreground">{financialRecord.agreed_value != null ? brl(financialRecord.agreed_value) : "Não informado"}</dd>
        </div>
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <dt className="text-xs text-muted-foreground">Valor recebido</dt>
          <dd className="text-base font-semibold text-foreground">{brl(financialRecord.received_value)}</dd>
        </div>
      </dl>
      {installments.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {installments.length} parcela(s){pendingInstallments > 0 ? ` · ${pendingInstallments} sem confirmação de recebimento` : " · todas confirmadas"}.
        </p>
      ) : null}

      {open ? (
        <div className="mt-4 flex flex-col gap-5 border-t border-border pt-4">
          <FinancialForm surgeryId={surgeryId} record={financialRecord} />
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Parcelas</p>
            <InstallmentsPanel
              surgeryId={surgeryId}
              financialRecordId={financialRecord.id}
              agreedValue={financialRecord.agreed_value}
              installments={installments}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
