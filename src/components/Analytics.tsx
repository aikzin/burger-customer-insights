import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, Calendar, Target } from "lucide-react";
import type { Client } from "./ClientForm";

interface AnalyticsProps {
  clients: Client[];
}

export const Analytics = ({ clients }: AnalyticsProps) => {
  // Calculate analytics from client data
  const totalClients = clients.length;
  
  const frequencyStats = clients.reduce(
    (acc, client) => {
      acc[client.frequency]++;
      return acc;
    },
    { alta: 0, media: 0, baixa: 0 }
  );

  const clientsThisMonth = clients.filter(client => {
    const clientDate = new Date(client.createdAt);
    const now = new Date();
    return clientDate.getMonth() === now.getMonth() && 
           clientDate.getFullYear() === now.getFullYear();
  }).length;

  const averageSpent = clients.length > 0 
    ? clients.reduce((sum, client) => sum + client.averageSpent, 0) / clients.length
    : 0;

  const ageGroups = clients.filter(client => client.birthDate).reduce(
    (acc, client) => {
      const age = new Date().getFullYear() - new Date(client.birthDate).getFullYear();
      if (age < 25) acc['18-24']++;
      else if (age < 35) acc['25-34']++;
      else if (age < 45) acc['35-44']++;
      else if (age < 55) acc['45-54']++;
      else acc['55+']++;
      return acc;
    },
    { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 }
  );

  const getFrequencyPercentage = (count: number) => 
    totalClients > 0 ? Math.round((count / totalClients) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-primary mb-2">Analytics da Hamburgueria Central</h2>
        <p className="text-muted-foreground">Insights e estatísticas dos seus clientes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-burger-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">Base de clientes ativa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Este Mês</CardTitle>
            <Calendar className="h-4 w-4 text-burger-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientsThisMonth}</div>
            <p className="text-xs text-muted-foreground">Crescimento mensal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Médio</CardTitle>
            <Target className="h-4 w-4 text-burger-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {averageSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Por cliente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Fiéis</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{frequencyStats.alta}</div>
            <p className="text-xs text-muted-foreground">Alta frequência</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Frequência de Compras</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Alta Frequência</span>
                <Badge className="bg-green-100 text-green-800">
                  {frequencyStats.alta} ({getFrequencyPercentage(frequencyStats.alta)}%)
                </Badge>
              </div>
              <Progress value={getFrequencyPercentage(frequencyStats.alta)} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Média Frequência</span>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {frequencyStats.media} ({getFrequencyPercentage(frequencyStats.media)}%)
                </Badge>
              </div>
              <Progress value={getFrequencyPercentage(frequencyStats.media)} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Baixa Frequência</span>
                <Badge className="bg-red-100 text-red-800">
                  {frequencyStats.baixa} ({getFrequencyPercentage(frequencyStats.baixa)}%)
                </Badge>
              </div>
              <Progress value={getFrequencyPercentage(frequencyStats.baixa)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faixa Etária dos Clientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(ageGroups).map(([age, count]) => (
              <div key={age} className="flex items-center justify-between">
                <span className="text-sm font-medium">{age} anos</span>
                <Badge variant="secondary">{count} clientes</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Principais Preferências dos Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients
              .filter(client => client.preferences.trim().length > 0)
              .slice(0, 6)
              .map((client, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <p className="font-medium text-sm">{client.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{client.preferences}</p>
                </div>
              ))}
            {clients.filter(client => client.preferences.trim().length > 0).length === 0 && (
              <p className="text-muted-foreground text-center col-span-2">
                Nenhuma preferência registrada ainda.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};