-- Cria automaticamente um `profiles` e atribui a role de acesso total a
-- qualquer usuário criado no Supabase Auth. Enquanto houver um único
-- usuário (Paula Guimarães), isso é exatamente o comportamento desejado.
-- Quando os perfis de visualização/edição existirem, trocar o
-- `insert into user_roles` abaixo por uma lógica que decide a role por
-- convite em vez de aplicar sempre a mesma.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  full_access_role_id uuid;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.email);

  select id into full_access_role_id from public.roles where name = 'admin_full_access';

  if full_access_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.id, full_access_role_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
