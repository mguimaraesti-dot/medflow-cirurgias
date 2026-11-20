-- ============================================================================
-- Fase 3 — automações da ficha da cirurgia
--
--   1. Código sequencial da cirurgia (ex: CIR-2026-0001), gerado pelo banco
--      para não depender de condição de corrida na aplicação.
--   2. Criação automática das 4 linhas de `surgery_requirements` (gate de
--      liberação: autorização / materiais / reserva / pré-operatório) toda
--      vez que uma cirurgia é criada — a aplicação nunca precisa lembrar de
--      inserir essas linhas manualmente.
--   3. Histórico imutável de mudança de etapa (`surgery_stage_history`):
--      o próprio banco grava a transição sempre que `stage_id` muda,
--      inclusive na criação (from_stage_id nulo). Isso garante o invariante
--      "nunca apagar" mesmo que algum código futuro esqueça de registrar.
--      `changed_by`/`reason` continuam podendo ser preenchidos pela
--      aplicação via `set_config('app.change_reason', ..., true)` — opcional,
--      por isso o default é nulo.
-- ============================================================================

create sequence if not exists surgery_code_seq;

create or replace function generate_surgery_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or btrim(new.code) = '' then
    new.code := 'CIR-' || extract(year from now())::text || '-' ||
      lpad(nextval('surgery_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_surgeries_generate_code on surgeries;
create trigger trg_surgeries_generate_code
  before insert on surgeries
  for each row execute function generate_surgery_code();

create or replace function create_surgery_requirements()
returns trigger
language plpgsql
as $$
begin
  insert into surgery_requirements (surgery_id, requirement_key)
  values
    (new.id, 'authorization'),
    (new.id, 'materials'),
    (new.id, 'or_reservation'),
    (new.id, 'preoperative')
  on conflict (surgery_id, requirement_key) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_surgeries_create_requirements on surgeries;
create trigger trg_surgeries_create_requirements
  after insert on surgeries
  for each row execute function create_surgery_requirements();

create or replace function log_surgery_stage_change()
returns trigger
language plpgsql
as $$
declare
  v_reason text;
begin
  begin
    v_reason := nullif(current_setting('app.change_reason', true), '');
  exception when others then
    v_reason := null;
  end;

  if tg_op = 'INSERT' then
    insert into surgery_stage_history (surgery_id, from_stage_id, to_stage_id, changed_by, reason)
    values (new.id, null, new.stage_id, auth.uid(), v_reason);
  elsif tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id then
    insert into surgery_stage_history (surgery_id, from_stage_id, to_stage_id, changed_by, reason)
    values (new.id, old.stage_id, new.stage_id, auth.uid(), v_reason);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_surgeries_log_stage_change on surgeries;
create trigger trg_surgeries_log_stage_change
  after insert or update on surgeries
  for each row execute function log_surgery_stage_change();
