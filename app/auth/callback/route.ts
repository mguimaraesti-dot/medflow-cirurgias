import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Destino do redirect do Google após o login (signInWithOAuth em
 * components/auth/login-form.tsx). Troca o `code` por uma sessão —
 * se o e-mail não estiver na lista de convidados (allowed_users), o
 * trigger `handle_new_user()` no banco rejeita a criação da conta
 * (ver migration 0017) e essa troca falha, então o erro aparece aqui
 * como "login não permitido", não como erro genérico.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
    console.error("[auth/callback] exchangeCodeForSession error:", error.status, error.message);
    // O trigger handle_new_user() (migration 0017) rejeita e-mail não
    // convidado com `raise exception`, e o Supabase Auth normalmente
    // repassa isso como "Database error saving new user" — tratamos
    // qualquer erro de criação de usuário como "não autorizado", já que
    // login de conta já existente não passa por criação nenhuma.
    const reason = /authoriz|not.?allow|denied|forbidden|database error saving new user/i.test(
      error.message
    )
      ? "not_allowed"
      : "callback_failed";
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  return NextResponse.redirect(`${origin}/login?error=callback_failed`);
}
