import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Boxes, Minus, PackagePlus, Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Ingredient = { id:string; name:string; unit:string; stock_quantity:number; minimum_stock:number; average_cost:number };

export default function Inventory() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name,setName]=useState(""); const [unit,setUnit]=useState("un");
  const [stock,setStock]=useState("0"); const [minimum,setMinimum]=useState("0"); const [cost,setCost]=useState("0");
  const [search,setSearch]=useState("");
  const ingredients=useQuery({
    queryKey:["ingredients",organizationId],enabled:Boolean(organizationId&&supabase),
    queryFn:async()=>{const {data,error}=await supabase!.from("ingredients").select("id,name,unit,stock_quantity,minimum_stock,average_cost").eq("organization_id",organizationId!).order("name");if(error)throw error;return data as Ingredient[];}
  });
  const create=useMutation({
    mutationFn:async()=>{const values=[stock,minimum,cost].map(value=>Number(value.replace(",",".")));if(values.some(value=>!Number.isFinite(value)||value<0))throw new Error("invalid");const {error}=await supabase!.from("ingredients").insert({organization_id:organizationId,name:name.trim(),unit:unit.trim(),stock_quantity:values[0],minimum_stock:values[1],average_cost:values[2]});if(error)throw error;},
    onSuccess:async()=>{setName("");setStock("0");setMinimum("0");setCost("0");await queryClient.invalidateQueries({queryKey:["ingredients",organizationId]});toast({title:"Ingrediente cadastrado"});},
    onError:()=>toast({title:"Não foi possível cadastrar",description:"Revise os valores ou verifique se o ingrediente já existe.",variant:"destructive"})
  });
  const adjust=useMutation({
    mutationFn:async({item,delta}:{item:Ingredient;delta:number})=>{const next=Math.max(0,Number(item.stock_quantity)+delta);const {error}=await supabase!.from("ingredients").update({stock_quantity:next}).eq("id",item.id).eq("organization_id",organizationId!);if(error)throw error;},
    onSuccess:()=>queryClient.invalidateQueries({queryKey:["ingredients",organizationId]}),
    onError:()=>toast({title:"Estoque não atualizado",variant:"destructive"})
  });
  const filtered=(ingredients.data??[]).filter(item=>item.name.toLowerCase().includes(search.toLowerCase()));
  const low=(ingredients.data??[]).filter(item=>Number(item.stock_quantity)<=Number(item.minimum_stock)).length;
  const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
  return <div className="min-h-screen bg-background p-4 md:p-8 lg:p-10"><div className="mx-auto max-w-7xl space-y-7">
    <div><p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">Suprimentos</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Estoque</h1><p className="mt-1 text-muted-foreground">Controle ingredientes, custos e níveis mínimos.</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><Card className="surface-elevated rounded-2xl"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Ingredientes</p><strong className="mt-2 block text-2xl">{ingredients.data?.length??0}</strong></CardContent></Card><Card className="surface-elevated rounded-2xl"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Estoque baixo</p><strong className={`mt-2 block text-2xl ${low?"text-destructive":""}`}>{low}</strong></CardContent></Card><Card className="surface-elevated rounded-2xl"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Custo estimado</p><strong className="mt-2 block text-2xl">{money.format((ingredients.data??[]).reduce((sum,item)=>sum+Number(item.stock_quantity)*Number(item.average_cost),0))}</strong></CardContent></Card></div>
    <Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><PackagePlus className="h-5 w-5 text-primary"/>Novo ingrediente</CardTitle></CardHeader><CardContent><form onSubmit={event=>{event.preventDefault();create.mutate();}} className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_.6fr_.7fr_.7fr_.8fr_auto]"><div className="space-y-2"><Label>Nome</Label><Input className="h-11 rounded-xl" value={name} onChange={e=>setName(e.target.value)} required placeholder="Ex.: Bacon"/></div><div className="space-y-2"><Label>Unidade</Label><Input className="h-11 rounded-xl" value={unit} onChange={e=>setUnit(e.target.value)} required placeholder="kg"/></div><div className="space-y-2"><Label>Estoque</Label><Input className="h-11 rounded-xl" inputMode="decimal" value={stock} onChange={e=>setStock(e.target.value)} required/></div><div className="space-y-2"><Label>Mínimo</Label><Input className="h-11 rounded-xl" inputMode="decimal" value={minimum} onChange={e=>setMinimum(e.target.value)} required/></div><div className="space-y-2"><Label>Custo médio</Label><Input className="h-11 rounded-xl" inputMode="decimal" value={cost} onChange={e=>setCost(e.target.value)} required/></div><Button className="h-11 self-end rounded-xl" disabled={create.isPending}>Cadastrar</Button></form></CardContent></Card>
    <Card className="surface-elevated rounded-2xl"><CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="flex items-center gap-2 text-xl"><Boxes className="h-5 w-5 text-primary"/>Ingredientes</CardTitle><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="h-10 rounded-xl pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar ingrediente"/></div></CardHeader><CardContent>{ingredients.isLoading?<p className="py-12 text-center text-muted-foreground">Carregando…</p>:filtered.length?<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map(item=>{const isLow=Number(item.stock_quantity)<=Number(item.minimum_stock);return <article key={item.id} className="rounded-2xl border p-4"><div className="flex items-start justify-between"><div><h2 className="font-semibold">{item.name}</h2><p className="text-xs text-muted-foreground">Mínimo: {item.minimum_stock} {item.unit} · {money.format(item.average_cost)}/{item.unit}</p></div>{isLow&&<Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3"/>Baixo</Badge>}</div><div className="mt-5 flex items-center justify-between"><strong className="text-xl">{item.stock_quantity} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span></strong><div className="flex gap-1"><Button size="icon" variant="outline" className="h-9 w-9 rounded-xl" onClick={()=>adjust.mutate({item,delta:-1})}><Minus className="h-4 w-4"/></Button><Button size="icon" variant="outline" className="h-9 w-9 rounded-xl" onClick={()=>adjust.mutate({item,delta:1})}><Plus className="h-4 w-4"/></Button></div></div></article>})}</div>:<p className="py-12 text-center text-muted-foreground">Nenhum ingrediente cadastrado.</p>}</CardContent></Card>
  </div></div>;
}
