-- A coluna assigned_to já existia desde o schema inicial (0001), mas
-- apontando direto para auth.users e nunca usada pela aplicação. Troca a
-- FK para apontar para profiles(id) em vez de auth.users(id) — mesmo
-- valor, já que profiles.id referencia auth.users.id 1:1 — por dois
-- motivos:
--   1) o PostgREST só consegue fazer o embed de profiles (pra trazer o
--      nome de quem a tarefa foi atribuída) se houver uma FK entre as
--      duas tabelas; antes não havia.
--   2) a FK original para auth.users não tinha "on delete" definido
--      (= NO ACTION), o que bloquearia a revogação de acesso de alguém
--      que tivesse tarefas atribuídas a ela. Com "on delete set null",
--      revogar o acesso simplesmente desatribui as tarefas da pessoa.
alter table tasks drop constraint if exists tasks_assigned_to_fkey;
alter table tasks
  add constraint tasks_assigned_to_fkey
  foreign key (assigned_to) references profiles (id) on delete set null;

create index if not exists tasks_assigned_to_idx on tasks (assigned_to);
