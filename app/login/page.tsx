import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/brand/logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo stacked className="mb-4" />
          <p className="mt-1 text-lg font-medium text-foreground">
            Gestão cirúrgica, operacional e financeira sem complicação.
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
