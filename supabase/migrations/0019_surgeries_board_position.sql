-- Permite reordenar manualmente os cards dentro da mesma coluna do
-- Kanban (hoje só dava pra mover entre colunas, não dentro da mesma).
-- Usa um número (posição relativa, não um índice sequencial) pra poder
-- inserir um card entre dois outros sem precisar renumerar a coluna
-- inteira a cada arraste — igual Trello/Linear.

alter table surgeries add column if not exists board_position double precision;

-- Backfill: usa a data de criação (em milissegundos) como posição
-- inicial, preservando a ordem cronológica que já existia hoje.
update surgeries
  set board_position = extract(epoch from created_at) * 1000
  where board_position is null;

alter table surgeries alter column board_position set not null;
alter table surgeries alter column board_position set default extract(epoch from now()) * 1000;

create index if not exists idx_surgeries_board_position on surgeries (stage_id, board_position);
