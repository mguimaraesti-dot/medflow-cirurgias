-- ============================================================================
-- Simplifica "Protocolos de materiais" (nomes, versões, aprovação) para um
-- único kit de materiais padrão por procedimento (sem hospital, sem versão,
-- sem aprovação) — pedido do usuário para reduzir a complexidade do recurso.
--
-- Dados existentes: só havia 2 protocolos de teste e nenhum item
-- cadastrado em produção no momento desta migração, então não há dado real
-- a migrar.
-- ============================================================================

-- Remove a coluna que referenciava protocol_versions (histórico de import
-- por protocolo deixa de existir — a cirurgia continua com seus materiais
-- normalmente, só perde a referência de "de onde veio").
alter table surgery_material_items drop column if exists source_protocol_version_id;

drop table if exists protocol_items;
drop table if exists protocol_versions;
drop table if exists procedure_protocols;

create table procedure_default_materials (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null references procedures (id) on delete cascade,
  material_id uuid not null references materials_catalog (id) on delete cascade,
  quantity numeric not null default 1,
  unit text,
  specs text,
  preferred_supplier_id uuid references suppliers (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (procedure_id, material_id)
);

alter table procedure_default_materials enable row level security;

create policy procedure_default_materials_full_access_authenticated
  on procedure_default_materials for all to authenticated using (true) with check (true);
