import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Minus, Plus, Search, ShoppingBag, Trash2, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Product = { id: string; name: string; sale_price: number; categories: { name: string } | null };
type CartItem = Product & { quantity: number };

const statusLabel: Record<string, string> = {
  received: "Recebido", confirmed: "Confirmado", preparing: "Em preparo", ready: "Pronto",
  out_for_delivery: "Saiu para entrega", delivered: "Entregue", cancelled: "Cancelado",
};
const channels = [
  ["counter", "Balcão"], ["pickup", "Retirada"], ["delivery", "Delivery"], ["whatsapp", "WhatsApp"],
] as const;

export default function Orders() {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("counter");
  const [customerId, setCustomerId] = useState("none");

  const products = useQuery({
    queryKey: ["order-products", organizationId],
    enabled: Boolean(organizationId && supabase),
    queryFn: async () => {
      const { data, error } = await supabase!.from("products").select("id,name,sale_price,categories(name)")
        .eq("organization_id", organizationId!).eq("active", true).order("name");
      if (error) throw error;
      return data as unknown as Product[];
    },
  });
  const customers = useQuery({
    queryKey: ["order-customers", organizationId],
    enabled: Boolean(organizationId && supabase),
    queryFn: async () => {
      const { data, error } = await supabase!.from("customers").select("id,name,phone")
        .eq("organization_id", organizationId!).order("name");
      if (error) throw error;
      return data;
    },
  });
  const orders = useQuery({
    queryKey: ["orders", organizationId],
    enabled: Boolean(organizationId && supabase),
    queryFn: async () => {
      const { data, error } = await supabase!.from("orders")
        .select("id,created_at,total,channel,operational_status,payment_status,customers(name),order_items(quantity)")
        .eq("organization_id", organizationId!).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const checkout = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase!.rpc("create_order", {
        p_organization_id: organizationId,
        p_customer_id: customerId === "none" ? null : customerId,
        p_channel: channel,
        p_items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async orderId => {
      setCart([]); setCustomerId("none");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders", organizationId] }),
        queryClient.invalidateQueries({ queryKey: ["business-dashboard", organizationId] }),
      ]);
      toast({ title: "Pedido criado", description: `Pedido ${String(orderId).slice(0, 8)} enviado para a operação.` });
    },
    onError: error => {
      console.error("[orders] falha ao criar pedido", error);
      const message = error instanceof Error ? error.message : "";
      toast({
        title: "Pedido não criado",
        description: message.includes("permission_denied") ? "Seu usuário não possui permissão para criar pedidos." : message.includes("invalid_order_items") ? "Um produto foi alterado ou pausado. Atualize a lista e tente novamente." : "Não foi possível concluir. Confira a conexão e tente novamente.",
        variant: "destructive",
      });
    },
  });

  const addProduct = (product: Product) => setCart(current => {
    const existing = current.find(item => item.id === product.id);
    return existing ? current.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }];
  });
  const changeQuantity = (id: string, delta: number) => setCart(current =>
    current.map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter(item => item.quantity > 0)
  );
  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.sale_price) * item.quantity, 0), [cart]);
  const filteredProducts = (products.data ?? []).filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase()) || product.categories?.name.toLowerCase().includes(search.toLowerCase())
  );
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  return <div className="min-h-screen bg-background p-4 md:p-8 lg:p-10"><div className="mx-auto max-w-7xl space-y-7">
    <div><p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">Vendas</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Pedidos</h1><p className="mt-1 text-muted-foreground">Monte pedidos com valores calculados diretamente do cardápio.</p></div>
    <Tabs defaultValue="new"><TabsList className="mb-7 grid h-auto w-full grid-cols-2 rounded-2xl bg-muted p-1 sm:w-fit"><TabsTrigger value="new" className="rounded-xl">Novo pedido</TabsTrigger><TabsTrigger value="history" className="rounded-xl">Histórico ({orders.data?.length ?? 0})</TabsTrigger></TabsList>
      <TabsContent value="new"><div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card className="surface-elevated rounded-2xl"><CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-xl">Produtos disponíveis</CardTitle><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="h-10 rounded-xl pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar produto"/></div></CardHeader><CardContent>{products.isLoading ? <p className="py-16 text-center text-muted-foreground">Carregando cardápio…</p> : filteredProducts.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredProducts.map(product => <button type="button" key={product.id} onClick={() => addProduct(product)} className="rounded-2xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"><span className="text-xs text-muted-foreground">{product.categories?.name ?? "Sem categoria"}</span><h2 className="mt-1 font-semibold">{product.name}</h2><div className="mt-4 flex items-center justify-between"><strong className="text-primary">{money.format(product.sale_price)}</strong><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white"><Plus className="h-4 w-4"/></span></div></button>)}</div> : <p className="py-16 text-center text-muted-foreground">Cadastre produtos ativos no Cardápio.</p>}</CardContent></Card>
        <Card className="surface-elevated h-fit rounded-2xl xl:sticky xl:top-6"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><ShoppingBag className="h-5 w-5 text-primary"/>Resumo do pedido</CardTitle></CardHeader><CardContent className="space-y-5"><div className="space-y-4"><div className="space-y-2"><Label>Canal de venda</Label><div className="grid grid-cols-2 gap-2">{channels.map(([value,label])=><Button key={value} type="button" size="sm" variant={channel===value?"default":"outline"} className="justify-start rounded-xl" onClick={()=>setChannel(value)}>{channel===value&&<Check className="mr-1.5 h-3.5 w-3.5"/>}{label}</Button>)}</div></div><div className="space-y-2"><Label>Cliente</Label><Button type="button" variant={customerId==="none"?"default":"outline"} className="mb-2 w-full justify-start rounded-xl" onClick={()=>setCustomerId("none")}>{customerId==="none"?<Check className="mr-2 h-4 w-4"/>:<UserRound className="mr-2 h-4 w-4"/>}Consumidor não identificado</Button><Select value={customerId} onValueChange={setCustomerId}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecionar cliente cadastrado"/></SelectTrigger><SelectContent><SelectItem value="none">Consumidor não identificado</SelectItem>{customers.data?.map(customer => <SelectItem key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">{customerId==="none"?"Pedido sem vínculo com cadastro de cliente.":"Cliente cadastrado selecionado."}</p></div></div><div className="max-h-72 space-y-2 overflow-y-auto">{cart.length ? cart.map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-muted/60 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{money.format(Number(item.sale_price) * item.quantity)}</p></div><div className="flex items-center gap-1"><Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => changeQuantity(item.id,-1)}><Minus className="h-3.5 w-3.5"/></Button><span className="w-5 text-center text-sm">{item.quantity}</span><Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => changeQuantity(item.id,1)}><Plus className="h-3.5 w-3.5"/></Button><Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setCart(current => current.filter(product => product.id !== item.id))}><Trash2 className="h-3.5 w-3.5"/></Button></div></div>) : <p className="py-10 text-center text-sm text-muted-foreground">Selecione produtos para começar.</p>}</div><div className="flex items-center justify-between border-t pt-4"><span className="font-medium">Total</span><strong className="text-2xl text-primary">{money.format(total)}</strong></div><Button className="h-12 w-full rounded-xl" disabled={!cart.length || checkout.isPending} onClick={() => checkout.mutate()}>{checkout.isPending ? "Criando pedido…" : "Confirmar pedido"}</Button></CardContent></Card>
      </div></TabsContent>
      <TabsContent value="history"><Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle className="text-xl">Últimos pedidos</CardTitle></CardHeader><CardContent>{orders.isLoading ? <p className="py-12 text-center text-muted-foreground">Carregando…</p> : orders.data?.length ? <div className="space-y-3">{orders.data.map(order => <article key={order.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><strong>#{order.id.slice(0,8)}</strong><Badge variant="secondary">{statusLabel[order.operational_status]}</Badge><Badge variant={order.payment_status === "paid" ? "default" : "outline"}>{order.payment_status === "paid" ? "Pago" : "Pendente"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR")} · {(order.customers as unknown as {name:string}|null)?.name ?? "Consumidor"} · {order.order_items.reduce((sum,item) => sum + item.quantity,0)} item(ns)</p></div><strong className="text-lg text-primary">{money.format(order.total)}</strong></article>)}</div> : <p className="py-12 text-center text-muted-foreground">Nenhum pedido registrado.</p>}</CardContent></Card></TabsContent>
    </Tabs>
  </div></div>;
}
