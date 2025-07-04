import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ShoppingBag, TrendingUp, DollarSign } from "lucide-react";

interface DashboardProps {
  totalClients: number;
  totalOrders: number;
  monthlyRevenue: number;
  averageOrder: number;
}

export const Dashboard = ({ 
  totalClients = 0, 
  totalOrders = 0, 
  monthlyRevenue = 0, 
  averageOrder = 0 
}: DashboardProps) => {
  const stats = [
    {
      title: "Total de Clientes",
      value: totalClients,
      icon: Users,
      change: "+12%",
      color: "text-burger-primary"
    },
    {
      title: "Pedidos do Mês",
      value: totalOrders,
      icon: ShoppingBag,
      change: "+8%",
      color: "text-burger-secondary"
    },
    {
      title: "Receita Mensal",
      value: `R$ ${monthlyRevenue.toFixed(2)}`,
      icon: DollarSign,
      change: "+15%",
      color: "text-green-600"
    },
    {
      title: "Ticket Médio",
      value: `R$ ${averageOrder.toFixed(2)}`,
      icon: TrendingUp,
      change: "+5%",
      color: "text-burger-accent"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Dashboard - Hamburgueria Central</h1>
        <Button variant="burger" size="lg">
          Novo Pedido
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="transition-all duration-300 hover:shadow-lg hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <Badge variant="secondary" className="mt-2">
                  {stat.change} vs mês anterior
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">João Silva</p>
                  <p className="text-sm text-muted-foreground">X-Bacon + Batata</p>
                </div>
                <Badge>R$ 25,90</Badge>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">Maria Santos</p>
                  <p className="text-sm text-muted-foreground">X-Tudo + Refrigerante</p>
                </div>
                <Badge>R$ 32,50</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Carlos Oliveira</p>
                  <p className="text-sm text-muted-foreground">X-Salada + Suco</p>
                </div>
                <Badge>R$ 22,00</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>X-Bacon</span>
                <Badge variant="secondary">156 vendas</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>X-Tudo</span>
                <Badge variant="secondary">134 vendas</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>X-Salada</span>
                <Badge variant="secondary">98 vendas</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Batata Frita</span>
                <Badge variant="secondary">87 vendas</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};