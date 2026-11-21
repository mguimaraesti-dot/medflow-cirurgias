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
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
            <GoogleIcon className="h-3 w-3" />
          </span>
          {pending ? "Redirecionando..." : "Entrar com Google"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Símbolo oficial do Google ("G" colorido), usado conforme as diretrizes
// de marca do Google para botões de "Entrar com Google".
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039 l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l0.003-0.002l6.19,5.238 C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}
