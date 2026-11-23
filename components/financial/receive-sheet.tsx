"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, HandCoins } from "lucide-react";

import {
  financialBaseValue,
  financialPaymentStatus,
  financialProcedureSummary,
  financialRowDate,
  type FinancialOverviewRow,
  type Installment,
} from "@/lib/data/financial";
import { FinancialForm } from "@/components/surgeries/financial-form";
import { InstallmentsPanel } from "@/components/surgeries/installments-panel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const brl = (v: number | null | undefined) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

/**
 * Botão "Receber" da lista do Financeiro: abre, ao lado, o mesmo módulo
 * financeiro da ficha da cirurgia (valor acordado, confirmação de
 * recebimento e parcelas) sem sair da lista. Usa as mesmas ações do
 * servidor da ficha, com a mesma checagem de permissão.
 */
export function ReceiveSheetButton({ row, installments }: { row: FinancialOverviewRow; installments: Installment[] }) {
  const [open, setOpen] = useState(false);
  const status = financialPaymentStatus(row);
  const base = financialBaseValue(row);
  const balance = Math.max(0, (base ?? 0) - row.received_value);
  const proc = financialProcedureSummary(row);
  const paid = status === "paid";
  const needsValue = status === "undefined";

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={paid ? "outline" : "default"}
        className={paid ? "h-8 gap-1.5" : "h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"}
        onClick={() => setOpen(true)}
      >
        <HandCoins className="h-3.5 w-3.5" />
        {paid ? "Ver" : needsValue ? "Definir valor" : "Receber"}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold">{row.surgery?.patient?.full_name ?? "Sem paciente"}</SheetTitle>
            <SheetDescription>
              {row.surgery?.code ?? "—"}
              {proc.name ? ` · ${proc.name}${proc.extra > 0 ? ` +${proc.extra}` : ""}` : ""}
              <br />
              {row.surgery?.hospital?.name ?? "—"} · {formatDate(financialRowDate(row))}
            </SheetDescription>
          </SheetHeader>

          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Acordado</dt>
              <dd className="font-semibold text-foreground">{base != null ? brl(base) : "Não informado"}</dd>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Recebido</dt>
              <dd className="font-semibold text-emerald-600 dark:text-emerald-400">{brl(row.received_value)}</dd>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Saldo</dt>
              <dd className="font-semibold text-foreground">{base != null ? brl(balance) : "—"}</dd>
            </div>
          </dl>

          {needsValue ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              Esta cirurgia ainda não tem valor acordado. Informe o valor abaixo para poder registrar o recebimento.
            </p>
          ) : null}

          <section className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recebimento e parcelas</p>
            <InstallmentsPanel
              surgeryId={row.surgery_id}
              financialRecordId={row.id}
              agreedValue={base != null && balance > 0 ? balance : base}
              installments={installments}
            />
          </section>

          <section className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valor acordado e observações</p>
            <FinancialForm
              surgeryId={row.surgery_id}
              record={{
                id: row.id,
                surgery_id: row.surgery_id,
                expected_value: row.expected_value,
                agreed_value: row.agreed_value,
                notes: row.notes,
              }}
            />
          </section>

          <Link
            href={`/surgeries/${row.surgery_id}`}
            className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Abrir cadastro completo da cirurgia
          </Link>
        </SheetContent>
      </Sheet>
    </>
  );
}
