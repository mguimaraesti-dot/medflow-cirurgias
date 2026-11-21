-- Simplifica o status dos itens de material da cirurgia pra só 2 estados
-- do dia a dia: "requested" (Solicitado) e "delivered" (Entregue) — mais
-- "removed", que é o soft-delete usado pelo botão de remover item, nunca
-- selecionável no formulário.
--
-- Estados antigos ("suggested", "confirmed", "used", "substituted") somem
-- do catálogo selecionável; mapeia o que já existe salvo pra um dos dois
-- novos estados antes de travar a constraint.
update surgery_material_items
set status = 'delivered'
where status = 'used';

update surgery_material_items
set status = 'requested'
where status in ('suggested', 'confirmed', 'substituted');

-- Acha e remove a constraint de check existente na coluna status pelo nome
-- real (em vez de supor o nome padrão do Postgres), pra não falhar caso o
-- nome gerado automaticamente seja diferente do esperado.
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'surgery_material_items'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if v_conname is not null then
    execute format('alter table surgery_material_items drop constraint %I', v_conname);
  end if;
end $$;

alter table surgery_material_items
  add constraint surgery_material_items_status_check
  check (status in ('requested', 'delivered', 'removed'));

alter table surgery_material_items
  alter column status set default 'requested';

-- O requisito "materiais" passa a ser satisfeito quando todo item (exceto
-- removido) está "delivered" — antes contava confirmed/delivered/used.
create or replace function sync_materials_requirement()
returns trigger
language plpgsql
as $$
declare
  v_surgery_id uuid;
  v_total int;
  v_ready int;
begin
  v_surgery_id := coalesce(new.surgery_id, old.surgery_id);

  select count(*) filter (where status <> 'removed'),
         count(*) filter (where status = 'delivered')
  into v_total, v_ready
  from surgery_material_items
  where surgery_id = v_surgery_id;

  perform set_requirement_satisfied(v_surgery_id, 'materials', v_total > 0 and v_total = v_ready);
  return coalesce(new, old);
end;
$$;
