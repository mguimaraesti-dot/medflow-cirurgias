-- Opcional: cirurgias que já estão na etapa "Realizada/Encerrada" mas seguem com status "active".
update surgeries s
   set status = 'completed'
  from workflow_stages w
 where w.id = s.stage_id and w.code = 'completed'
   and s.status in ('active','rescheduled');
