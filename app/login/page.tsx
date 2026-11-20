import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-medium text-slate-900">Medflow Cirurgias</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestão cirúrgica, operacional e financeira — Dr. Flávio Morita
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
