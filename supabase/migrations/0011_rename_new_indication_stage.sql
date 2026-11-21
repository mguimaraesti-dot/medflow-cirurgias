-- Renomeia a primeira etapa do fluxo (Kanban) de "Nova indicação" para
-- "Solicitações recebidas". O código interno da etapa (new_indication)
-- não muda, só o rótulo exibido.

update workflow_stages set name = 'Solicitações recebidas' where code = 'new_indication';
