import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Clients from "./pages/Clients";
import NotFound from "./pages/NotFound";
import ModulePlaceholder from "./pages/ModulePlaceholder";
import { AppShell } from "./components/AppShell";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { OrganizationGate } from "./components/OrganizationGate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider><OrganizationProvider><BrowserRouter>
        <Routes>
          <Route path="/entrar" element={<Login />} />
          <Route element={<ProtectedRoute />}><Route path="/configurar-empresa" element={<Onboarding />} /></Route>
          <Route element={<ProtectedRoute />}><Route element={<OrganizationGate />}><Route element={<AppShell />}>
            <Route path="/" element={<Index />} />
            <Route path="/clientes" element={<Clients />} />
            {['pedidos','cozinha','cardapio','estoque','compras','financeiro','marketing','avaliacoes','relatorios','configuracoes'].map(path => <Route key={path} path={`/${path}`} element={<ModulePlaceholder />} />)}
          </Route></Route></Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter></OrganizationProvider></AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
