"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed:
    "Esse e-mail do Google não está autorizado a acessar o MedFlow. Fale com quem administra o sistema pra ser convidado.",
  callback_failed: "Não foi possível concluir o login com o Google. Tente novamente.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const errorCode = searchParams.get("error");
  const error = errorCode ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.callback_failed : null;

  async function handleGoogleLogin() {
    setPending(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setPending(false);
    }
    // Em caso de sucesso, o navegador é redirecionado pro Google — não há
    // nada mais a fazer aqui.
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-5">
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="button" disabled={pending} onClick={handleGoogleLogin} className="gap-2">
          <GoogleIcon className="h-4 w-4" />
          {pending ? "Redirecionando..." : "Entrar com Google"}
        </Button>
      </CardContent>
    </Card>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 11v2.8h5.9c-.3 1.5-1.9 4.4-5.9 4.4-3.5 0-6.4-2.9-6.4-6.4s2.9-6.4 6.4-6.4c2 0 3.4.8 4.1 1.5l2.1-2.1C16.8 3.2 14.6 2 12 2 6.9 2 2.7 6.1 2.7 11.2s4.2 9.2 9.3 9.2c5.4 0 9-3.8 9-9.1 0-.6-.1-1-.1-1.4H12z"
      />
    </svg>
  );
}
