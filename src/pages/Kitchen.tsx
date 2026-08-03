import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChefHat, Clock3, Flame, PackageCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const columns = [
  { status: "received", title: "Recebidos", icon: Clock3, action: "Confirmar", next: "confirmed" },
  { status: "confirmed", title: "Confirmados", icon: PackageCheck, action: "Iniciar preparo", next: "preparing" },
  { status: "preparing", title: "Em preparo", icon: Flame, action: "Marcar pronto", next: "ready" },
] as const;

export default function Kitchen() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const orders = useQuery({
    queryKey: ["kitchen-orders", organizationId],
    enabled: Boolean(organizationId && supabase),
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase!.from("orders")
        .select("id,created_at,channel,operational_status,order_items(id,quantity,notes,products(name))")
        .eq("organization_id", organizationId!).in("operational_status", ["received","confirmed","preparing"])
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const advance = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase!.from("orders").update({ operational_status: status })
        .eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["kitchen-orders", organizationId] }),
        queryClient.invalidateQueries({ queryKey: ["orders", organizationId] }),
      ]);
    },
    onError: () => toast({ title: "Status não atualizado", description: "Tente novamente.", variant: "destructive" }),
  });
  const elapsed = (date: string) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));

  return <div className="min-h-screen bg-background p-4 md:p-8 lg:p-10"><div className="mx-auto max-w-[1500px] space-y-7">
    <div><p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">Produção</p><h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight"><ChefHat className="h-8 w-8 text-primary"/>Cozinha</h1><p className="mt-1 text-muted-foreground">Pedidos atualizados automaticamente a cada 15 segundos.</p></div>
    {orders.isError ? <p className="rounded-2xl bg-destructive/10 p-4 text-destructive">Não foi possível carregar a fila.</p> : <div className="grid gap-5 xl:grid-cols-3">{columns.map(column => {
      const cards = (orders.data ?? []).filter(order => order.operational_status === column.status);
      const Icon = column.icon;
      return <section key={column.status} className="space-y-3"><div className="flex items-center justify-between px-1"><h2 className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary"/>{column.title}</h2><Badge variant="secondary">{cards.length}</Badge></div>{orders.isLoading ? <Card className="rounded-2xl"><CardContent className="p-6 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card> : cards.length ? cards.map(order => <Card key={order.id} className="surface-elevated rounded-2xl"><CardContent className="p-5"><div className="flex items-start justify-between"><div><strong>#{order.id.slice(0,8)}</strong><p className="mt-1 text-xs text-muted-foreground">{order.channel}</p></div><Badge variant={elapsed(order.created_at) > 20 ? "destructive" : "outline"}>{elapsed(order.created_at)} min</Badge></div><div className="my-4 space-y-2 border-y py-4">{order.order_items.map(item => <div key={item.id} className="text-sm"><span className="font-semibold">{item.quantity}×</span> {(item.products as unknown as {name:string}).name}{item.notes && <p className="pl-5 text-xs text-muted-foreground">{item.notes}</p>}</div>)}</div><Button className="w-full rounded-xl" disabled={advance.isPending} onClick={() => advance.mutate({ id: order.id, status: column.next })}>{column.action}</Button></CardContent></Card>) : <div className="grid min-h-36 place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">Nenhum pedido</div>}</section>;
    })}</div>}
  </div></div>;
}
