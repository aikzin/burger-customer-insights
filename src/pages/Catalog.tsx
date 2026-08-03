import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Clock3, Plus, Search, Tag, Utensils } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sale_price: number;
  preparation_minutes: number | null;
  active: boolean;
  category_id: string | null;
  categories: { name: string } | null;
};

export default function Catalog() {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [categoryName, setCategoryName] = useState("");
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [minutes, setMinutes] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [search, setSearch] = useState("");

  const categories = useQuery({
    queryKey: ["categories", organizationId],
    enabled: Boolean(organizationId && supabase),
    queryFn: async () => {
      const { data, error } = await supabase!.from("categories").select("id,name")
        .eq("organization_id", organizationId!).order("name");
      if (error) throw error;
      return data satisfies Category[];
    },
  });

  const products = useQuery({
    queryKey: ["products", organizationId],
    enabled: Boolean(organizationId && supabase),
    queryFn: async () => {
      const { data, error } = await supabase!.from("products")
        .select("id,name,sale_price,preparation_minutes,active,category_id,categories(name)")
        .eq("organization_id", organizationId!).order("name");
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase!.from("categories")
        .insert({ organization_id: organizationId, name: categoryName.trim() });
      if (error) throw error;
    },
    onSuccess: async () => {
      setCategoryName("");
      await queryClient.invalidateQueries({ queryKey: ["categories", organizationId] });
      toast({ title: "Categoria criada", description: "Ela já pode ser usada nos produtos." });
    },
    onError: () => toast({ title: "Não foi possível criar", description: "Confira se a categoria já existe.", variant: "destructive" }),
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      const parsedPrice = Number(price.replace(",", "."));
      const parsedMinutes = minutes ? Number(minutes) : null;
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) throw new Error("invalid-price");
      if (parsedMinutes !== null && (!Number.isInteger(parsedMinutes) || parsedMinutes < 0)) throw new Error("invalid-minutes");
      const { error } = await supabase!.from("products").insert({
        organization_id: organizationId,
        category_id: categoryId === "none" ? null : categoryId,
        name: productName.trim(),
        sale_price: parsedPrice,
        preparation_minutes: parsedMinutes,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setProductName(""); setPrice(""); setMinutes(""); setCategoryId("none");
      await queryClient.invalidateQueries({ queryKey: ["products", organizationId] });
      toast({ title: "Produto criado", description: "O item já está disponível no cardápio." });
    },
    onError: error => toast({
      title: "Não foi possível criar",
      description: error instanceof Error && error.message.startsWith("invalid-") ? "Revise preço e tempo de preparo." : "Revise os dados e tente novamente.",
      variant: "destructive",
    }),
  });

  const toggleProduct = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase!.from("products").update({ active }).eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products", organizationId] }),
    onError: () => toast({ title: "Alteração não salva", description: "Tente novamente.", variant: "destructive" }),
  });

  const filteredProducts = (products.data ?? []).filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.categories?.name.toLowerCase().includes(search.toLowerCase())
  );
  const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  return <div className="min-h-screen bg-background p-4 md:p-8 lg:p-10">
    <div className="mx-auto max-w-7xl space-y-7">
      <div><p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">Operação</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Cardápio</h1><p className="mt-1 text-muted-foreground">Organize categorias, preços e disponibilidade dos produtos.</p></div>

      <Tabs defaultValue="products">
        <TabsList className="mb-7 grid h-auto w-full grid-cols-2 rounded-2xl bg-muted p-1 sm:w-fit">
          <TabsTrigger value="products" className="gap-2 rounded-xl"><Utensils className="h-4 w-4"/>Produtos ({products.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 rounded-xl"><Tag className="h-4 w-4"/>Categorias ({categories.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-5">
          <Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Plus className="h-5 w-5 text-primary"/>Novo produto</CardTitle></CardHeader><CardContent>
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_.8fr_auto]" onSubmit={event => { event.preventDefault(); createProduct.mutate(); }}>
              <div className="space-y-2"><Label htmlFor="product-name">Nome</Label><Input id="product-name" className="h-11 rounded-xl" value={productName} onChange={event => setProductName(event.target.value)} maxLength={120} required placeholder="Ex.: Smash bacon"/></div>
              <div className="space-y-2"><Label htmlFor="category">Categoria</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger id="category" className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem categoria</SelectItem>{categories.data?.map(category => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="price">Preço</Label><Input id="price" className="h-11 rounded-xl" inputMode="decimal" value={price} onChange={event => setPrice(event.target.value)} required placeholder="29,90"/></div>
              <div className="space-y-2"><Label htmlFor="minutes">Preparo (min)</Label><Input id="minutes" className="h-11 rounded-xl" type="number" min="0" step="1" value={minutes} onChange={event => setMinutes(event.target.value)} placeholder="15"/></div>
              <Button className="h-11 self-end rounded-xl" disabled={createProduct.isPending}>{createProduct.isPending ? "Salvando…" : "Adicionar"}</Button>
            </form>
          </CardContent></Card>

          <Card className="surface-elevated rounded-2xl"><CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-xl">Produtos</CardTitle><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="h-10 rounded-xl pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar produto ou categoria"/></div></CardHeader><CardContent>
            {products.isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Carregando produtos…</p> : products.isError ? <p className="py-10 text-center text-sm text-destructive">Não foi possível carregar o cardápio.</p> : filteredProducts.length === 0 ? <div className="grid min-h-52 place-items-center text-center"><div><BookOpen className="mx-auto mb-3 h-10 w-10 text-primary/40"/><p className="font-medium">{search ? "Nenhum produto encontrado" : "Seu cardápio está vazio"}</p><p className="mt-1 text-sm text-muted-foreground">{search ? "Tente outro termo." : "Cadastre o primeiro produto acima."}</p></div></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredProducts.map(product => <article key={product.id} className="rounded-2xl border bg-card p-4 transition-colors hover:border-primary/25"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Utensils className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h2 className="truncate font-semibold">{product.name}</h2><p className="mt-0.5 text-xs text-muted-foreground">{product.categories?.name ?? "Sem categoria"}</p></div><Switch aria-label={product.active ? "Desativar produto" : "Ativar produto"} checked={product.active} disabled={toggleProduct.isPending} onCheckedChange={active => toggleProduct.mutate({ id: product.id, active })}/></div><div className="mt-4 flex items-end justify-between gap-3"><p className="text-lg font-bold text-primary">{money.format(product.sale_price)}</p><div className="flex items-center gap-2">{product.preparation_minutes !== null && <Badge variant="secondary" className="gap-1"><Clock3 className="h-3 w-3"/>{product.preparation_minutes} min</Badge>}<Badge variant={product.active ? "default" : "outline"}>{product.active ? "Ativo" : "Pausado"}</Badge></div></div></div></div></article>)}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-5">
          <Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle className="text-xl">Nova categoria</CardTitle></CardHeader><CardContent><form className="flex flex-col gap-3 sm:flex-row" onSubmit={event => { event.preventDefault(); createCategory.mutate(); }}><Input className="h-11 rounded-xl" value={categoryName} onChange={event => setCategoryName(event.target.value)} minLength={2} maxLength={80} required placeholder="Ex.: Hambúrgueres"/><Button className="h-11 rounded-xl sm:w-auto" disabled={createCategory.isPending}>{createCategory.isPending ? "Salvando…" : "Criar categoria"}</Button></form></CardContent></Card>
          <Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle className="text-xl">Categorias</CardTitle></CardHeader><CardContent>{categories.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p> : categories.data?.length ? <div className="flex flex-wrap gap-2">{categories.data.map(category => <Badge key={category.id} variant="secondary" className="rounded-full px-4 py-2 text-sm">{category.name}</Badge>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  </div>;
}
