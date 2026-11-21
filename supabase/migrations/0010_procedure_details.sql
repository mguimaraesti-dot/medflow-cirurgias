-- Amplia o cadastro de Procedimentos: código TUSS, região anatômica,
-- classificação, tipo, local de realização e os requisitos do
-- procedimento (anestesia, internação, OPME, equipamentos especiais,
-- exigência de autorização). "specialty" já existia e continua sendo
-- usado para a especialidade executora (agora com lista sugerida na UI,
-- mas livre no banco).

alter table procedures
  add column if not exists tuss_code text,
  add column if not exists anatomical_region text,
  add column if not exists classification text
    check (classification in ('diagnostico', 'terapeutico', 'ambos')),
  add column if not exists procedure_type text
    check (procedure_type in ('endoscopico', 'cirurgico')),
  add column if not exists location text,
  add column if not exists requires_anesthesia boolean not null default false,
  add column if not exists requires_hospitalization boolean not null default false,
  add column if not exists requires_opme boolean not null default false,
  add column if not exists requires_special_equipment boolean not null default false,
  add column if not exists requires_authorization boolean not null default false;
