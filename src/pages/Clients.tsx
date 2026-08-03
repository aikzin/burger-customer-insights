import { useState } from "react";
import { ClientForm, type Client } from "@/components/ClientForm";
import { ClientList } from "@/components/ClientList";
import { Analytics } from "@/components/Analytics";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, BarChart3 } from "lucide-react";

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState("list");

  const handleClientAdd = (newClient: Client) => {
    setClients(prev => [...prev, newClient]);
    setActiveTab("list");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 text-primary">Gestão de Clientes</h1>
          <p className="text-xl text-muted-foreground">Hamburgueria Central</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-lg mx-auto mb-8">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes ({clients.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Cadastrar
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
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
