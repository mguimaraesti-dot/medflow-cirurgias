-- Uma cirurgia pode ter vários procedimentos (até então era 1:1 via
-- surgeries.primary_procedure_id). Esta migração cria a tabela de ligação
-- N:N surgery_procedures, migra os dados existentes (cada cirurgia hoje
-- vira 1 linha com is_primary = true) e remove a coluna antiga.

create table surgery_procedures (
  id uuid primary key default gen_random_uuid(),
  surgery_id uuid not null references surgeries (id) on delete cascade,
  procedure_id uuid not null references procedures (id),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (surgery_id, procedure_id)
);

create index idx_surgery_procedures_surgery on surgery_procedures (surgery_id);
create index idx_surgery_procedures_procedure on surgery_procedures (procedure_id);

-- Garante no máximo 1 procedimento principal por cirurgia.
create unique index uniq_surgery_procedures_primary
  on surgery_procedures (surgery_id)
  where is_primary;

alter table surgery_procedures enable row level security;
create policy surgery_procedures_full_access_authenticated
  on surgery_procedures for all to authenticated using (true) with check (true);

-- Backfill: cada cirurgia existente ganha 1 linha com o procedimento que já
-- tinha, marcado como principal.
insert into surgery_procedures (surgery_id, procedure_id, is_primary)
select id, primary_procedure_id, true
from surgeries
where primary_procedure_id is not null
on conflict (surgery_id, procedure_id) do nothing;

alter table surgeries drop column primary_procedure_id;
