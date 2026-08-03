import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, BookOpen, Boxes, ChefHat, ClipboardList, CreditCard, Megaphone, Menu, MessageSquareText, PackageOpen, Settings, ShoppingCart, Users } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  ["Visão Geral", "/", BarChart3], ["Pedidos", "/pedidos", ClipboardList], ["Cozinha", "/cozinha", ChefHat],
  ["Clientes", "/clientes", Users], ["Cardápio", "/cardapio", BookOpen], ["Estoque", "/estoque", Boxes],
  ["Compras e fornecedores", "/compras", ShoppingCart], ["Financeiro", "/financeiro", CreditCard],
  ["Marketing", "/marketing", Megaphone], ["Avaliações", "/avaliacoes", MessageSquareText],
  ["Relatórios", "/relatorios", PackageOpen], ["Configurações", "/configuracoes", Settings],
] as const;

function Navigation() {
  return <nav className="space-y-1" aria-label="Navegação principal">{items.map(([label, href, Icon]) => (
    <NavLink key={href} to={href} className={({isActive}) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      <Icon className="h-4 w-4 shrink-0"/><span>{label}</span>
    </NavLink>
  ))}</nav>;
}

export function AppShell() {
  const { configured, signOut } = useAuth();
  return <div className="min-h-screen bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-card p-4 lg:block">
      <div className="mb-6 flex items-center gap-2 px-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><PackageOpen className="h-5 w-5"/></div><div><p className="font-bold">Burger Insights</p><p className="text-xs text-muted-foreground">Gestão orientada a dados</p></div></div>
      <Navigation />{configured && <Button variant="ghost" className="mt-4 w-full justify-start" onClick={signOut}>Sair</Button>}
    </aside>
    <header className="sticky top-0 z-20 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur lg:hidden">
      <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Abrir menu"><Menu className="h-5 w-5"/></Button></SheetTrigger><SheetContent side="left" className="w-72"><div className="mb-6 font-bold">Burger Insights</div><Navigation /></SheetContent></Sheet>
      <span className="ml-3 font-semibold">Burger Insights</span>
    </header>
    <main className="min-w-0 lg:pl-60"><Outlet /></main>
  </div>;
}
