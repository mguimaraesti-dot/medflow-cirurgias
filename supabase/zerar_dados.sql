-- ============================================================================
-- v3 (23/11/2026) — atualizado para as tabelas criadas desde a v2:
--   patient_documents, patient_document_events, procedure_compositions (+ as
--   duas tabelas de itens) e ai_credit_settings. Agora roda dentro de uma
--   transação: se qualquer linha falhar, NADA é apagado.
-- ============================================================================
-- Zera TODOS os dados cadastrados (pacientes, cirurgias e tudo derivado, além
-- de cadastros/catálogo: hospitais, convênios, procedimentos, materiais,
-- composições, fornecedores e etapas do fluxo) para começar com o sistema
-- limpo. IRREVERSÍVEL — não existe desfazer depois de rodar isso.
--
-- O que NÃO é apagado (de propósito):
--   * Usuários e acesso: profiles, roles, permissions, role_permissions,
--     user_roles, allowed_users (e os logins em auth.users).
--   * Tabela TUSS local (tuss_terms, tuss_sync_state): é cópia da ANS, não um
--     cadastro feito pelo usuário; apagar obrigaria a baixar tudo de novo em
--     Configurações > Tabela TUSS.
--   * Feriados NACIONAIS (os que vieram prontos, 2025-2030). Só os feriados
--     estaduais/municipais cadastrados à mão são apagados.
--
-- IMPORTANTE — arquivos enviados (PDFs/fotos de guias e documentos de
-- pacientes) ficam no Supabase Storage e NÃO são apagados por SQL. Depois de
-- rodar este script, esvazie os buckets "surgery-documents" e
-- "patient-documents" em: Supabase > Storage > (bucket) > selecionar tudo >
-- Delete. Sem isso sobram arquivos órfãos ocupando espaço.
--
-- Como rodar: Supabase Dashboard > SQL Editor > cole este arquivo inteiro >
-- Run. No final ele mostra a contagem das tabelas principais (tudo 0) e a das
-- que foram preservadas.
-- ============================================================================

begin;

truncate table
  -- pacientes, cirurgias e tudo derivado
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
  patient_document_events,
  patient_documents,
  patients,
  -- composições (kits de procedimentos + materiais)
  procedure_composition_materials,
  procedure_composition_procedures,
  procedure_compositions,
  -- catálogos/cadastros
  procedure_default_materials,
  material_suppliers,
  materials_catalog,
  procedures,
  suppliers,
  hospitals,
  insurance_providers,
  workflow_stages,
  -- configurações sem uso e log de atividade (histórico das ações dos testes)
  ai_credit_settings,
  activity_logs
restart identity cascade;

-- Feriados: mantém os nacionais que já vêm no sistema; apaga os cadastrados à mão.
delete from holidays where scope <> 'national';

-- Sem estas sequências, os próximos cadastros reaproveitariam os códigos
-- (CIR-2026-0001, PROC-0001 etc.) que já apareceram nos testes.
alter sequence surgery_code_seq restart with 1;
alter sequence procedure_code_seq restart with 1;
alter sequence material_code_seq restart with 1;
alter sequence insurance_provider_code_seq restart with 1;

-- Recria as etapas padrão do Kanban (sem elas o Mapa Cirúrgico fica sem
-- nenhuma coluna). "Solicitação hospitalar" e "Materiais/OPME" continuam
-- existindo só como histórico (is_active = false, cf. migration 0020).
insert into workflow_stages (code, name, sort_order, is_active) values
  ('new_indication', 'Solicitações recebidas', 1, true),
  ('authorization', 'Autorização', 2, true),
  ('or_reservation', 'Agendamento', 3, true),
  ('preoperative', 'Preparação pré-operatória', 4, true),
  ('released', 'Cirurgia liberada', 5, true),
  ('completed', 'Realizada/Encerrada', 6, true),
  ('hospital_request', 'Solicitação hospitalar', 7, false),
  ('materials_opme', 'Materiais/OPME', 8, false);

commit;

-- Conferência: as 3 primeiras linhas devem ser 0; as demais mostram o que foi preservado.
select 'surgeries (deve ser 0)' as tabela, count(*) as total from surgeries
union all select 'patients (deve ser 0)', count(*) from patients
union all select 'materials_catalog (deve ser 0)', count(*) from materials_catalog
union all select 'workflow_stages (deve ser 8)', count(*) from workflow_stages
union all select 'profiles (preservado)', count(*) from profiles
union all select 'allowed_users (preservado)', count(*) from allowed_users
union all select 'user_roles (preservado)', count(*) from user_roles
union all select 'tuss_terms (preservado)', count(*) from tuss_terms
union all select 'holidays (nacionais preservados)', count(*) from holidays;
