# Seed

Não há dados fictícios de cirurgias/pacientes aqui de propósito (seção 27 do
prompt mestre: nunca simular dados reais).

O único "seed" necessário nesta fase é o usuário administrador único:

1. No painel do Supabase do projeto `medflow-cirurgias` → **Authentication →
   Users → Add user**.
2. E-mail: `consultoria.paulaguimaraes@gmail.com`.
3. Defina uma senha temporária e peça para ela trocar no primeiro acesso
   (ou ative "send invite email", se preferir o fluxo de convite).

A trigger `handle_new_user` (migration `0002`) já cria automaticamente o
registro em `profiles` e atribui a role `admin_full_access` assim que esse
usuário é criado — nenhum passo manual adicional é necessário no banco.
