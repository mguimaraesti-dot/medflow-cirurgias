-- Simplifica o fluxo do Mapa Cirúrgico: remove as etapas "Solicitação
-- hospitalar" e "Materiais/OPME" do Kanban e renomeia "Reserva do centro
-- cirúrgico" para "Agendamento".
--
-- As duas etapas removidas NÃO são apagadas de workflow_stages: já
-- existem linhas de surgery_stage_history apontando pra elas (histórico
-- imutável, nunca apagamos), e apagar a etapa quebraria essa referência
-- (foreign key) além de perder o nome exibido no histórico de cirurgias
-- antigas. Em vez disso, elas só saem da lista de colunas ativas do
-- Kanban (is_active = false) — continuam existindo só pra manter o
-- histórico e os relatórios antigos legíveis.
--
-- Nenhuma cirurgia hoje está nessas duas etapas (conferido antes de
-- rodar esta migration), então não há card pra mover.

alter table workflow_stages add column if not exists is_active boolean not null default true;

update workflow_stages set is_active = false where code in ('hospital_request', 'materials_opme');

update workflow_stages set name = 'Agendamento' where code = 'or_reservation';

-- Resequencia a ordem das etapas ativas (sem buracos), na ordem do novo
-- processo: Solicitações recebidas -> Autorização -> Agendamento ->
-- Preparação pré-operatória -> Cirurgia liberada -> Realizada/Encerrada.
update workflow_stages set sort_order = 1 where code = 'new_indication';
update workflow_stages set sort_order = 2 where code = 'authorization';
update workflow_stages set sort_order = 3 where code = 'or_reservation';
update workflow_stages set sort_order = 4 where code = 'preoperative';
update workflow_stages set sort_order = 5 where code = 'released';
update workflow_stages set sort_order = 6 where code = 'completed';
