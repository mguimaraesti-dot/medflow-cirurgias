import Link from "next/link";
import { Building2, HeartHandshake, Users } from "lucide-react";

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
    href: "#",
    icon: Users,
    title: "Usuários e permissões",
    description: "Hoje: usuário único com acesso total. Perfis granulares entram numa fase futura.",
    disabled: true,
  },
];

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-lg font-medium text-slate-900">Configurações</h1>
      <p className="mt-1 text-sm text-slate-500">
        Cadastros administrativos usados em todo o sistema.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const content = (
            <Card
              className={
                section.disabled
                  ? "opacity-60"
                  : "transition-colors hover:border-slate-300"
              }
            >
              <CardContent className="flex items-start gap-3 pt-5">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{section.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                </div>
              </CardContent>
            </Card>
          );

          if (section.disabled) {
            return <div key={section.title}>{content}</div>;
          }

          return (
            <Link key={section.title} href={section.href}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
