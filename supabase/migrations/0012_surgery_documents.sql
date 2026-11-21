-- Anexos de documentos da cirurgia (usado na etapa "Solicitação
-- hospitalar" para anexar os documentos do paciente que vão para o
-- hospital: pedido médico, RG, carteirinha do convênio, laudos etc.).
-- Lista livre, por cirurgia, sem bloquear o andamento do Kanban (não é
-- um "requisito" como Autorização/Materiais/Reserva/Pré-operatório).

insert into storage.buckets (id, name, public)
values ('surgery-documents', 'surgery-documents', false)
on conflict (id) do nothing;

create policy "surgery_documents_storage_authenticated_access"
on storage.objects for all
to authenticated
using (bucket_id = 'surgery-documents')
with check (bucket_id = 'surgery-documents');

create table surgery_documents (
  id uuid primary key default gen_random_uuid(),
  surgery_id uuid not null references surgeries (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  description text,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index idx_surgery_documents_surgery on surgery_documents (surgery_id);

alter table surgery_documents enable row level security;
create policy surgery_documents_full_access_authenticated
  on surgery_documents for all to authenticated using (true) with check (true);
