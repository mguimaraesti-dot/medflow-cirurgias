-- ============================================================================
-- Medflow Cirurgias — schema inicial
-- Ver docs/ARCHITECTURE.md para o diagnóstico completo, fluxos e decisões.
--
-- Decisões vigentes nesta migration:
--   * Sem multi-tenant (uma única operação: Dr. Flávio Morita).
--   * Um único usuário com acesso total por enquanto (Paula Guimarães).
--     As tabelas de roles/permissions já existem para quando os perfis de
--     visualização/edição forem criados — só então as policies de RLS
--     passam a consultar `role_permissions` em vez da regra fixa abaixo.
--   * Enums modelados como `text` + `CHECK`, não `CREATE TYPE ENUM`, para
--     poder adicionar novos status sem `ALTER TYPE`.
--   * UUID como identificador em todas as tabelas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Util: trigger genérica de updated_at
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. USUÁRIOS E SEGURANÇA
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  action text not null check (action in ('view', 'create', 'edit', 'delete', 'approve')),
  unique (module, action)
);

create table role_permissions (
  role_id uuid not null references roles (id) on delete cascade,
  permission_id uuid not null references permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references roles (id) on delete cascade,
  primary key (user_id, role_id)
);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  entity text not null,
  entity_id uuid not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_logs_entity on activity_logs (entity, entity_id);

-- Seed: role única de acesso total, usada até os perfis granulares existirem.
insert into roles (name, description)
values ('admin_full_access', 'Acesso total — perfil único usado antes da criação dos perfis de visualização/edição.');

-- ============================================================================
-- 2. CADASTROS
-- ============================================================================

create table insurance_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  code text,
  contacts jsonb,
  email text,
  phone text,
  admin_rules text,
  avg_authorization_days int,
  avg_payment_days int,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_insurance_providers_updated_at before update on insurance_providers
  for each row execute function set_updated_at();

create table hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text,
  address jsonb,
  phone text,
  admin_contact text,
  or_contact text,
  email text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_hospitals_updated_at before update on hospitals
  for each row execute function set_updated_at();

create table patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cpf text unique,
  birth_date date,
  phone text,
  whatsapp text,
  email text,
  address jsonb,
  insurance_provider_id uuid references insurance_providers (id),
  insurance_card_number text,
  insurance_card_validity date,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_patients_full_name on patients using gin (to_tsvector('portuguese', full_name));
create trigger trg_patients_updated_at before update on patients
  for each row execute function set_updated_at();

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  trade_name text,
  cnpj text,
  contact_name text,
  phone text,
  email text,
  address jsonb,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_suppliers_updated_at before update on suppliers
  for each row execute function set_updated_at();

-- Catálogo único de procedimentos (consolida o que o prompt original listava
-- como `procedures` + `procedure_catalog` — eram a mesma coisa descrita duas
-- vezes; ver docs/ARCHITECTURE.md).
create table procedures (
  id uuid primary key default gen_random_uuid(),
  internal_code text unique,
  name text not null,
  specialty text,
  description text,
  admin_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_procedures_updated_at before update on procedures
  for each row execute function set_updated_at();

create table materials_catalog (
  id uuid primary key default gen_random_uuid(),
  internal_code text unique,
  name text not null,
  category text,
  description text,
  unit text,
  specs text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_materials_catalog_updated_at before update on materials_catalog
  for each row execute function set_updated_at();

-- N:N materiais <-> fornecedores (um material pode ter vários fornecedores e
-- vice-versa; o fornecedor nunca é um campo fixo do material).
create table material_suppliers (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials_catalog (id) on delete cascade,
  supplier_id uuid not null references suppliers (id) on delete cascade,
  preferred boolean not null default false,
  notes text,
  unique (material_id, supplier_id)
);

-- ============================================================================
-- 3. PROTOCOLOS DE MATERIAIS (versionados)
-- ============================================================================

create table procedure_protocols (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null references procedures (id) on delete cascade,
  hospital_id uuid references hospitals (id), -- null = protocolo geral
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table protocol_versions (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references procedure_protocols (id) on delete cascade,
  version_number int not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'archived')),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (protocol_id, version_number)
);

create table protocol_items (
  id uuid primary key default gen_random_uuid(),
  protocol_version_id uuid not null references protocol_versions (id) on delete cascade,
  material_id uuid not null references materials_catalog (id),
  quantity numeric not null default 1,
  unit text,
  specs text,
  preferred_supplier_id uuid references suppliers (id),
  notes text
);

-- ============================================================================
-- 4. CIRURGIAS
-- ============================================================================

create table workflow_stages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  sort_order int not null
);

insert into workflow_stages (code, name, sort_order) values
  ('new_indication', 'Nova indicação', 1),
  ('hospital_request', 'Solicitação hospitalar', 2),
  ('authorization', 'Autorização', 3),
  ('materials_opme', 'Materiais/OPME', 4),
  ('or_reservation', 'Reserva do centro cirúrgico', 5),
  ('preoperative', 'Preparação pré-operatória', 6),
  ('released', 'Cirurgia liberada', 7),
  ('completed', 'Realizada/Encerrada', 8);

create table surgeries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- gerado pela aplicação (ex: CIR-2026-0001)
  patient_id uuid not null references patients (id),
  hospital_id uuid not null references hospitals (id),
  insurance_provider_id uuid references insurance_providers (id),
  attendance_type text not null check (attendance_type in ('particular', 'convenio')),
  primary_procedure_id uuid not null references procedures (id),
  stage_id uuid not null references workflow_stages (id),
  indication_date date not null default current_date,
  expected_date date,
  confirmed_date date,
  confirmed_time time,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  operational_owner uuid references auth.users (id),
  admin_notes text,
  status text not null default 'active'
    check (status in ('active', 'rescheduled', 'cancelled', 'completed')),
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_surgeries_hospital on surgeries (hospital_id);
create index idx_surgeries_patient on surgeries (patient_id);
create index idx_surgeries_stage on surgeries (stage_id);
create trigger trg_surgeries_updated_at before update on surgeries
  for each row execute function set_updated_at();

-- Procedimentos adicionais de uma cirurgia (além do principal)
create table surgery_additional_procedures (
  id uuid primary key default gen_random_uuid(),
  surgery_id uuid not null references surgeries (id) on delete cascade,
  procedure_id uuid not null references procedures (id)
);

-- Nunca apagar: toda mudança de etapa vira uma linha aqui (cancelamento e
-- reagendamento incluídos).
create table surgery_stage_history (
  id uuid primary key default gen_random_uuid(),
  surgery_id uuid not null references surgeries (id) on delete cascade,
  from_stage_id uuid references workflow_stages (id),
  to_stage_id uuid not null references workflow_stages (id),
  changed_by uuid references auth.users (id),
  reason text,
  previous_values jsonb,
  new_values jsonb,
  changed_at timestamptz not null default now()
);

-- Requisitos do gate de liberação (seção 9/25 do prompt mestre): autorização,
-- materiais, reserva e pré-operatório avançam em paralelo; a cirurgia só
-- libera quando os obrigatórios estiverem satisfeitos ou dispensados com
-- justificativa.
create table surgery_requirements (
  id uuid primary key default gen_random_uuid(),
  surgery_id uuid not null references surgeries (id) on delete cascade,
  requirement_key text not null
    check (requirement_key in ('authorization', 'materials', 'or_reservation', 'preoperative')),
  is_mandatory boolean not null default true,
  is_satisfied boolean not null default false,
  waived boolean not null default false,
  waived_reason text,
  waived_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  unique (surgery_id, requirement_key)
);
create trigger trg_surgery_requirements_updated_at before update on surgery_requirements
  for each row execute function set_updated_at();

create table attachments (
  id uuid primary key default gen_random_uuid(),
  surgery_id uuid references surgeries (id) on delete cascade,
  entity text not null,
  entity_id uuid not null,
  file_path text not null, -- caminho no Supabase Storage (bucket privado)
  file_name text not null,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index idx_attachments_entity on attachments (entity, entity_id);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  surgery_id uuid references surgeries (id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in (
    'documentation', 'hospital', 'insurance', 'materials', 'or',
    'patient', 'preoperative', 'financial', 'administrative'
  )),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'waiting_third_party', 'done', 'cancelled')),
  assigned_to uuid references auth.users (id),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_status on tasks (status);
create trigger trg_tasks_updated_at before update on tasks
  for each row execute function set_updated_at();

-- Notificações in-app (sem canal externo por decisão do cliente).
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  related_entity text,
  related_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_unread on notifications (user_id) where read = false;

-- ============================================================================
-- 5. AUTORIZAÇÃO
-- ============================================================================

create table authorization_requests (
  id uuid primary key default gen_random_uuid(),
  surgery_id uuid not null references surgeries (id) on delete cascade,
  insurance_provider_id uuid references insurance_providers (id),
  protocol_number text,
  requested_procedure text,
  status text not null default 'not_requested' check (status in (
    'not_requested', 'sent', 'in_review', 'pending_docs',
    'approved', 'partially_approved', 'denied', 'expired', 'cancelled'
  )),
  sent_at date,
  returned_at date,
  approved_at date,
  validity_date date,
  denial_reason text,
  responsible uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_authorization_requests_surgery on authorization_requests (surgery_id);
create trigger trg_authorization_requests_updated_at before update on authorization_requests
  for each row execute function set_updated_at();

create table authorization_history (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references authorization_requests (id) on delete cascade,
  status text not null,
  notes text,
  changed_by uuid references auth.users (id),
  changed_at timestamptz not null default now()
);

-- ============================================================================
-- 6. CENTRO CIRÚRGICO
-- ============================================================================

create table or_reservations (
  id uuid primary key default gen_random_uuid(),
  surgery_id uuid not null references surgeries (id) on delete cascade,
  hospital_id uuid not null references hospitals (id),
  expected_date date,
  requested_date date,
  confirmed_date date,
  confirmed_time time,
  room text,
  responsible uuid references auth.users (id),
  status text not null default 'not_requested' check (status in (
    'not_requested', 'requested', 'awaiting_confirmation',
    'confirmed', 'rescheduled', 'cancelled'
  )),
  change_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_or_reservations_surgery on or_reservations (surgery_id);
create trigger trg_or_reservations_updated_at before update on or_reservations
  for each row execute function set_updated_at();

-- ============================================================================
-- 7. PRÉ-OPERATÓRIO
-- ============================================================================

create table preoperative_checklists (
  id uuid primary key default gen_random_uuid(),
  surgery_id uuid not null references surgeries (id) on delete cascade,
  hospital_id uuid references hospitals (id),
  procedure_id uuid references procedures (id),
  created_at timestamptz not null default now()
);

create table preoperative_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references preoperative_checklists (id) on delete cascade,
  description text not null,
  responsible uuid references auth.users (id),
  due_date date,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'done', 'waived')),
  notes text,
  completed_at timestamptz,
  completed_by uuid references auth.users (id),
  attachment_id uuid references attachments (id)
);

-- ============================================================================
-- 8. MATERIAIS NA FICHA DA CIRURGIA
-- ============================================================================

-- Cópia independente do protocolo no momento da cirurgia — alterar a
-- cirurgia nunca modifica o catálogo/protocolo original (seção 15/16).
create table surgery_material_items (
  id uuid primary key default gen_random_uuid(),
  surgery_id uuid not null references surgeries (id) on delete cascade,
  source_protocol_version_id uuid references protocol_versions (id),
  material_id uuid not null references materials_catalog (id),
  supplier_id uuid references suppliers (id),
  quantity numeric not null default 1,
  unit text,
  status text not null default 'suggested' check (status in (
    'suggested', 'requested', 'confirmed', 'delivered', 'used', 'substituted', 'removed'
  )),
  substituted_from_id uuid references surgery_material_items (id),
  substitution_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_surgery_material_items_surgery on surgery_material_items (surgery_id);
create trigger trg_surgery_material_items_updated_at before update on surgery_material_items
  for each row execute function set_updated_at();

-- ============================================================================
-- 9. FINANCEIRO (independente do Medflow — ver docs/ARCHITECTURE.md)
-- ============================================================================

create table financial_records (
  id uuid primary key default gen_random_uuid(),
  surgery_id uuid not null references surgeries (id) on delete cascade,
  attendance_type text not null check (attendance_type in ('particular', 'convenio')),
  expected_value numeric(12, 2),
  agreed_value numeric(12, 2),
  authorized_value numeric(12, 2),
  billed_value numeric(12, 2),
  received_value numeric(12, 2) not null default 0,
  glossed_value numeric(12, 2) not null default 0,
  adjusted_value numeric(12, 2) not null default 0,
  discount_value numeric(12, 2) not null default 0,
  payment_method text check (payment_method in (
    'pix', 'cash', 'credit_card', 'debit_card', 'bank_transfer', 'other'
  )),
  installments_count int not null default 1,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_financial_records_surgery on financial_records (surgery_id);
create trigger trg_financial_records_updated_at before update on financial_records
  for each row execute function set_updated_at();

create table receivable_installments (
  id uuid primary key default gen_random_uuid(),
  financial_record_id uuid not null references financial_records (id) on delete cascade,
  installment_number int not null,
  due_date date not null,
  amount numeric(12, 2) not null,
  received_amount numeric(12, 2) not null default 0,
  received_at date,
  status text not null default 'open'
    check (status in ('open', 'partially_received', 'received', 'late', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (financial_record_id, installment_number)
);
create trigger trg_receivable_installments_updated_at before update on receivable_installments
  for each row execute function set_updated_at();

create table insurance_billing (
  id uuid primary key default gen_random_uuid(),
  financial_record_id uuid not null references financial_records (id) on delete cascade,
  insurance_provider_id uuid not null references insurance_providers (id),
  tuss_code text,
  guide_number text,
  protocol_number text,
  billed_at date,
  expected_payment_date date,
  received_at date,
  received_value numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_insurance_billing_updated_at before update on insurance_billing
  for each row execute function set_updated_at();

create table insurance_glosas (
  id uuid primary key default gen_random_uuid(),
  financial_record_id uuid not null references financial_records (id) on delete cascade,
  insurance_provider_id uuid not null references insurance_providers (id),
  guide_number text,
  billed_value numeric(12, 2),
  glosa_value numeric(12, 2) not null,
  reason text,
  status text not null default 'identified' check (status in (
    'identified', 'in_review', 'appeal_sent', 'awaiting_response',
    'recovered', 'upheld', 'cancelled'
  )),
  glosa_date date not null default current_date,
  appeal_date date,
  justification text,
  recovered_value numeric(12, 2),
  recovered_at date,
  responsible uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_insurance_glosas_updated_at before update on insurance_glosas
  for each row execute function set_updated_at();

-- ============================================================================
-- 10. ROW LEVEL SECURITY
--
-- Fase atual: usuário único com acesso total (ver docs/ARCHITECTURE.md).
-- Toda tabela tem RLS habilitado e uma única policy: qualquer usuário
-- autenticado pode ler/escrever. Quando os perfis forem criados, estas
-- policies são trocadas por checagens em `role_permissions` — sem precisar
-- alterar o schema.
-- ============================================================================

do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_full_access_authenticated', t
    );
  end loop;
end $$;

-- profiles: cada usuário só vê/edita o próprio perfil (sobrepõe a policy
-- genérica acima, que também existe mas fica redundante aqui).
drop policy if exists profiles_full_access_authenticated on profiles;
create policy profiles_self_access on profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
