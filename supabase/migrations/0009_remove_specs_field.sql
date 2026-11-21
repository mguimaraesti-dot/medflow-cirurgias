-- Remove o campo "Especificações técnicas" (specs): era texto livre que
-- nunca aparecia em nenhuma tela além do próprio formulário de cadastro
-- (duplicava Descrição/Observações sem servir pra nada na prática).

alter table materials_catalog drop column if exists specs;
alter table procedure_default_materials drop column if exists specs;
