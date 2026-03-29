"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { Plus, CalendarPlus, ArrowUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/agenda": "Agenda",
  "/agenda/relatorios": "Relatorios da Agenda",
  "/agenda/categorias": "Categorias da Agenda",
  "/agenda/novo": "Novo Evento",
  "/financeiro": "Financeiro",
  "/financeiro/transacoes": "Transacoes",
  "/financeiro/transacoes/nova": "Nova Transacao",
  "/financeiro/orcamento": "Orcamento",
  "/financeiro/relatorios": "Relatorios",
  "/financeiro/categorias": "Categorias",
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Minha Agenda";

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <h1 className="text-lg font-semibold">{title}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger className={cn(buttonVariants({ size: "sm" }), "gap-2")}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Link href="/agenda/novo" className="flex items-center gap-2 cursor-pointer w-full">
              <CalendarPlus className="h-4 w-4" />
              Novo evento
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/financeiro/transacoes/nova" className="flex items-center gap-2 cursor-pointer w-full">
              <ArrowUpDown className="h-4 w-4" />
              Nova transacao
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
