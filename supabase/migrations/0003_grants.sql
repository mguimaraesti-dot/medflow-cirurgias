-- Privilégios de GRANT para as roles do PostgREST/Supabase Auth.
--
-- RLS decide QUAIS linhas uma role vê; GRANT decide SE ela pode tocar na
-- tabela. Faltou aplicar isso na migration 0001 — em alguns projetos
-- Supabase recém-criados, os privilégios padrão (`ALTER DEFAULT
-- PRIVILEGES ... TO anon, authenticated, service_role`) não cobrem
-- automaticamente tabelas criadas via SQL Editor. Esta migration corrige
-- isso de forma idempotente e também define os defaults para tabelas
-- futuras.
--
-- `anon` recebe só USAGE no schema (necessário para o PostgREST responder
-- com o erro correto em vez de "schema not found"), sem SELECT/INSERT em
-- nenhuma tabela: este sistema não tem nenhuma tela pública, tudo exige
-- login.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
