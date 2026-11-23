-- Reformulação da tela de edição de cirurgia.
-- Alterações ADITIVAS (colunas opcionais/com padrão); nenhum dado existente é
-- alterado ou apagado, e nada exige preenchimento retroativo.
--
-- 1) Convênio do paciente: plano/categoria e tipo de acomodação.
--    (operadora, nº e validade da carteirinha já existem em `patients`;
--    a imagem/PDF da carteirinha usa os documentos do paciente, categoria
--    'insurance_card', que já mantêm o histórico de envios.)
-- 2) Itens de material da cirurgia: marca de "validado pelo usuário" e de
--    "sugerido pela IA" (a justificativa de uso usa a coluna `notes` que já
--    existe). Itens já cadastrados ficam como "não validados" (padrão).

alter table patients
  add column if not exists insurance_plan text,
  add column if not exists insurance_accommodation text;

alter table surgery_material_items
  add column if not exists validated boolean not null default false,
  add column if not exists ai_suggested boolean not null default false;
