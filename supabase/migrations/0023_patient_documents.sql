-- ============================================================================
-- Documentos do paciente (RG/CNH, CPF, carteirinha, pedido médico, exames,
-- laudos...). Vinculados ao PACIENTE (não à cirurgia): continuam disponíveis
-- independentemente de quantas cirurgias ele tenha.
--
-- Segurança (dado de saúde / LGPD):
--  * bucket PRIVADO, com tipos e tamanho limitados pelo próprio Storage;
--  * NENHUMA policy em storage.objects para este bucket e NENHUMA policy nas
--    tabelas abaixo => usuários "authenticated"/"anon" não leem nem gravam
--    direto. Todo acesso passa pelo servidor (service role), que antes checa
--    a permissão do módulo "patients" (view/edit) e gera URLs assinadas
--    de curta duração.
--
-- Rodar no SQL Editor do Supabase. Não altera nem apaga nenhum dado existente.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-documents',
  'patient-documents',
  false,
  15728640, -- 15 MB por arquivo (mesmo limite dos anexos da cirurgia)
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table if not exists patient_documents (
  id uuid primary key default gen_random_uuid(),
  -- restrict: não deixa excluir um paciente que ainda tem documentos
  -- (evitaria arquivos órfãos no Storage); a aplicação pede para excluir
  -- os documentos antes.
  patient_id uuid not null references patients (id) on delete restrict,
  category text not null check (category in (
    'identity', 'cpf', 'insurance_card', 'medical_request',
    'exams', 'medical_findings', 'medical_reports', 'other'
  )),
  file_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_patient_documents_patient on patient_documents (patient_id, created_at desc);

-- Trilha de auditoria: sobrevive à exclusão do documento (sem FK de propósito).
create table if not exists patient_document_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  document_id uuid,
  action text not null check (action in ('upload', 'delete')),
  file_name text not null,
  category text,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_patient_document_events_patient on patient_document_events (patient_id, created_at desc);

alter table patient_documents enable row level security;
alter table patient_document_events enable row level security;

-- Sem policies = negado por padrão; reforço explícito:
revoke all on patient_documents from anon, authenticated;
revoke all on patient_document_events from anon, authenticated;
