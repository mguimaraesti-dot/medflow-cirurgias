import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { logout } from "@/lib/auth/actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default async function SemAcessoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm text-center">
        <Logo className="mx-auto mb-6" />
        <h1 className="text-lg font-medium text-foreground">Sem acesso liberado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta ({user.email}) está autenticada, mas ainda não tem nenhum perfil de acesso
          atribuído no MedFlow. Fale com quem administra o sistema pra liberar seu acesso.
        </p>
        <form action={logout} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Sair
          </Button>
        </form>
      </div>
    </div>
  );
}
