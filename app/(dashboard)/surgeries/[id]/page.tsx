import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default async function SurgeryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;

  return (
    <PlaceholderPage
      title="Ficha da cirurgia"
      description="Abas: resumo, paciente, documentação, autorização, materiais/OPME, centro cirúrgico, pré-operatório, financeiro, pendências e histórico."
      phase="Fase 3 (gestão cirúrgica)"
    />
  );
}
