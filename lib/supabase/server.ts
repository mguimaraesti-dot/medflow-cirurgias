import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route
 * Handlers. Usa a chave anônima + cookies da sessão do usuário autenticado,
 * respeitando RLS normalmente (não é um cliente administrativo).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` chamado a partir de um Server Component sem middleware
            // de refresh de sessão. Pode ser ignorado se houver middleware
            // atualizando a sessão (ver middleware.ts).
          }
        },
      },
    }
  );
}

/**
 * Cliente administrativo (service role) — ignora RLS. Uso restrito a
 * rotinas server-side de confiança (ex: jobs, webhooks). Nunca importar
 * em código que roda no navegador.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
