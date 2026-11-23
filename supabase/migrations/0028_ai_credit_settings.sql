-- Indicador de saldo da IA (leitura de guias) em Configurações.
-- A Anthropic não expõe o saldo de crédito por API; o sistema lê o GASTO real
-- (Admin API) e calcula: saldo = crédito informado - gasto desde a data da recarga.
-- Linha única (singleton): o usuário atualiza a cada nova recarga.

create table if not exists ai_credit_settings (
  id boolean primary key default true check (id),
  credit_usd numeric(12, 2) not null check (credit_usd >= 0),
  credit_since date not null,
  low_balance_usd numeric(12, 2) not null default 5 check (low_balance_usd >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) default auth.uid()
);

alter table ai_credit_settings enable row level security;

create policy ai_credit_settings_full_access_authenticated
  on ai_credit_settings for all to authenticated using (true) with check (true);
