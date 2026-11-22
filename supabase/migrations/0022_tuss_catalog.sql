-- ============================================================================
-- Cópia local das tabelas TUSS da ANS (22 = procedimentos, 19 = materiais/OPME)
--
-- Motivo: a consulta ao vivo à base da ANS varia de ~1s a ~10s (e às vezes
-- trava). Com a cópia local a busca no cadastro fica instantânea e funciona
-- mesmo com a ANS fora do ar. A carga é feita manualmente em
-- Configurações > Tabela TUSS (botão "Atualizar").
--
-- Leitura: qualquer usuário autenticado. Escrita: só pelo cliente service
-- role (usado na ação protegida por permissão settings:edit).
-- ============================================================================

create table if not exists tuss_terms (
  table_name text not null check (table_name in ('tuss-22', 'tuss-19')),
  code text not null,
  name text not null,
  -- nome em minúsculas e sem acento, pra busca que ignora acento/caixa
  search_text text not null,
  start_date date,
  end_date date,
  manufacturer text,
  model text,
  anvisa_registration text,
  risk_class text,
  synced_at timestamptz not null default now(),
  primary key (table_name, code)
);


create table if not exists tuss_sync_state (
  table_name text primary key check (table_name in ('tuss-22', 'tuss-19')),
  last_synced_at timestamptz,
  last_page integer not null default 0,
  status text not null default 'idle' check (status in ('idle', 'running', 'done'))
);

insert into tuss_sync_state (table_name) values ('tuss-22'), ('tuss-19')
on conflict (table_name) do nothing;

alter table tuss_terms enable row level security;
alter table tuss_sync_state enable row level security;

drop policy if exists tuss_terms_select_authenticated on tuss_terms;
create policy tuss_terms_select_authenticated on tuss_terms
  for select to authenticated using (true);

drop policy if exists tuss_sync_state_select_authenticated on tuss_sync_state;
create policy tuss_sync_state_select_authenticated on tuss_sync_state
  for select to authenticated using (true);

-- Sem policy de insert/update/delete para "authenticated": só service role.
