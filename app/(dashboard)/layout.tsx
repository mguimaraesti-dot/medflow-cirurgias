import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
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

  const permissions = Array.from(access.permissions);

  return (
    <div className="flex min-h-screen bg-muted dark:bg-background md:h-screen md:flex-row md:overflow-hidden print:h-auto print:overflow-visible">
      <div className="shrink-0 print:hidden">
        <Sidebar userEmail={user.email ?? null} roleName={access.roleName} permissions={permissions} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 print:hidden">
          <MobileNav userEmail={user.email ?? null} roleName={access.roleName} permissions={permissions} />
        </div>
        {/*
          overflow-x-hidden: rede de segurança — se algum componente filho
          (um filtro, uma faixa de abas etc.) acabar um pouco mais largo
          que a tela em algum breakpoint, ele é cortado aqui em vez de
          forçar a página inteira a rolar de lado. Rolagem horizontal
          interna de algum componente (ex.: abas do Kanban) continua
          funcionando normalmente, pois é um scroll container próprio.
        */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {/*
            Sem max-w aqui: telas de lista/kanban/tabela devem aproveitar toda
            a largura disponível. Telas de formulário (ex: nova cirurgia, novo
            paciente) já limitam sua própria largura internamente para manter
            a leitura confortável.
          */}
          <div className="px-4 py-4 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
