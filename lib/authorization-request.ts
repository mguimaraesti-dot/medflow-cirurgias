import type { SurgeryAuthorizationRequestData } from "@/lib/data/surgeries";

const CLASSIFICATION_BY_PRIORITY: Record<SurgeryAuthorizationRequestData["priority"], string> = {
  low: "Eletiva",
  normal: "Eletiva",
  high: "Urgente",
  urgent: "Emergência",
};

/** Único médico do sistema — não existe campo de médico solicitante no
 * cadastro da cirurgia, então o nome é fixo aqui. */
const REQUESTING_DOCTOR = "Dr. Flávio Morita";

/**
 * Monta o texto pronto pra copiar e enviar à central de autorizações do
 * convênio/hospital, com as informações que o sistema já tem preenchidas:
 * paciente, convênio, procedimento(s) com código TUSS e os materiais/OPME
 * do kit padrão de cada procedimento (tela de Procedimentos). Só a
 * justificativa clínica da criticidade fica como placeholder entre
 * colchetes, já que não existe um campo correspondente no cadastro.
 */
export function buildAuthorizationRequestText(data: SurgeryAuthorizationRequestData): string {
  const isParticular = data.attendance_type === "particular";

  const convenioLine = isParticular
    ? "Particular (sem convênio)"
    : (data.insurance_provider_name ?? "[Operadora / Plano]");
  const carteirinhaLine = isParticular
    ? "Não se aplica (atendimento particular)"
    : (data.patient_insurance_card_number ?? "[Número da carteirinha]");

  const procedureBlocks =
    data.procedures.length > 0
      ? data.procedures
          .map(
            (p) =>
              `- Procedimento: ${p.name}\n` +
              `- Código TUSS: ${p.tuss_code ?? "[Código TUSS]"}\n` +
              `- Quantidade: 1`
          )
          .join("\n\n")
      : "- Procedimento: [Descrição do procedimento]\n- Código TUSS: [Código TUSS]\n- Quantidade: [Quantidade]";

  const materialRows =
    data.materials.length > 0
      ? data.materials
          .map((m) => `| ${m.name} | ${m.code ?? ""} | ${m.quantity} |`)
          .join("\n")
      : "| [Descrição do material] | [Código] | [Qtd.] |";

  return `Solicitamos a análise e autorização para realização do procedimento cirúrgico abaixo:

1. IDENTIFICAÇÃO DO PACIENTE

- Paciente: ${data.patient_name}
- Convênio: ${convenioLine}
- Carteirinha: ${carteirinhaLine}
- Hospital previsto: ${data.hospital_name ?? "[Nome do hospital]"}
- Médico solicitante: ${REQUESTING_DOCTOR}

2. PROCEDIMENTO CIRÚRGICO

${procedureBlocks}

3. MATERIAIS / OPME SOLICITADOS

| Material | Código | Quantidade |
|---|---|---|
${materialRows}

4. CRITICIDADE DO PACIENTE

- Classificação: ${CLASSIFICATION_BY_PRIORITY[data.priority]}
- Justificativa clínica: [Descrição da criticidade e necessidade de realização do procedimento, quando aplicável]

5. DOCUMENTAÇÃO

Encaminhamos em anexo a documentação médica pertinente para análise da solicitação, incluindo pedido cirúrgico, relatório médico e demais documentos necessários.

Solicitamos, por gentileza, a análise e retorno quanto à autorização do procedimento e dos materiais/OPME relacionados.

Caso haja necessidade de informações ou documentos complementares, permanecemos à disposição.

Atenciosamente,

Equipe MedFlow – Cirurgias`;
}
