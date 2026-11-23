import type { SurgeryAuthorizationRequestData } from "@/lib/data/surgeries";

const CLASSIFICATION_BY_PRIORITY: Record<SurgeryAuthorizationRequestData["priority"], string> = {
  low: "Eletiva",
  normal: "Eletiva",
  high: "Urgente",
  urgent: "Emergência",
};

/** Único médico do sistema — não existe campo de médico solicitante no
 * cadastro da cirurgia, então o nome é fixo aqui. */
const REQUESTING_DOCTOR = "Dr. Flávio Hiroshi Ananias Morita";
const REQUESTING_DOCTOR_CRM = "CRM SP: 146.989";

/**
 * Monta o texto pronto pra copiar e enviar à central de autorizações do
 * convênio/hospital, com as informações que o sistema já tem preenchidas:
 * paciente, convênio, procedimento(s) com código TUSS e os materiais/OPME
 * da cirurgia (tela de edição) e a indicação clínica como justificativa.
 * Sem indicação clínica, a justificativa fica como placeholder entre colchetes.
 */
export function buildAuthorizationRequestText(data: SurgeryAuthorizationRequestData): string {
  const isParticular = data.attendance_type === "particular";

  const convenioLine = isParticular
    ? "Particular (sem convênio)"
    : (data.insurance_provider_name ?? "[Operadora / Plano]");
  const carteirinhaLine = isParticular
    ? "Não se aplica (atendimento particular)"
    : (data.patient_insurance_card_number ?? "[Número da carteirinha]");

  const procedureRows =
    data.procedures.length > 0
      ? data.procedures
          .map((p) => `| ${p.tuss_code ?? "[Código TUSS]"} | 1 | ${p.name} |`)
          .join("\n")
      : "| [Código TUSS] | [Qtd.] | [Descrição do procedimento] |";

  const materialRows =
    data.materials.length > 0
      ? data.materials.map((m) => `| ${m.name} | ${m.quantity} |`).join("\n")
      : "| [Descrição do material] | [Qtd.] |";

  return `Olá,

Solicitamos a análise e autorização para realização do procedimento cirúrgico abaixo:

1. IDENTIFICAÇÃO DO PACIENTE

- Paciente: ${data.patient_name}
- Convênio: ${convenioLine}
- Carteirinha: ${carteirinhaLine}
- Hospital previsto: ${data.hospital_name ?? "[Nome do hospital]"}
- Médico solicitante: ${REQUESTING_DOCTOR}
- ${REQUESTING_DOCTOR_CRM}

2. PROCEDIMENTO CIRÚRGICO

| Código TUSS | Qtd | Descrição |
|---|---|---|
${procedureRows}

3. MATERIAIS / OPME SOLICITADOS

| Material | Quantidade |
|---|---|
${materialRows}

4. CRITICIDADE DO PACIENTE

- Classificação: ${CLASSIFICATION_BY_PRIORITY[data.priority]}
- Justificativa clínica: ${data.clinical_indication ?? "[Descrição da criticidade e necessidade de realização do procedimento, quando aplicável]"}

5. DOCUMENTAÇÃO

Encaminhamos em anexo a documentação médica pertinente para análise da solicitação, incluindo pedido cirúrgico, relatório médico e demais documentos necessários.

Solicitamos, por gentileza, a análise e retorno quanto à autorização do procedimento e dos materiais/OPME relacionados.

Caso haja necessidade de informações ou documentos complementares, permanecemos à disposição.`;
}
