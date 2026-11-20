-- Garante no máximo um checklist pré-operatório por cirurgia — a ficha da
-- cirurgia cria/reaproveita o checklist automaticamente (get-or-create) e,
-- sem essa restrição, duas requisições concorrentes poderiam criar dois.
alter table preoperative_checklists
  add constraint preoperative_checklists_surgery_id_key unique (surgery_id);
