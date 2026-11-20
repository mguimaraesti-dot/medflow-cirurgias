/**
 * Placeholder de tipos do banco. Depois de aplicar as migrations no projeto
 * Supabase, gerar os tipos reais com:
 *
 *   npx supabase gen types typescript --project-id <PROJECT_REF> > types/database.ts
 *
 * Mantendo `Database = any` até lá para não travar o build com tipos
 * incompletos.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
