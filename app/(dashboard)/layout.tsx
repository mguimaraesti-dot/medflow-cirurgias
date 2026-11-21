import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser, getCurrentAccess } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Usuário autenticado mas sem role nenhuma (acesso revogado, ou convite
  // criado errado) não entra em nenhuma tela do dashboard — a tela
  // "/sem-acesso" é a única acessível nesse estado.
  const access = await getCurrentAccess(user.id);
  if (!access) {
    redirect("/sem-acesso");
  }

  return (
    <div className="flex min-h-screen bg-muted">
      <div className="shrink-0 print:hidden">
        <Sidebar
          userEmail={user.email ?? null}
          roleName={access.roleName}
          permissions={Array.from(access.permissions)}
        />
      </div>
      <main className="flex-1 overflow-y-auto">
        {/*
          Sem max-w aqui: telas de lista/kanban/tabela devem aproveitar toda
          a largura disponível. Telas de formulário (ex: nova cirurgia, novo
          paciente) já limitam sua própria largura internamente para manter
          a leitura confortável.
        */}
        <div className="px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
