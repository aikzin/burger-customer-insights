import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, ChefHat, CheckCircle2, Clock3, Flame, PackageCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const columns = [
  { status: "received", title: "Recebidos", icon: Clock3, action: "Confirmar" },
  { status: "confirmed", title: "Confirmados", icon: PackageCheck, action: "Iniciar preparo" },
  { status: "preparing", title: "Em preparo", icon: Flame, action: "Marcar pronto" },
  { status: "ready", title: "Prontos", icon: CheckCircle2, action: "Despachar / concluir" },
  { status: "out_for_delivery", title: "Em entrega", icon: Bike, action: "Marcar entregue" },
] as const;

type KitchenOrder = {
  id: string;
  created_at: string;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  dispatched_at: string | null;
  channel: string;
  operational_status: string;
  order_items: Array<{ id: string; quantity: number; notes: string | null; products: { name: string } }>;
};

export default function Kitchen() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const orders = useQuery({
    queryKey: ["kitchen-orders", organizationId],
    enabled: Boolean(organizationId && supabase),
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase!.from("orders")
        .select("id,created_at,confirmed_at,preparing_at,ready_at,dispatched_at,channel,operational_status,order_items(id,quantity,notes,products(name))")
        .eq("organization_id", organizationId!)
        .in("operational_status", columns.map(column => column.status))
        .order("created_at");
      if (error) throw error;
      return data as unknown as KitchenOrder[];
    },
  });
  const targets = useQuery({
    queryKey: ["organization-targets", organizationId],
    enabled: Boolean(organizationId && supabase),
    queryFn: async () => {
      const { data, error } = await supabase!.from("organizations")
        .select("target_prep_minutes,target_delivery_minutes")
        .eq("id", organizationId!)
        .single();
      if (error) throw error;
      return { prep: Number(data.target_prep_minutes), delivery: Number(data.target_delivery_minutes) };
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
        queryClient.invalidateQueries({ queryKey: ["business-dashboard", organizationId] }),
      ]);
    },
    onError: () => toast({ title: "Status não atualizado", description: "Tente novamente.", variant: "destructive" }),
  });

  const elapsed = (date: string) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60_000));
  const stageStartedAt = (order: KitchenOrder) => {
    if (order.operational_status === "confirmed") return order.confirmed_at ?? order.created_at;
    if (order.operational_status === "preparing") return order.preparing_at ?? order.created_at;
    if (order.operational_status === "ready") return order.ready_at ?? order.created_at;
    if (order.operational_status === "out_for_delivery") return order.dispatched_at ?? order.created_at;
    return order.created_at;
  };
  const nextStatus = (order: KitchenOrder) => {
    if (order.operational_status === "received") return "confirmed";
    if (order.operational_status === "confirmed") return "preparing";
    if (order.operational_status === "preparing") return "ready";
    if (order.operational_status === "ready") return order.channel === "delivery" ? "out_for_delivery" : "delivered";
    return "delivered";
  };

  return <div className="min-h-screen bg-background p-4 md:p-8 lg:p-10"><div className="mx-auto max-w-[1800px] space-y-7">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">Produção</p><h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight"><ChefHat className="h-8 w-8 text-primary"/>Cozinha</h1><p className="mt-1 text-muted-foreground">Cada mudança registra o tempo da etapa e alimenta os indicadores de eficiência.</p></div><div className="flex gap-2 text-xs"><Badge variant="secondary">Meta preparo: {targets.data?.prep ?? 20} min</Badge><Badge variant="secondary">Meta entrega: {targets.data?.delivery ?? 45} min</Badge></div></div>
    {orders.isError ? <p className="rounded-2xl bg-destructive/10 p-4 text-destructive">Não foi possível carregar a fila.</p> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">{columns.map(column => {
      const cards = (orders.data ?? []).filter(order => order.operational_status === column.status);
      const Icon = column.icon;
      return <section key={column.status} className="space-y-3"><div className="flex items-center justify-between px-1"><h2 className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary"/>{column.title}</h2><Badge variant="secondary">{cards.length}</Badge></div>{orders.isLoading ? <Card className="rounded-2xl"><CardContent className="p-6 text-center text-sm text-muted-foreground">Carregando…</CardContent></Card> : cards.length ? cards.map(order => {
        const minutes = elapsed(stageStartedAt(order));
        const limit = order.operational_status === "out_for_delivery" ? (targets.data?.delivery ?? 45) : (targets.data?.prep ?? 20);
        return <Card key={order.id} className="surface-elevated rounded-2xl"><CardContent className="p-5"><div className="flex items-start justify-between"><div><strong>#{order.id.slice(0, 8)}</strong><p className="mt-1 text-xs capitalize text-muted-foreground">{order.channel}</p></div><Badge variant={minutes > limit ? "destructive" : "outline"}>{minutes} min nesta etapa</Badge></div><div className="my-4 space-y-2 border-y py-4">{order.order_items.map(item => <div key={item.id} className="text-sm"><span className="font-semibold">{item.quantity}×</span> {item.products.name}{item.notes && <p className="pl-5 text-xs text-muted-foreground">{item.notes}</p>}</div>)}</div><Button className="w-full rounded-xl" disabled={advance.isPending} onClick={() => advance.mutate({ id: order.id, status: nextStatus(order) })}>{column.action}</Button></CardContent></Card>;
      }) : <div className="grid min-h-36 place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">Nenhum pedido</div>}</section>;
    })}</div>}
  </div></div>;
}
