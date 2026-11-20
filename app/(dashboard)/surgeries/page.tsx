import Link from "next/link";
import { Users } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";
import { Button } from "@/components/ui/button";

export default function SurgeriesPage() {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <PlaceholderPage
            title="Cirurgias"
            description="Lista de cirurgias cadastradas, com busca e filtros."
            phase="Fase 3 (gestão cirúrgica)"
          />
        </div>
      </div>
      <div className="mt-4">
        <Link href="/surgeries/patients">
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4" />
            Gerenciar pacientes
          </Button>
        </Link>
      </div>
    </div>
  );
}
