import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Dashboard } from "@/components/Dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingBag, BarChart3, Settings } from "lucide-react";
import type { Client } from "@/components/ClientForm";

const Index = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalOrders: 0,
    monthlyRevenue: 0,
    averageOrder: 0
  });

  // Simulate loading data from localStorage or API
  useEffect(() => {
    const savedClients = localStorage.getItem('burger-clients');
    if (savedClients) {
      const parsedClients = JSON.parse(savedClients);
      setClients(parsedClients);
      
      // Calculate stats
      const totalClients = parsedClients.length;
      const totalOrders = totalClients * 12; // Simulate 12 orders per client on average
      const monthlyRevenue = totalOrders * 28.50; // Average order value
      const averageOrder = totalOrders > 0 ? monthlyRevenue / totalOrders : 0;
      
      setStats({
        totalClients,
        totalOrders,
        monthlyRevenue,
        averageOrder
      });
    }
  }, []);

  const menuItems = [
    {
      title: "Gestão de Clientes",
      description: "Cadastrar e gerenciar clientes",
      icon: Users,
      href: "/clientes",
      color: "text-burger-primary"
    },
    {
      title: "Pedidos",
      description: "Gerenciar pedidos e vendas",
      icon: ShoppingBag,
      href: "#",
      color: "text-burger-secondary"
    },
    {
      title: "Relatórios",
      description: "Análises e estatísticas",
      icon: BarChart3,
      href: "#",
      color: "text-burger-accent"
    },
    {
      title: "Configurações",
      description: "Configurar sistema",
      icon: Settings,
      href: "#",
      color: "text-muted-foreground"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 text-primary bg-gradient-to-r from-burger-primary to-burger-secondary bg-clip-text text-transparent">
            Hamburgueria Central
          </h1>
          <p className="text-xl text-muted-foreground">Sistema de Gestão e Análise de Clientes</p>
        </div>

        <Dashboard {...stats} />

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Menu Principal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isLink = item.href !== "#";
              
              const cardContent = (
                <Card className="transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer">
                  <CardHeader className="text-center">
                    <Icon className={`h-12 w-12 mx-auto ${item.color} mb-4`} />
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center">{item.description}</p>
                  </CardContent>
                </Card>
              );

              return isLink ? (
                <Link key={index} to={item.href}>
                  {cardContent}
                </Link>
              ) : (
                <div key={index} onClick={() => alert('Funcionalidade em desenvolvimento!')}>
                  {cardContent}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link to="/clientes">
            <Button variant="burger" size="lg" className="text-lg px-8 py-3">
              Começar Agora
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
