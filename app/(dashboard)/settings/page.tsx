import Link from "next/link";
import { Building2, HeartHandshake, CalendarHeart, Users, DatabaseZap } from "lucide-react";

import { requireModuleView } from "@/lib/auth/guard";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { AiCreditCard } from "@/components/settings/ai-credit-card";
import { Card, CardContent } from "@/components/ui/card";

const SECTIONS = [
  {
    href: "/settings/hospitals",
    icon: Building2,
    title: "Hospitais",
    description: "Hospitais onde as cirurgias são realizadas.",
  },
  {
    href: "/settings/insurance-providers",
    icon: HeartHandshake,
    title: "Operadoras e convênios",
    description: "Operadoras de saúde e regras de autorização/pagamento.",
  },
  {
    href: "/settings/holidays",
    icon: CalendarHeart,
    title: "Feriados",
    description: "Destaque visual na Agenda — nacionais, estaduais e municipais.",
  },
  {
    href: "/settings/tuss",
    icon: DatabaseZap,
    title: "Tabela TUSS",
    description: "Cópia local da tabela da ANS para busca rápida de códigos. Atualização manual.",
  },
  {
    href: "/settings/users",
    icon: Users,
    title: "Usuários e permissões",
    description: "Convites por e-mail (login via Google), funções e permissões por módulo.",
  },
];

export default async function SettingsPage() {
  await requireModuleView("settings");
  const canEdit = await hasPermission(await getCurrentUser(), "settings", "edit");
  return (
    <div>
      <h1 className="text-lg font-medium text-foreground">Configurações</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cadastros administrativos usados em todo o sistema.
      </p>

      <div className="mt-6">
        <AiCreditCard canEdit={canEdit} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.title} href={section.href}>
              <Card className="transition-colors hover:border-ring">
                <CardContent className="flex items-start gap-3 pt-5">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{section.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
