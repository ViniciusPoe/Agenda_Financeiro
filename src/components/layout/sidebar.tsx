"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  LayoutDashboard,
  DollarSign,
  ListTodo,
  BarChart3,
  PiggyBank,
  Tags,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

type NavLink = { label: string; href: string; icon: React.ElementType };
type NavSection = { section: string; items: NavLink[] };
type NavItem = NavLink | NavSection;

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    section: "Agenda",
    items: [
      { label: "Agenda", href: "/agenda", icon: CalendarDays },
      { label: "Relatorios", href: "/agenda/relatorios", icon: BarChart3 },
      { label: "Categorias", href: "/agenda/categorias", icon: Tags },
    ],
  },
  {
    section: "Financeiro",
    items: [
      { label: "Financeiro", href: "/financeiro", icon: DollarSign },
      { label: "Transacoes", href: "/financeiro/transacoes", icon: ListTodo },
      { label: "Orcamento", href: "/financeiro/orcamento", icon: PiggyBank },
      { label: "Relatorios", href: "/financeiro/relatorios", icon: BarChart3 },
      { label: "Categorias", href: "/financeiro/categorias", icon: Tags },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center justify-between p-4 h-16 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary shrink-0" />
            <span className="font-semibold text-sm">Minha Agenda</span>
          </div>
        )}
        {collapsed && <CalendarDays className="h-5 w-5 text-primary mx-auto" />}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 shrink-0", collapsed && "mx-auto")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item, idx) => {
          if ("href" in item) {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && item.label}
                </span>
              </Link>
            );
          }

          return (
            <div key={idx}>
              {!collapsed && (
                <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1">
                  {item.section}
                </p>
              )}
              {collapsed && idx > 0 && <Separator className="my-2" />}
              {item.items.map((subItem) => {
                const isActive =
                  pathname === subItem.href ||
                  (subItem.href !== "/" && pathname.startsWith(subItem.href));
                return (
                  <Link key={subItem.href} href={subItem.href}>
                    <span
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <subItem.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && subItem.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Sair"}
        </button>
      </div>
    </aside>
  );
}
