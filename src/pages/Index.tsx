import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ChefHat, ClipboardPlus, ReceiptText, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Index() {
  const { organizationId, organizationName } = useOrganization();
  const summary = useQuery({
    queryKey: ["dashboard-summary", organizationId],
    enabled: Boolean(organizationId && supabase),
    queryFn: async () => {
      const [customers, orders] = await Promise.all([
        supabase!.from("customers").select("*", { count: "exact", head: true }).eq("organization_id", organizationId!),
        supabase!.from("orders").select("total,payment_status").eq("organization_id", organizationId!),
      ]);
      if (customers.error) throw customers.error;
      if (orders.error) throw orders.error;
      const paid = orders.data.filter(order => order.payment_status === "paid");
      const revenue = paid.reduce((sum, order) => sum + Number(order.total), 0);
      return { customers: customers.count ?? 0, orders: orders.data.length, revenue, ticket: paid.length ? revenue / paid.length : 0 };
    },
  });
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const cards = [
    ["Faturamento", money.format(summary.data?.revenue ?? 0), ReceiptText],
    ["Pedidos", String(summary.data?.orders ?? 0), ShoppingBag],
    ["Ticket médio", money.format(summary.data?.ticket ?? 0), TrendingUp],
    ["Clientes", String(summary.data?.customers ?? 0), Users],
  ] as const;
  return <div className="mx-auto max-w-[1500px] space-y-7 p-4 md:p-8 lg:p-10">
    <section className="gradient-burger relative overflow-hidden rounded-[2rem] px-6 py-8 text-white shadow-xl shadow-primary/15 md:px-10 md:py-10">
      <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10"/><div className="absolute -bottom-20 right-32 h-44 w-44 rounded-full bg-black/10"/>
      <div className="relative max-w-2xl"><p className="mb-2 text-sm font-semibold uppercase tracking-[.18em] text-white/70">Visão geral</p><h1 className="text-3xl font-bold tracking-tight md:text-4xl">Olá, {organizationName}</h1><p className="mt-3 max-w-xl text-white/80">Acompanhe a operação com números reais e transforme cada pedido em uma decisão melhor.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Button asChild className="bg-white text-foreground hover:bg-white/90"><Link to="/pedidos"><ClipboardPlus className="mr-2 h-4 w-4"/>Novo pedido</Link></Button><Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white"><Link to="/clientes">Ver clientes<ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div>
      </div>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([title,value,Icon]) => <Card key={title} className="surface-elevated rounded-2xl"><CardContent className="p-5"><div className="mb-5 flex items-center justify-between"><span className="text-sm font-medium text-muted-foreground">{title}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4"/></span></div><div className="text-2xl font-bold">{summary.isLoading ? "…" : value}</div><p className="mt-1 text-xs text-muted-foreground">Dados registrados no sistema</p></CardContent></Card>)}</div>
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle>Movimento da operação</CardTitle></CardHeader><CardContent className="grid min-h-56 place-items-center"><div className="text-center"><ChefHat className="mx-auto mb-3 h-10 w-10 text-primary/50"/><p className="font-medium">Pronto para receber pedidos</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">O gráfico será preenchido conforme pedidos pagos forem registrados.</p></div></CardContent></Card><Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle>Próximas ações</CardTitle></CardHeader><CardContent className="space-y-3"><Link to="/clientes" className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Users className="h-4 w-4"/></span><div className="flex-1"><p className="text-sm font-medium">Cadastrar cliente</p><p className="text-xs text-muted-foreground">Construa sua base de relacionamento</p></div><ArrowRight className="h-4 w-4 text-muted-foreground"/></Link><Link to="/cardapio" className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted"><span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600"><ShoppingBag className="h-4 w-4"/></span><div className="flex-1"><p className="text-sm font-medium">Montar cardápio</p><p className="text-xs text-muted-foreground">Prepare produtos e categorias</p></div><ArrowRight className="h-4 w-4 text-muted-foreground"/></Link></CardContent></Card></div>
  </div>;
}
