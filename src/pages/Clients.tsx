import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientForm, type Client } from "@/components/ClientForm";
import { ClientList } from "@/components/ClientList";
import { Analytics } from "@/components/Analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useOrganization } from "@/contexts/OrganizationContext";

const Clients = () => {
  const { organizationId, organizationName } = useOrganization();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("list");
  const clientsQuery = useQuery({
    queryKey: ["customers", organizationId],
    enabled: Boolean(organizationId && supabase),
    queryFn: async () => {
      const { data, error } = await supabase!.from("customers")
        .select("id,name,email,phone,address,birth_date,preferences,created_at")
        .eq("organization_id", organizationId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(row => ({
        id: row.id, name: row.name, email: row.email ?? "", phone: row.phone,
        address: typeof row.address === "object" && row.address && "formatted" in row.address ? String(row.address.formatted) : "",
        birthDate: row.birth_date ?? "", preferences: row.preferences ?? "",
        frequency: undefined, averageSpent: 0, createdAt: row.created_at,
      })) satisfies Client[];
    },
  });
  const createClient = useMutation({
    mutationFn: async (client: Omit<Client, "id" | "frequency" | "averageSpent" | "createdAt">) => {
      const { error } = await supabase!.from("customers").insert({
        organization_id: organizationId, name: client.name, phone: client.phone,
        email: client.email || null, birth_date: client.birthDate || null,
        address: client.address ? { formatted: client.address } : {},
        preferences: client.preferences || null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers", organizationId] }),
  });
  const clients = clientsQuery.data ?? [];
  const handleClientAdd = async (newClient: Omit<Client, "id" | "frequency" | "averageSpent" | "createdAt">) => {
    await createClient.mutateAsync(newClient);
    setActiveTab("list");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">Relacionamento</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="mt-1 text-muted-foreground">Conheça e organize a base da {organizationName}.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-7 grid h-auto w-full grid-cols-3 rounded-2xl bg-muted p-1 sm:w-fit">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clientes </span>({clients.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Cadastrar
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span><span className="sm:hidden">Dados</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            {clientsQuery.isLoading && <p className="py-6 text-center text-muted-foreground">Carregando clientes…</p>}
            {clientsQuery.isError && <p className="py-6 text-center text-destructive">Não foi possível carregar os clientes.</p>}
            <ClientList clients={clients} />
          </TabsContent>

          <TabsContent value="add">
            <ClientForm onClientAdd={handleClientAdd} />
          </TabsContent>

          <TabsContent value="analytics">
            <Analytics clients={clients} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Clients;
