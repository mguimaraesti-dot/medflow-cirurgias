import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/brand/logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-3" />
          <p className="mt-1 text-sm text-muted-foreground">
            Gestão cirúrgica, operacional e financeira — Dr. Flávio Morita
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
