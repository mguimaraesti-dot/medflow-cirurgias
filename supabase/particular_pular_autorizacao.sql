-- Opcional (rodar uma vez no SQL Editor): aplica a regra "particular não tem autorização"
-- às cirurgias particulares já cadastradas. Cirurgias novas/editadas já são tratadas pelo sistema.
update surgery_requirements r
   set waived = true,
       waived_reason = 'Atendimento particular — não requer autorização de convênio.'
  from surgeries s
 where s.id = r.surgery_id
   and s.attendance_type = 'particular'
   and r.requirement_key = 'authorization'
   and r.waived = false and r.is_satisfied = false;

-- Cards particulares parados em "Autorização" vão para a etapa seguinte.
update surgeries s
   set stage_id = nxt.id, board_position = (extract(epoch from now()) * 1000)::bigint
  from workflow_stages cur, workflow_stages nxt
 where s.stage_id = cur.id and cur.code = 'authorization'
   and nxt.code = 'or_reservation'
   and s.attendance_type = 'particular' and s.status = 'active';
