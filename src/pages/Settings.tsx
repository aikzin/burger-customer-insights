import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChefHat, Save, Target, Truck, UserRound, Utensils } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Settings() {
  const { organizationId, organizationName } = useOrganization();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [company, setCompany] = useState(organizationName ?? "");
  const [fullName, setFullName] = useState("");
  const [foodCostTarget, setFoodCostTarget] = useState("35");
  const [prepTarget, setPrepTarget] = useState("20");
  const [deliveryTarget, setDeliveryTarget] = useState("45");

  const settings = useQuery({
    queryKey: ["settings", organizationId, session?.user.id],
    enabled: Boolean(organizationId && session && supabase),
    queryFn: async () => {
      const [organization, profile] = await Promise.all([
        supabase!.from("organizations").select("name,target_food_cost_percent,target_prep_minutes,target_delivery_minutes").eq("id", organizationId!).single(),
        supabase!.from("profiles").select("full_name").eq("id", session!.user.id).single(),
      ]);
      if (organization.error) throw organization.error;
      if (profile.error) throw profile.error;
      return { organization: organization.data, profile: profile.data };
    },
  });

  useEffect(() => {
    if (!settings.data) return;
    setCompany(settings.data.organization.name);
    setFullName(settings.data.profile.full_name);
    setFoodCostTarget(String(settings.data.organization.target_food_cost_percent).replace(".", ","));
    setPrepTarget(String(settings.data.organization.target_prep_minutes));
    setDeliveryTarget(String(settings.data.organization.target_delivery_minutes));
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      const parsedFoodCost = Number(foodCostTarget.replace(",", "."));
      const parsedPrep = Number(prepTarget);
      const parsedDelivery = Number(deliveryTarget);
      if (!Number.isFinite(parsedFoodCost) || parsedFoodCost < 5 || parsedFoodCost > 95) throw new Error("invalid-targets");
      if (!Number.isInteger(parsedPrep) || parsedPrep < 1 || parsedPrep > 240) throw new Error("invalid-targets");
      if (!Number.isInteger(parsedDelivery) || parsedDelivery < 1 || parsedDelivery > 480) throw new Error("invalid-targets");
      const [organization, person] = await Promise.all([
        supabase!.from("organizations").update({
          name: company.trim(),
          target_food_cost_percent: parsedFoodCost,
          target_prep_minutes: parsedPrep,
          target_delivery_minutes: parsedDelivery,
        }).eq("id", organizationId!),
        supabase!.from("profiles").update({ full_name: fullName.trim() }).eq("id", session!.user.id),
      ]);
      if (organization.error) throw organization.error;
      if (person.error) throw person.error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["organization"] }),
        queryClient.invalidateQueries({ queryKey: ["settings"] }),
        queryClient.invalidateQueries({ queryKey: ["organization-targets", organizationId] }),
        queryClient.invalidateQueries({ queryKey: ["business-dashboard", organizationId] }),
      ]);
      toast({ title: "Configurações salvas", description: "As próximas análises usarão as novas metas." });
    },
    onError: error => toast({
      title: "Não foi possível salvar",
      description: error instanceof Error && error.message === "invalid-targets" ? "Revise os limites das metas." : "Verifique sua permissão e tente novamente.",
      variant: "destructive",
    }),
  });

  return <div className="min-h-screen bg-background p-4 md:p-8 lg:p-10"><div className="mx-auto max-w-4xl space-y-7">
    <div><p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">Administração</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Configurações</h1><p className="mt-1 text-muted-foreground">Dados da operação e metas que orientam os alertas gerenciais.</p></div>

    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Building2 className="h-5 w-5 text-primary"/>Empresa</CardTitle></CardHeader><CardContent className="space-y-2"><Label htmlFor="company">Nome da hamburgueria</Label><Input id="company" className="h-11 rounded-xl" minLength={2} maxLength={120} value={company} onChange={event => setCompany(event.target.value)}/></CardContent></Card>
      <Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><UserRound className="h-5 w-5 text-primary"/>Perfil</CardTitle></CardHeader><CardContent className="space-y-2"><Label htmlFor="full-name">Nome completo</Label><Input id="full-name" className="h-11 rounded-xl" value={fullName} onChange={event => setFullName(event.target.value)}/><p className="text-xs text-muted-foreground">{session?.user.email}</p></CardContent></Card>
    </div>

    <Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Target className="h-5 w-5 text-primary"/>Metas operacionais</CardTitle><p className="text-sm text-muted-foreground">Esses limites definem quando o sistema deve sinalizar atenção.</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
      <div className="space-y-2"><Label htmlFor="food-cost-target" className="flex items-center gap-2"><Utensils className="h-4 w-4 text-primary"/>CMV máximo de ingredientes</Label><div className="relative"><Input id="food-cost-target" inputMode="decimal" className="h-11 rounded-xl pr-10" value={foodCostTarget} onChange={event => setFoodCostTarget(event.target.value)}/><span className="pointer-events-none absolute right-3 top-3 text-sm text-muted-foreground">%</span></div><p className="text-xs text-muted-foreground">Entre 5% e 95% do preço de venda.</p></div>
      <div className="space-y-2"><Label htmlFor="prep-target" className="flex items-center gap-2"><ChefHat className="h-4 w-4 text-primary"/>Tempo máximo de preparo</Label><div className="relative"><Input id="prep-target" type="number" min="1" max="240" className="h-11 rounded-xl pr-12" value={prepTarget} onChange={event => setPrepTarget(event.target.value)}/><span className="pointer-events-none absolute right-3 top-3 text-sm text-muted-foreground">min</span></div><p className="text-xs text-muted-foreground">Usado para destacar pedidos atrasados.</p></div>
      <div className="space-y-2"><Label htmlFor="delivery-target" className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary"/>Tempo máximo de entrega</Label><div className="relative"><Input id="delivery-target" type="number" min="1" max="480" className="h-11 rounded-xl pr-12" value={deliveryTarget} onChange={event => setDeliveryTarget(event.target.value)}/><span className="pointer-events-none absolute right-3 top-3 text-sm text-muted-foreground">min</span></div><p className="text-xs text-muted-foreground">Da saída para entrega até a conclusão.</p></div>
    </CardContent></Card>

    <div className="flex justify-end"><Button className="h-11 rounded-xl" disabled={save.isPending || company.trim().length < 2 || !fullName.trim() || settings.isLoading} onClick={() => save.mutate()}><Save className="mr-2 h-4 w-4"/>{save.isPending ? "Salvando…" : "Salvar alterações"}</Button></div>
  </div></div>;
}
