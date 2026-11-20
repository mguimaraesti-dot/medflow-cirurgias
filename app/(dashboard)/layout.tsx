import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userEmail={user.email ?? null} />
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
