-- ============================================================================
-- Fase 4 — sincronização automática dos requisitos de liberação
--
-- Os 4 requisitos (`surgery_requirements`) passam a refletir sozinhos o
-- status real de cada trilha paralela, em vez de depender só da marcação
-- manual. O checkbox "Dispensar" continua funcionando como override humano
-- (estas rotinas nunca tocam `waived`/`waived_reason`, só `is_satisfied`).
--
--   * authorization  -> satisfeito quando authorization_requests.status
--                       é 'approved' ou 'partially_approved'.
--   * or_reservation -> satisfeito quando or_reservations.status = 'confirmed'.
--   * preoperative   -> satisfeito quando todos os itens do checklist da
--                       cirurgia estão 'done' ou 'waived' (e há ao menos 1).
--   * materials      -> satisfeito quando todos os itens de material da
--                       cirurgia (exceto 'removed') estão em 'confirmed',
--                       'delivered' ou 'used' (e há ao menos 1).
--
-- Também grava authorization_history automaticamente a cada mudança de
-- status, no mesmo espírito de surgery_stage_history (nunca depender da
-- aplicação lembrar de logar).
-- ============================================================================

create or replace function set_requirement_satisfied(p_surgery_id uuid, p_key text, p_satisfied boolean)
returns void
language plpgsql
as $$
begin
  update surgery_requirements
  set is_satisfied = p_satisfied, updated_at = now()
  where surgery_id = p_surgery_id and requirement_key = p_key;
end;
$$;

-- ----------------------------------------------------------------------------
-- Autorização
-- ----------------------------------------------------------------------------
create or replace function sync_authorization_requirement()
returns trigger
language plpgsql
as $$
begin
  perform set_requirement_satisfied(
    new.surgery_id, 'authorization', new.status in ('approved', 'partially_approved')
  );
  return new;
end;
$$;

drop trigger if exists trg_authorization_requests_sync on authorization_requests;
create trigger trg_authorization_requests_sync
  after insert or update of status on authorization_requests
  for each row execute function sync_authorization_requirement();

create or replace function log_authorization_history()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into authorization_history (authorization_id, status, changed_by)
    values (new.id, new.status, new.responsible);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_authorization_requests_history on authorization_requests;
create trigger trg_authorization_requests_history
  after insert or update on authorization_requests
  for each row execute function log_authorization_history();

-- ----------------------------------------------------------------------------
-- Reserva de centro cirúrgico
-- ----------------------------------------------------------------------------
create or replace function sync_or_reservation_requirement()
returns trigger
language plpgsql
as $$
begin
  perform set_requirement_satisfied(new.surgery_id, 'or_reservation', new.status = 'confirmed');
  return new;
end;
$$;

drop trigger if exists trg_or_reservations_sync on or_reservations;
create trigger trg_or_reservations_sync
  after insert or update of status on or_reservations
  for each row execute function sync_or_reservation_requirement();

-- ----------------------------------------------------------------------------
-- Pré-operatório (agregado por todos os itens do checklist da cirurgia)
-- ----------------------------------------------------------------------------
create or replace function sync_preoperative_requirement()
returns trigger
language plpgsql
as $$
declare
  v_surgery_id uuid;
  v_total int;
  v_done int;
begin
  select surgery_id into v_surgery_id
  from preoperative_checklists
  where id = coalesce(new.checklist_id, old.checklist_id);

  if v_surgery_id is null then
    return coalesce(new, old);
  end if;

  select count(*), count(*) filter (where pi.status in ('done', 'waived'))
  into v_total, v_done
  from preoperative_items pi
  join preoperative_checklists pc on pc.id = pi.checklist_id
  where pc.surgery_id = v_surgery_id;

  perform set_requirement_satisfied(v_surgery_id, 'preoperative', v_total > 0 and v_total = v_done);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_preoperative_items_sync on preoperative_items;
create trigger trg_preoperative_items_sync
  after insert or update or delete on preoperative_items
  for each row execute function sync_preoperative_requirement();

-- ----------------------------------------------------------------------------
-- Materiais da cirurgia
-- ----------------------------------------------------------------------------
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
         count(*) filter (where status in ('confirmed', 'delivered', 'used'))
  into v_total, v_ready
  from surgery_material_items
  where surgery_id = v_surgery_id;

  perform set_requirement_satisfied(v_surgery_id, 'materials', v_total > 0 and v_total = v_ready);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_surgery_material_items_sync on surgery_material_items;
create trigger trg_surgery_material_items_sync
  after insert or update or delete on surgery_material_items
  for each row execute function sync_materials_requirement();
