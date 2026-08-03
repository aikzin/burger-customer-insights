import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
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
const Catalog = lazy(() => import("./pages/Catalog"));
const Orders = lazy(() => import("./pages/Orders"));
const Kitchen = lazy(() => import("./pages/Kitchen"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Finance = lazy(() => import("./pages/Finance"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));

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
            <Route path="/cardapio" element={<Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">Carregando cardápio…</div>}><Catalog /></Suspense>} />
            <Route path="/pedidos" element={<Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">Carregando pedidos…</div>}><Orders /></Suspense>} />
            <Route path="/cozinha" element={<Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">Carregando cozinha…</div>}><Kitchen /></Suspense>} />
            <Route path="/estoque" element={<Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">Carregando estoque…</div>}><Inventory /></Suspense>} />
            <Route path="/financeiro" element={<Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">Carregando financeiro…</div>}><Finance /></Suspense>} />
            <Route path="/relatorios" element={<Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">Carregando relatórios…</div>}><Reports /></Suspense>} />
            <Route path="/configuracoes" element={<Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">Carregando configurações…</div>}><Settings /></Suspense>} />
            {['compras','marketing','avaliacoes'].map(path => <Route key={path} path={`/${path}`} element={<ModulePlaceholder />} />)}
          </Route></Route></Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter></OrganizationProvider></AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
