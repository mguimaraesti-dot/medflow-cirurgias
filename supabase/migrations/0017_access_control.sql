-- ============================================================================
-- Fase 7: login via Google (substitui e-mail/senha) + perfis de acesso
-- com múltiplos usuários.
--
-- allowed_users: lista de e-mails convidados, cada um já com uma role
-- atribuída de antemão (convite). O trigger handle_new_user (redefinido
-- abaixo) só cria profile+user_roles pra e-mails presentes aqui — qualquer
-- outro e-mail tem a criação da conta rejeitada (raise exception desfaz a
-- transação inteira, inclusive o auth.users), então login com Google só
-- funciona pra quem foi convidado antes.
-- ============================================================================

create table allowed_users (
  email text primary key,
  role_id uuid not null references roles (id) on delete restrict,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS habilitado sem nenhuma policy pra "authenticated": só o cliente
-- service role (usado em rotinas de servidor de confiança, nunca no
-- navegador) lê/escreve essa tabela. Mesmo tratamento dado abaixo a
-- roles/permissions/role_permissions/user_roles.
alter table allowed_users enable row level security;

-- Convida a usuária já existente (Paula), com a role que ela já tem hoje,
-- pro caso do login dela ser recriado via Google também.
insert into allowed_users (email, role_id)
select p.email, ur.role_id
from profiles p
join user_roles ur on ur.user_id = p.id
on conflict (email) do nothing;

-- ============================================================================
-- Agora que vai existir mais de um usuário, as tabelas de governança de
-- acesso deixam de ter a policy genérica "qualquer autenticado pode tudo"
-- criada na migration inicial — senão qualquer usuário logado poderia se
-- auto-promover a admin_full_access direto pelo cliente anônimo. A partir
-- de agora, RLS habilitado sem policy nenhuma = acesso negado por padrão
-- pra authenticated; só o cliente service role consulta/edita essas
-- tabelas (lib/auth/session.ts e lib/data/access.ts).
-- ============================================================================

drop policy if exists roles_full_access_authenticated on roles;
drop policy if exists permissions_full_access_authenticated on permissions;
drop policy if exists role_permissions_full_access_authenticated on role_permissions;
drop policy if exists user_roles_full_access_authenticated on user_roles;

-- ============================================================================
-- Permissões por módulo: "view" e "edit" (edit cobre criar/editar/excluir
-- dentro do módulo — grid de 2 colunas por módulo em vez de 5, mais
-- simples de gerenciar numa tela). Módulos espelham os itens do menu
-- lateral (lib/navigation.ts).
-- ============================================================================

insert into permissions (module, action)
values
  ('dashboard', 'view'),
  ('kanban', 'view'), ('kanban', 'edit'),
  ('surgeries', 'view'), ('surgeries', 'edit'),
  ('patients', 'view'), ('patients', 'edit'),
  ('schedule', 'view'),
  ('pending_tasks', 'view'), ('pending_tasks', 'edit'),
  ('procedures', 'view'), ('procedures', 'edit'),
  ('materials', 'view'), ('materials', 'edit'),
  ('suppliers', 'view'), ('suppliers', 'edit'),
  ('financial', 'view'), ('financial', 'edit'),
  ('reports', 'view'),
  ('settings', 'view'), ('settings', 'edit'),
  ('users', 'view'), ('users', 'edit')
on conflict (module, action) do nothing;

-- admin_full_access ganha todas as permissões automaticamente — continua
-- sendo o perfil de acesso total.
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.name = 'admin_full_access'
on conflict (role_id, permission_id) do nothing;

-- ============================================================================
-- handle_new_user: agora decide a role pelo convite (allowed_users) em vez
-- de aplicar sempre admin_full_access pra qualquer conta nova.
-- ============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  matched_role_id uuid;
begin
  select role_id into matched_role_id
  from public.allowed_users
  where lower(email) = lower(new.email);

  if matched_role_id is null then
    raise exception 'E-mail % não está autorizado a acessar o MedFlow.', new.email;
  end if;

  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.email);

  insert into public.user_roles (user_id, role_id)
  values (new.id, matched_role_id)
  on conflict do nothing;

  return new;
end;
$$;
