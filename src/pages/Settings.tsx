import { useEffect,useState } from "react";
import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";
import { Building2,Save,UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card,CardContent,CardHeader,CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Settings(){
 const {organizationId,organizationName}=useOrganization();const {session}=useAuth();const queryClient=useQueryClient();const {toast}=useToast();
 const [company,setCompany]=useState(organizationName??"");const [fullName,setFullName]=useState("");
 const profile=useQuery({queryKey:["profile",session?.user.id],enabled:Boolean(session&&supabase),queryFn:async()=>{const {data,error}=await supabase!.from("profiles").select("full_name").eq("id",session!.user.id).single();if(error)throw error;return data;}});
 useEffect(()=>{if(profile.data)setFullName(profile.data.full_name)},[profile.data]);useEffect(()=>{setCompany(organizationName??"")},[organizationName]);
 const save=useMutation({mutationFn:async()=>{const [org,person]=await Promise.all([supabase!.from("organizations").update({name:company.trim()}).eq("id",organizationId!),supabase!.from("profiles").update({full_name:fullName.trim()}).eq("id",session!.user.id)]);if(org.error)throw org.error;if(person.error)throw person.error;},onSuccess:async()=>{await Promise.all([queryClient.invalidateQueries({queryKey:["organization"]}),queryClient.invalidateQueries({queryKey:["profile"]})]);toast({title:"Configurações salvas"});},onError:()=>toast({title:"Não foi possível salvar",variant:"destructive"})});
 return <div className="min-h-screen bg-background p-4 md:p-8 lg:p-10"><div className="mx-auto max-w-3xl space-y-7"><div><p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">Administração</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Configurações</h1><p className="mt-1 text-muted-foreground">Dados básicos da operação e do administrador.</p></div><Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Building2 className="h-5 w-5 text-primary"/>Empresa</CardTitle></CardHeader><CardContent className="space-y-2"><Label htmlFor="company">Nome da hamburgueria</Label><Input id="company" className="h-11 rounded-xl" minLength={2} maxLength={120} value={company} onChange={e=>setCompany(e.target.value)}/></CardContent></Card><Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><UserRound className="h-5 w-5 text-primary"/>Perfil</CardTitle></CardHeader><CardContent className="space-y-2"><Label htmlFor="full-name">Nome completo</Label><Input id="full-name" className="h-11 rounded-xl" value={fullName} onChange={e=>setFullName(e.target.value)}/><p className="text-xs text-muted-foreground">{session?.user.email}</p></CardContent></Card><Button className="h-11 rounded-xl" disabled={save.isPending||company.trim().length<2||!fullName.trim()} onClick={()=>save.mutate()}><Save className="mr-2 h-4 w-4"/>{save.isPending?"Salvando…":"Salvar alterações"}</Button></div></div>;
}
