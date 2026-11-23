-- Padroniza nomes de materiais escritos TODOS EM MAIÚSCULAS para "Primeira maiúscula, resto minúsculo".
-- Só altera linhas cujo nome é inteiro em maiúsculas; nomes já em caixa mista não são tocados.
-- Observação: acentos ausentes (ex.: "ALCA") não podem ser restaurados automaticamente.
update public.materials_catalog
set name = upper(left(lower(name), 1)) || substr(lower(name), 2)
where name = upper(name)
  and name ~ '[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]{2,}';

-- Conferência: deve retornar 0 linhas.
select id, name from public.materials_catalog where name = upper(name) and name ~ '[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]{2,}';
