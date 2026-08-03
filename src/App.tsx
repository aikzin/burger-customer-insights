import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { OrganizationGate } from "./components/OrganizationGate";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

const Index = lazy(() => import("./pages/Index"));
const Clients = lazy(() => import("./pages/Clients"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Catalog = lazy(() => import("./pages/Catalog"));
const Orders = lazy(() => import("./pages/Orders"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Finance = lazy(() => import("./pages/Finance"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Reviews = lazy(() => import("./pages/Reviews"));

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
        <Suspense fallback={<div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground" role="status">Carregando página…</div>}><Routes>
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
        </Routes></Suspense>
      </BrowserRouter></OrganizationProvider></AuthProvider></AppErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
