-- Composições de procedimentos + materiais/OPME.
-- Uma composição representa a combinação COMPLETA de uma guia/indicação
-- cirúrgica: o conjunto de procedimentos (identificados por TUSS) e a lista
-- única de materiais com quantidades. A ordem não importa: a identificação é
-- feita pela coluna `signature` (calculada pelo aplicativo com os itens
-- ordenados), única no banco para impedir duplicatas.
-- Mesma assinatura = reutiliza; qualquer diferença em procedimentos,
-- materiais ou quantidades = nova composição (o histórico é mantido).

create table procedure_compositions (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  signature text not null unique,
  primary_procedure_id uuid references procedures (id),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) default auth.uid()
);

create index idx_procedure_compositions_primary
  on procedure_compositions (primary_procedure_id);

create table procedure_composition_procedures (
  composition_id uuid not null references procedure_compositions (id) on delete cascade,
  procedure_id uuid not null references procedures (id),
  is_primary boolean not null default false,
  primary key (composition_id, procedure_id)
);

create index idx_composition_procedures_procedure
  on procedure_composition_procedures (procedure_id);

create table procedure_composition_materials (
  composition_id uuid not null references procedure_compositions (id) on delete cascade,
  material_id uuid not null references materials_catalog (id),
  quantity numeric not null check (quantity > 0),
  primary key (composition_id, material_id)
);

create index idx_composition_materials_material
  on procedure_composition_materials (material_id);

alter table procedure_compositions enable row level security;
alter table procedure_composition_procedures enable row level security;
alter table procedure_composition_materials enable row level security;

create policy procedure_compositions_full_access_authenticated
  on procedure_compositions for all to authenticated using (true) with check (true);
create policy procedure_composition_procedures_full_access_authenticated
  on procedure_composition_procedures for all to authenticated using (true) with check (true);
create policy procedure_composition_materials_full_access_authenticated
  on procedure_composition_materials for all to authenticated using (true) with check (true);

-- Composição usada por cada cirurgia/guia.
alter table surgeries
  add column composition_id uuid references procedure_compositions (id) on delete set null;

create index idx_surgeries_composition on surgeries (composition_id);
