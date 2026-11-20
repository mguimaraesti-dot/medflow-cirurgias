-- ============================================================================
-- Código sequencial automático para os cadastros que têm campo "código"
-- (mesma ideia do código da cirurgia, seção 1 de ARCHITECTURE.md): o usuário
-- nunca digita, o banco gera sozinho na criação, sempre único.
--
--   * procedures.internal_code        -> PROC-0001, PROC-0002, ...
--   * materials_catalog.internal_code -> MAT-0001, MAT-0002, ...
--   * insurance_providers.code        -> OPER-0001, OPER-0002, ...
--
-- Se por algum motivo um valor já vier preenchido (ex: import futuro de
-- dados antigos), o trigger respeita o valor existente e não sobrescreve.
-- ============================================================================

create sequence if not exists procedure_code_seq;
create sequence if not exists material_code_seq;
create sequence if not exists insurance_provider_code_seq;

create or replace function generate_procedure_code()
returns trigger
language plpgsql
as $$
begin
  if new.internal_code is null or btrim(new.internal_code) = '' then
    new.internal_code := 'PROC-' || lpad(nextval('procedure_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_procedures_generate_code on procedures;
create trigger trg_procedures_generate_code
  before insert on procedures
  for each row execute function generate_procedure_code();

create or replace function generate_material_code()
returns trigger
language plpgsql
as $$
begin
  if new.internal_code is null or btrim(new.internal_code) = '' then
    new.internal_code := 'MAT-' || lpad(nextval('material_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_materials_catalog_generate_code on materials_catalog;
create trigger trg_materials_catalog_generate_code
  before insert on materials_catalog
  for each row execute function generate_material_code();

create or replace function generate_insurance_provider_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or btrim(new.code) = '' then
    new.code := 'OPER-' || lpad(nextval('insurance_provider_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_insurance_providers_generate_code on insurance_providers;
create trigger trg_insurance_providers_generate_code
  before insert on insurance_providers
  for each row execute function generate_insurance_provider_code();
