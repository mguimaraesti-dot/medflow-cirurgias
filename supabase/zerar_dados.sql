-- ============================================================================
-- v2: removidas protocol_items/protocol_versions/procedure_protocols da
-- lista — essas 3 tabelas foram descontinuadas pela migration 0008 (o
-- recurso de "protocolos de materiais" virou procedure_default_materials)
-- e não existem mais no banco, por isso a v1 deste script deu erro
-- "relation does not exist" ao tentar truncar uma tabela que já não existe.
-- ============================================================================
-- Zera TODOS os dados cadastrados (pacientes, cirurgias e tudo derivado,
-- além de cadastros/catálogo: hospitais, convênios, procedimentos,
-- materiais, fornecedores, feriados e etapas do fluxo) para começar com o
-- sistema limpo. IRREVERSÍVEL — não existe desfazer depois de rodar isso.
--
-- O que NÃO é apagado (de propósito, pra ninguém perder o acesso):
--   profiles, roles, permissions, role_permissions, user_roles,
--   allowed_users (login/controle de acesso).
--
-- Como rodar: Supabase Dashboard > SQL Editor > cole este arquivo inteiro
-- > Run. Depois de rodar, confira o board do Kanban — as 8 etapas padrão
-- são recriadas no fim deste script, mas hospitais, convênios, materiais,
-- procedimentos e fornecedores ficam vazios e precisam ser recadastrados
-- antes de criar a primeira cirurgia de verdade.
-- ============================================================================

truncate table
  -- dados de pacientes/cirurgias e tudo derivado
  insurance_glosas,
  insurance_billing,
  receivable_installments,
  financial_records,
  surgery_material_items,
  preoperative_items,
  preoperative_checklists,
  or_reservations,
  authorization_history,
  authorization_requests,
  notifications,
  tasks,
  attachments,
  surgery_requirements,
  surgery_stage_history,
  surgery_additional_procedures,
  surgery_procedures,
  surgery_documents,
  surgeries,
  patients,
  -- catálogos/cadastros
  procedure_default_materials,
  material_suppliers,
  materials_catalog,
  procedures,
  suppliers,
  hospitals,
  insurance_providers,
  holidays,
  workflow_stages,
  -- log de atividade (histórico das ações feitas durante os testes)
  activity_logs
restart identity cascade;

-- Sem essas 3 sequências, os próximos cadastros reaproveitariam os mesmos
-- códigos (CIR-2026-0001, PROC-0001 etc.) que já apareceram nos testes.
alter sequence surgery_code_seq restart with 1;
alter sequence procedure_code_seq restart with 1;
alter sequence material_code_seq restart with 1;
alter sequence insurance_provider_code_seq restart with 1;

-- Recria as 8 etapas padrão do Kanban (sem elas o Mapa Cirúrgico fica sem
-- nenhuma coluna) — mesmos nomes/códigos definidos na criação do sistema.
insert into workflow_stages (code, name, sort_order) values
  ('new_indication', 'Solicitações recebidas', 1),
  ('hospital_request', 'Solicitação hospitalar', 2),
  ('authorization', 'Autorização', 3),
  ('materials_opme', 'Materiais/OPME', 4),
  ('or_reservation', 'Reserva do centro cirúrgico', 5),
  ('preoperative', 'Preparação pré-operatória', 6),
  ('released', 'Cirurgia liberada', 7),
  ('completed', 'Realizada/Encerrada', 8);
