import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { OrganizationGate } from "./components/OrganizationGate";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import Index from "./pages/Index";
import Clients from "./pages/Clients";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Catalog from "./pages/Catalog";
import Orders from "./pages/Orders";
import Kitchen from "./pages/Kitchen";
import Inventory from "./pages/Inventory";
import Finance from "./pages/Finance";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Purchases from "./pages/Purchases";
import Marketing from "./pages/Marketing";
import Reviews from "./pages/Reviews";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppErrorBoundary><AuthProvider><OrganizationProvider><BrowserRouter>
        <Routes>
          <Route path="/entrar" element={<Login />} />
          <Route element={<ProtectedRoute />}><Route path="/configurar-empresa" element={<Onboarding />} /></Route>
          <Route element={<ProtectedRoute />}><Route element={<OrganizationGate />}><Route element={<AppShell />}>
            <Route path="/" element={<Index />} />
            <Route path="/clientes" element={<Clients />} />
            <Route path="/cardapio" element={<Catalog />} />
            <Route path="/pedidos" element={<Orders />} />
            <Route path="/cozinha" element={<Kitchen />} />
            <Route path="/estoque" element={<Inventory />} />
            <Route path="/financeiro" element={<Finance />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/compras" element={<Purchases />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/avaliacoes" element={<Reviews />} />
          </Route></Route></Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter></OrganizationProvider></AuthProvider></AppErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
