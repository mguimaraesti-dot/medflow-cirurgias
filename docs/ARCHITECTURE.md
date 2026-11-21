# Medflow Cirurgias — Arquitetura e plano de execução

Sistema de gestão cirúrgica, operacional e financeira para o Dr. Flávio
Morita (cirurgia geral, aparelho digestivo e endoscopia digestiva), que opera
em dois hospitais. Infraestrutura **totalmente separada** do Medflow
(controle financeiro de clínica já existente): repositório, banco Supabase e
projeto Vercel próprios, para não arriscar o sistema em produção.

## Decisões já tomadas

| Decisão | Status |
|---|---|
| Financeiro deste sistema x Medflow | **Totalmente independentes.** Nenhuma integração de dado entre os dois. |
| Multi-tenant (outros médicos/clínicas no futuro) | **Não implementado agora.** Schema não tem `tenant_id`; se a necessidade aparecer, assume-se o custo de migração depois. |
| Perfis de usuário | **Um único usuário com acesso total** por enquanto: Paula Guimarães (`consultoria.paulaguimaraes@gmail.com`). Perfis de visualização/edição ficam para depois — o schema de `roles`/`permissions` já existe para que essa evolução não exija alterar tabelas, só popular dados. |
| Notificações/alertas | **Somente in-app** (sem WhatsApp/e-mail por enquanto). |
| Repositório | [`mguimaraesti-dot/medflow-cirurgias`](https://github.com/mguimaraesti-dot/medflow-cirurgias) (privado). |

## Stack

- **Frontend/Backend**: Next.js (App Router) + TypeScript, Tailwind CSS.
  Componentes de UI em `components/ui` seguem a convenção do shadcn/ui
  (o `init` via CLI foi bloqueado pelo allowlist de rede do ambiente de
  desenvolvimento; os componentes foram escritos manualmente no mesmo
  padrão e podem ser substituídos pelo registry oficial a qualquer momento
  rodando `npx shadcn@latest add <componente>` numa máquina com acesso).
- **Banco de dados**: PostgreSQL via Supabase (projeto próprio, conta nova).
- **Autenticação**: Supabase Auth.
- **Arquivos**: Supabase Storage (buckets privados, URLs temporárias).
- **Hospedagem**: Vercel (projeto próprio).
- **Gráficos**: Recharts. **Kanban**: dnd-kit.

## Estrutura de pastas

```
app/
  login/                    → página pública de login
  (dashboard)/              → layout protegido (redireciona para /login sem sessão)
    dashboard/ kanban/ surgeries/[id]/ schedule/ pending-tasks/
    catalog/procedures/ catalog/materials/ suppliers/ protocols/
    financial/ reports/ settings/
lib/
  server/                   → regras de negócio por domínio (a preencher na Fase 2+)
  data/                     → acesso ao Supabase por entidade (a preencher)
  validation/               → schemas zod (a preencher)
  auth/                     → session.ts (getCurrentUser, hasPermission), actions.ts (login/logout)
  supabase/                 → client.ts (browser), server.ts (server + admin), middleware.ts
components/
  ui/                       → primitivos (button, card, input, label, badge)
  layout/                   → sidebar com os 12 módulos
  auth/                     → formulário de login
  shared/                   → placeholder-page (estado vazio honesto, sem dado fictício)
supabase/
  migrations/               → SQL versionado (0001_initial_schema, 0002_handle_new_user)
  seed/                     → instruções para criar o usuário único (não há dado fictício de negócio)
docs/
  ARCHITECTURE.md           → este arquivo
```

## Permissão em 3 camadas (mesmo com perfil único hoje)

1. **UI**: esconder ação não permitida (hoje, irrelevante — só existe um usuário).
2. **Server action / route handler**: `hasPermission()` em `lib/auth/session.ts` —
   hoje retorna `true` para qualquer usuário autenticado; quando os perfis
   existirem, passa a consultar `role_permissions`.
3. **RLS no Postgres**: toda tabela tem RLS habilitado. Hoje, uma única
   policy por tabela (`<tabela>_full_access_authenticated`) libera tudo para
   `authenticated`. `profiles` é exceção: cada usuário só acessa o próprio
   registro.

> Nenhuma tela esconde um botão como única proteção — a regra de negócio
> real mora no banco e no backend (seção 26 do prompt original).

## Modelo de dados (migration `0001_initial_schema.sql`)

Consolidação feita em relação ao prompt original: unificamos `procedures` e
`procedure_catalog` (eram a mesma entidade descrita duas vezes) em uma única
tabela `procedures`.

- **Segurança**: `profiles`, `roles`, `permissions`, `role_permissions`,
  `user_roles`, `activity_logs`.
- **Cadastros**: `patients`, `hospitals`, `insurance_providers`, `suppliers`,
  `procedures`, `materials_catalog`, `material_suppliers`.
- **Protocolos versionados**: `procedure_protocols`, `protocol_versions`
  (status `draft` → `pending_approval` → `approved` → `archived`),
  `protocol_items`.
- **Cirurgias**: `workflow_stages` (as 8 etapas do Kanban, já populadas),
  `surgeries`, `surgery_additional_procedures`, `surgery_stage_history`
  (histórico imutável), `surgery_requirements` (gate de liberação:
  autorização / materiais / reserva / pré-operatório, em paralelo),
  `attachments`, `tasks`, `notifications`.
- **Autorização**: `authorization_requests`, `authorization_history`.
- **Centro cirúrgico**: `or_reservations`.
- **Pré-operatório**: `preoperative_checklists`, `preoperative_items`.
- **Materiais da cirurgia**: `surgery_material_items` — cópia independente
  do protocolo no momento da cirurgia (alterar uma cirurgia nunca modifica o
  catálogo/protocolo original).
- **Financeiro** (independente do Medflow): `financial_records`,
  `receivable_installments`, `insurance_billing`, `insurance_glosas`.

Todas as tabelas usam UUID como chave primária, têm `created_at`
(e `updated_at` quando mutáveis, com trigger automática), e os "enums" são
`text` + `CHECK` — permite adicionar novos status sem `ALTER TYPE`.

Validado localmente (Postgres 16 + shim do schema `auth`): as duas migrations
rodam limpas do zero, o trigger `handle_new_user` cria `profiles` +
`user_roles` corretamente ao inserir um usuário, e as 34 tabelas públicas
têm RLS habilitado sem exceção.

## Fluxos operacionais (resumo)

- **Cirurgia**: indicação → cadastro → solicitação hospitalar →
  (autorização ‖ materiais ‖ reserva, em paralelo) → checklist pré-operatório
  → liberação (gate via `surgery_requirements`) → realizada → financeiro →
  encerrada. Cancelamento/reagendamento nunca apaga histórico
  (`surgery_stage_history`).
- **Autorização**: `not_requested` → `sent` → `in_review`/`pending_docs` →
  `approved` (ou `denied`/`expired`) → satisfaz o requisito `authorization`.
- **Materiais**: protocolo aprovado → cópia para a cirurgia
  (`surgery_material_items`) → `requested` → `confirmed` → `delivered` →
  `used` (substituições preservam o item anterior via `substituted_from_id`).
- **Financeiro particular**: valor acordado → parcelas
  (`receivable_installments`) → recebimentos parciais permitidos → saldo.
- **Financeiro convênio**: previsto → autorizado → faturado
  (`insurance_billing`) → recebido → glosa (`insurance_glosas`) → recurso →
  recuperado/mantido.

## Backlog (fases)

1. **Fundação** — ✅ concluída: projeto Next.js, Supabase configurado,
   GitHub conectado, estrutura de pastas, autenticação, layout principal,
   schema inicial com RLS.
2. **Banco e cadastros** — ✅ concluída: telas de pacientes, hospitais,
   operadoras, procedimentos, materiais, fornecedores.
3. **Gestão cirúrgica** — ✅ concluída: ficha da cirurgia, Kanban, histórico,
   anexos, valor particular básico.
4. **Operação cirúrgica** — ✅ quase concluída: autorizações, reserva de
   centro cirúrgico, checklist pré-operatório, materiais/OPME, pendências
   (tarefas). Falta só **protocolos versionados** (hoje os materiais padrão
   por procedimento são uma tabela simples — `procedure_default_materials`
   — sem o fluxo draft → pending_approval → approved → archived descrito
   no modelo de dados original).
5. **Financeiro completo** — ✅ concluída: particular com parcelas e
   recebimentos parciais, convênio com faturamento e glosas (identificação
   → recurso → recuperada/mantida), dashboard `/financial` com totais e
   filtros. Relatórios exportáveis (PDF/Excel) ainda não existem — hoje é
   só a visão em tela.
6. **Gestão e indicadores** — dashboard geral, agenda, relatórios,
   exportações. ✅ Agenda (`/schedule`) concluída: calendário mensal e
   lista, indicadores de status clicáveis, feriados nacionais, filtro por
   hospital/status. ✅ Dashboard (`/dashboard`) concluído: KPIs clicáveis,
   financeiro resumido, próximas cirurgias, gráfico de realizadas por mês.
   `/reports` (relatórios/exportações) continua como placeholder.
7. **Segurança e produção** — revisão de permissões (quando os perfis
   granulares forem criados), testes, homologação, publicação.

## Riscos e decisões em aberto

- **Checklists pré-operatórios padrão** por procedimento/hospital precisam
  ser definidos e validados clinicamente pelo Dr. Flávio — o sistema nunca
  assume requisito clínico por conta própria.
- **Política de retenção de documentos (LGPD)**: prazo de guarda de anexos/
  autorizações após o encerramento da cirurgia ainda não definido.
- **`npx shadcn@latest init`** não roda neste ambiente de desenvolvimento
  (allowlist de rede bloqueia `ui.shadcn.com`) — os componentes base foram
  escritos manualmente seguindo a mesma convenção; isso não bloqueia nada,
  mas registrar aqui para não gerar confusão numa máquina onde o CLI
  funcione e alguém tente rodar `init` de novo.

## Status atual (pós Fase 5)

Em produção (Vercel + Supabase reais, usuário único criado): Fases 1 a 3
completas, Fase 4 completa à exceção de protocolos versionados, e Fase 5
(financeiro completo) completa — particular com parcelas, convênio com
faturamento e glosas, dashboard `/financial`.

Próximos passos possíveis: fechar a Fase 4 (protocolos versionados) ou
avançar pra Fase 6 (dashboard geral, agenda, relatórios e exportações —
hoje só placeholders).
