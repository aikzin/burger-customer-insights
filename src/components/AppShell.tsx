import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, BookOpen, Boxes, ChefHat, ChevronRight, ClipboardList, CreditCard, LogOut, Megaphone, Menu, MessageSquareText, PackageOpen, Settings, ShoppingCart, Users } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";

const items = [
  ["Visão Geral", "/", BarChart3], ["Pedidos", "/pedidos", ClipboardList], ["Cozinha", "/cozinha", ChefHat],
  ["Clientes", "/clientes", Users], ["Cardápio", "/cardapio", BookOpen], ["Estoque", "/estoque", Boxes],
  ["Compras e fornecedores", "/compras", ShoppingCart], ["Financeiro", "/financeiro", CreditCard],
  ["Marketing", "/marketing", Megaphone], ["Avaliações", "/avaliacoes", MessageSquareText],
  ["Relatórios", "/relatorios", PackageOpen], ["Configurações", "/configuracoes", Settings],
] as const;

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return <nav className="space-y-1" aria-label="Navegação principal">{items.map(([label, href, Icon]) => (
    <NavLink key={href} to={href} onClick={onNavigate} className={({isActive}) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
      <Icon className="h-4 w-4 shrink-0"/><span className="flex-1">{label}</span><ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60"/>
    </NavLink>
  ))}</nav>;
}

export function AppShell() {
  const { configured, signOut } = useAuth();
  const { organizationName } = useOrganization();
  return <div className="min-h-screen bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground lg:flex lg:flex-col">
      <div className="mb-7 flex items-center gap-3 px-2 py-2"><div className="gradient-burger grid h-10 w-10 place-items-center rounded-2xl text-white shadow-lg shadow-primary/25"><PackageOpen className="h-5 w-5"/></div><div className="min-w-0"><p className="truncate font-bold text-white">Burger Insights</p><p className="truncate text-xs text-sidebar-foreground/55">{organizationName}</p></div></div>
      <div className="flex-1 overflow-y-auto"><Navigation /></div>{configured && <Button variant="ghost" className="mt-4 w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white" onClick={signOut}><LogOut className="h-4 w-4"/>Sair</Button>}
    </aside>
    <header className="sticky top-0 z-20 flex h-16 items-center border-b bg-background/90 px-4 backdrop-blur-xl lg:hidden">
      <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Abrir menu"><Menu className="h-5 w-5"/></Button></SheetTrigger><SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar text-sidebar-foreground"><div className="mb-6 flex items-center gap-3 text-white"><div className="gradient-burger grid h-10 w-10 place-items-center rounded-2xl"><PackageOpen className="h-5 w-5"/></div><div><p className="font-bold">Burger Insights</p><p className="text-xs text-sidebar-foreground/60">{organizationName}</p></div></div><Navigation /></SheetContent></Sheet>
      <span className="ml-3 font-semibold">{organizationName}</span>
    </header>
    <main className="min-w-0 lg:pl-64"><Outlet /></main>
  </div>;
}
