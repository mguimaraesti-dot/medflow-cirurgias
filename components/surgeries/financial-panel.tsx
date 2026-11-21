import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancialForm } from "@/components/surgeries/financial-form";
import { ConvenioValuesForm } from "@/components/surgeries/convenio-values-form";
import { InstallmentsPanel } from "@/components/surgeries/installments-panel";
import { InsuranceBillingPanel } from "@/components/surgeries/insurance-billing-panel";
import type { ParticularFinancialRecord } from "@/lib/data/surgeries";
import type { FinancialRecord, Installment, InsuranceBilling, Glosa } from "@/lib/data/financial";

/**
 * Card financeiro da ficha da cirurgia — ramifica por attendance_type:
 *
 *   particular: valor acordado (FinancialForm, já existia) + parcelas
 *     (InstallmentsPanel, soma automaticamente em financial_records
 *     .received_value a cada recebimento).
 *   convenio: previsto/autorizado/desconto/ajuste (ConvenioValuesForm) +
 *     faturamento e glosas (InsuranceBillingPanel).
 */
export function FinancialPanel({
  surgeryId,
  attendanceType,
  insuranceProviderId,
  particularRecord,
  financialRecord,
  installments,
  billing,
  glosas,
}: {
  surgeryId: string;
  attendanceType: "particular" | "convenio";
  insuranceProviderId: string | null;
  particularRecord: ParticularFinancialRecord | null;
  financialRecord: FinancialRecord;
  installments: Installment[];
  billing: InsuranceBilling | null;
  glosas: Glosa[];
}) {
  if (attendanceType === "particular") {
    return (
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Financeiro (particular)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-0">
          <FinancialForm surgeryId={surgeryId} record={particularRecord} />
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Parcelas
            </p>
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

  if (!insuranceProviderId) return null;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Financeiro (convênio)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-0">
        <ConvenioValuesForm surgeryId={surgeryId} record={financialRecord} />
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Faturamento
          </p>
          <InsuranceBillingPanel
            surgeryId={surgeryId}
            financialRecordId={financialRecord.id}
            insuranceProviderId={insuranceProviderId}
            billing={billing}
            glosas={glosas}
          />
        </div>
      </CardContent>
    </Card>
  );
}
