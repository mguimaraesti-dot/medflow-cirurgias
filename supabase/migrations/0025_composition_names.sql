-- Composições: nome descritivo (editável) e data de atualização.
-- O código interno (CMP-000001...) é derivado de procedure_compositions.number
-- (identidade sequencial gerada pelo banco; não editável).
-- Não altera assinaturas nem vínculos existentes: composições já usadas por
-- guias anteriores permanecem exatamente como estão (só ganham um nome).

alter table procedure_compositions
  add column if not exists name text,
  add column if not exists updated_at timestamptz not null default now();

-- Nome inicial das composições existentes: o do procedimento principal.
update procedure_compositions c
set name = p.name
from procedures p
where c.name is null
  and p.id = c.primary_procedure_id;
