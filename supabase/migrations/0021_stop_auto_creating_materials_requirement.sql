-- O requisito "materials" (Materiais/OPME) saiu da ficha da cirurgia
-- (não aparece mais no painel "Requisitos para liberação") e, por pedido
-- do usuário, cirurgias novas não devem mais ganhar essa linha
-- automaticamente.
--
-- Cirurgias já existentes que já tinham a linha 'materials' continuam
-- com ela no banco (não apagamos retroativamente) — só o gatilho de
-- criação de cirurgias novas muda.

create or replace function create_surgery_requirements()
returns trigger
language plpgsql
as $$
begin
  insert into surgery_requirements (surgery_id, requirement_key)
  values
    (new.id, 'authorization'),
    (new.id, 'or_reservation'),
    (new.id, 'preoperative')
  on conflict (surgery_id, requirement_key) do nothing;
  return new;
end;
$$;
