import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancialForm } from "@/components/surgeries/financial-form";
import { InstallmentsPanel } from "@/components/surgeries/installments-panel";
import type { FinancialRecord, Installment } from "@/lib/data/financial";

/**
 * Card financeiro da ficha da cirurgia.
 *
 * Por enquanto o financeiro só cobre particular (valor acordado via
 * FinancialForm + parcelas via InstallmentsPanel, que soma
 * automaticamente em financial_records.received_value a cada
 * recebimento). Convênio foi decidido como fora de escopo por ora — a
 * tela de faturamento/glosas (ConvenioValuesForm/InsuranceBillingPanel)
 * e os dados em lib/data/financial.ts continuam prontos no código,
 * só não são exibidos, pra não reconstruir do zero quando for ativado.
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
  if (attendanceType !== "particular") {
    return (
      <Card className="mt-6 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Financeiro (convênio)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            O financeiro de convênio (faturamento, glosas) ainda não está disponível nesta tela.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Financeiro (particular)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-0">
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
      </CardContent>
    </Card>
  );
}
