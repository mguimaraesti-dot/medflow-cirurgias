# Medflow Cirurgias

Sistema de gestão cirúrgica, operacional e financeira — Dr. Flávio Morita.

Infraestrutura própria, separada do Medflow (financeiro da clínica).
Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para o diagnóstico
completo, modelo de dados, fluxos e backlog.

## Rodando localmente

```bash
cp .env.example .env.local   # preencher com as credenciais do projeto Supabase
npm install
npm run dev
```

## Banco de dados

As migrations estão em `supabase/migrations/`. Para aplicar num projeto
Supabase:

```bash
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

Depois de aplicar, gerar os tipos TypeScript do banco:

```bash
npx supabase gen types typescript --project-id <PROJECT_REF> > types/database.ts
```

Ver `supabase/seed/README.md` para o passo a passo de criação do usuário
administrador único.
