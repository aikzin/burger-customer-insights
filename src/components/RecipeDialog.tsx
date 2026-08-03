import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Calculator, PackagePlus, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type RecipeProduct = { id: string; name: string; sale_price: number };
type Ingredient = { id: string; name: string; unit: string; average_cost: number };
type RecipeRow = { ingredient_id: string; quantity: number };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function RecipeDialog({
  product,
  open,
  onOpenChange,
}: {
  product: RecipeProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const ingredients = useQuery({
    queryKey: ["recipe-ingredients", organizationId],
    enabled: Boolean(open && organizationId && supabase),
    queryFn: async () => {
      const { data, error } = await supabase!.from("ingredients")
        .select("id,name,unit,average_cost")
        .eq("organization_id", organizationId!)
        .order("name");
      if (error) throw error;
      return data as Ingredient[];
    },
  });

  const targets = useQuery({
    queryKey: ["organization-targets", organizationId],
    enabled: Boolean(open && organizationId && supabase),
    queryFn: async () => {
      const { data, error } = await supabase!.from("organizations")
        .select("target_food_cost_percent")
        .eq("id", organizationId!)
        .single();
      if (error) throw error;
      return Number(data.target_food_cost_percent);
    },
  });

  const recipe = useQuery({
    queryKey: ["product-recipe", product?.id],
    enabled: Boolean(open && product?.id && supabase),
    queryFn: async () => {
      const { data, error } = await supabase!.from("recipe_items")
        .select("ingredient_id,quantity")
        .eq("product_id", product!.id);
      if (error) throw error;
      return data as RecipeRow[];
    },
  });

  useEffect(() => {
    if (!open) return;
    const next = Object.fromEntries((recipe.data ?? []).map(item => [item.ingredient_id, String(item.quantity).replace(".", ",")]));
    setQuantities(next);
  }, [open, recipe.data, product?.id]);

  const recipeItems = useMemo(() => (ingredients.data ?? []).flatMap(ingredient => {
    const quantity = Number((quantities[ingredient.id] ?? "").replace(",", "."));
    return Number.isFinite(quantity) && quantity > 0 ? [{ ingredient, quantity }] : [];
  }), [ingredients.data, quantities]);
  const recipeCost = recipeItems.reduce((sum, item) => sum + item.quantity * Number(item.ingredient.average_cost), 0);
  const foodCostPercent = product?.sale_price ? 100 * recipeCost / Number(product.sale_price) : 0;
  const targetFoodCost = targets.data ?? 35;

  const save = useMutation({
    mutationFn: async () => {
      if (!product) return;
      const { error } = await supabase!.rpc("save_product_recipe", {
        p_product_id: product.id,
        p_items: recipeItems.map(item => ({ ingredient_id: item.ingredient.id, quantity: item.quantity })),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product-recipe", product?.id] }),
        queryClient.invalidateQueries({ queryKey: ["recipe-summaries", organizationId] }),
        queryClient.invalidateQueries({ queryKey: ["business-dashboard", organizationId] }),
      ]);
      toast({ title: "Ficha técnica salva", description: "Custos e margens serão recalculados com os valores atuais dos ingredientes." });
      onOpenChange(false);
    },
    onError: () => toast({ title: "Ficha técnica não salva", description: "Revise as quantidades e tente novamente.", variant: "destructive" }),
  });

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-3xl">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary"/>Ficha técnica · {product?.name}</DialogTitle><DialogDescription>Informe quanto de cada ingrediente é usado em uma unidade do produto.</DialogDescription></DialogHeader>
      {ingredients.isLoading || recipe.isLoading || targets.isLoading ? <div className="space-y-3 py-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 rounded-xl"/>)}</div> : ingredients.isError || recipe.isError || targets.isError ? <Alert variant="destructive"><AlertTitle>Não foi possível carregar</AlertTitle><AlertDescription>Confira a conexão e tente novamente.</AlertDescription></Alert> : ingredients.data?.length ? <>
        <div className="rounded-2xl border">
          <div className="grid grid-cols-[minmax(0,1fr)_92px_72px] gap-2 border-b bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid-cols-[minmax(0,1fr)_120px_110px] sm:gap-3 sm:px-4 sm:text-xs"><span>Ingrediente</span><span>Quantidade</span><span className="text-right">Custo</span></div>
          <div className="max-h-80 divide-y overflow-y-auto">{ingredients.data.map(ingredient => { const quantity = Number((quantities[ingredient.id] ?? "").replace(",", ".")); const lineCost = Number.isFinite(quantity) ? quantity * Number(ingredient.average_cost) : 0; return <div key={ingredient.id} className="grid grid-cols-[minmax(0,1fr)_92px_72px] items-center gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_120px_110px] sm:gap-3 sm:px-4"><div className="min-w-0"><p className="truncate text-sm font-medium">{ingredient.name}</p><p className="truncate text-xs text-muted-foreground">{money.format(ingredient.average_cost)} / {ingredient.unit}</p></div><div><Label htmlFor={`recipe-${ingredient.id}`} className="sr-only">Quantidade de {ingredient.name}</Label><div className="relative"><Input id={`recipe-${ingredient.id}`} inputMode="decimal" min="0" className="h-9 rounded-lg pr-8" value={quantities[ingredient.id] ?? ""} onChange={event => setQuantities(current => ({ ...current, [ingredient.id]: event.target.value }))} placeholder="0"/><span className="pointer-events-none absolute right-2 top-2 text-xs text-muted-foreground">{ingredient.unit}</span></div></div><span className="text-right text-xs font-medium sm:text-sm">{lineCost > 0 ? money.format(lineCost) : "—"}</span></div>; })}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Custo da receita</p><strong className="mt-1 block text-lg">{money.format(recipeCost)}</strong></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Preço de venda</p><strong className="mt-1 block text-lg">{money.format(product?.sale_price ?? 0)}</strong></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">CMV de ingredientes · meta {targetFoodCost}%</p><div className="mt-1 flex items-center gap-2"><strong className="text-lg">{foodCostPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</strong><Badge variant={foodCostPercent > targetFoodCost ? "destructive" : "default"}>{foodCostPercent > targetFoodCost ? "Revisar" : "Saudável"}</Badge></div></div></div>
        <p className="text-xs leading-relaxed text-muted-foreground">O custo usa o custo médio atual dos ingredientes. Embalagem, taxas, impostos, entrega e mão de obra devem ser considerados na análise financeira completa.</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4"/>{save.isPending ? "Salvando…" : "Salvar ficha técnica"}</Button></div>
      </> : <div className="rounded-2xl border border-dashed p-8 text-center"><PackagePlus className="mx-auto h-9 w-9 text-primary/50"/><h3 className="mt-3 font-semibold">Cadastre ingredientes primeiro</h3><p className="mt-1 text-sm text-muted-foreground">A ficha técnica conecta cada produto ao estoque e aos custos.</p><Button asChild className="mt-4" onClick={() => onOpenChange(false)}><Link to="/estoque">Ir para Estoque<ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div>}
    </DialogContent>
  </Dialog>;
}
