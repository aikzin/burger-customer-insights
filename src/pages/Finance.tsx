import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, CreditCard, ReceiptText, WalletCards } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Finance() {
  const {organizationId}=useOrganization(); const queryClient=useQueryClient(); const {toast}=useToast();
  const [method,setMethod]=useState("pix");
  const orders=useQuery({
    queryKey:["finance-orders",organizationId],enabled:Boolean(organizationId&&supabase),
    queryFn:async()=>{const {data,error}=await supabase!.from("orders").select("id,created_at,total,payment_status,operational_status,customers(name),payments(amount,status,method)").eq("organization_id",organizationId!).order("created_at",{ascending:false}).limit(100);if(error)throw error;return data;}
  });
  const pay=useMutation({
    mutationFn:async({id,amount}:{id:string;amount:number})=>{const {error}=await supabase!.rpc("record_payment",{p_order_id:id,p_method:method,p_amount:amount});if(error)throw error;},
    onSuccess:async()=>{await Promise.all([queryClient.invalidateQueries({queryKey:["finance-orders",organizationId]}),queryClient.invalidateQueries({queryKey:["orders",organizationId]}),queryClient.invalidateQueries({queryKey:["dashboard-summary",organizationId]})]);toast({title:"Pagamento registrado"});},
    onError:()=>toast({title:"Pagamento não registrado",description:"O valor foi rejeitado pelo servidor.",variant:"destructive"})
  });
  const list=orders.data??[]; const paid=list.filter(order=>order.payment_status==="paid"); const pending=list.filter(order=>order.payment_status!=="paid"&&order.operational_status!=="cancelled");
  const revenue=paid.reduce((sum,order)=>sum+Number(order.total),0); const receivable=pending.reduce((sum,order)=>sum+(Number(order.total)-order.payments.filter(payment=>payment.status==="paid").reduce((value,payment)=>value+Number(payment.amount),0)),0);
  const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
  return <div className="min-h-screen bg-background p-4 md:p-8 lg:p-10"><div className="mx-auto max-w-7xl space-y-7">
    <div><p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">Controle</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Financeiro</h1><p className="mt-1 text-muted-foreground">Registre recebimentos e acompanhe valores pendentes.</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><Card className="surface-elevated rounded-2xl"><CardContent className="p-5"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Banknote className="h-4 w-4"/>Receita recebida</p><strong className="mt-2 block text-2xl text-emerald-700">{money.format(revenue)}</strong></CardContent></Card><Card className="surface-elevated rounded-2xl"><CardContent className="p-5"><p className="flex items-center gap-2 text-sm text-muted-foreground"><ReceiptText className="h-4 w-4"/>A receber</p><strong className="mt-2 block text-2xl text-amber-700">{money.format(receivable)}</strong></CardContent></Card><Card className="surface-elevated rounded-2xl"><CardContent className="p-5"><p className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4"/>Pedidos pagos</p><strong className="mt-2 block text-2xl">{paid.length}</strong></CardContent></Card></div>
    <Card className="surface-elevated rounded-2xl"><CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-xl">Pagamentos pendentes</CardTitle><Select value={method} onValueChange={setMethod}><SelectTrigger className="w-full rounded-xl sm:w-48"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="pix">PIX</SelectItem><SelectItem value="cash">Dinheiro</SelectItem><SelectItem value="credit_card">Cartão de crédito</SelectItem><SelectItem value="debit_card">Cartão de débito</SelectItem><SelectItem value="voucher">Vale</SelectItem></SelectContent></Select></CardHeader><CardContent>{orders.isLoading?<p className="py-12 text-center text-muted-foreground">Carregando…</p>:pending.length?<div className="space-y-3">{pending.map(order=>{const paidAmount=order.payments.filter(payment=>payment.status==="paid").reduce((sum,payment)=>sum+Number(payment.amount),0);const remaining=Number(order.total)-paidAmount;return <article key={order.id} className="flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><WalletCards className="h-5 w-5"/></span><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><strong>#{order.id.slice(0,8)}</strong><Badge variant="outline">{order.payment_status==="partially_paid"?"Parcial":"Pendente"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR")} · {(order.customers as unknown as {name:string}|null)?.name??"Consumidor"}</p></div><div className="sm:text-right"><p className="text-xs text-muted-foreground">Saldo</p><strong className="text-lg text-primary">{money.format(remaining)}</strong></div><Button className="rounded-xl" disabled={pay.isPending} onClick={()=>pay.mutate({id:order.id,amount:remaining})}><CreditCard className="mr-2 h-4 w-4"/>Receber saldo</Button></article>})}</div>:<p className="py-12 text-center text-muted-foreground">Nenhum pagamento pendente.</p>}</CardContent></Card>
  </div></div>;
}
