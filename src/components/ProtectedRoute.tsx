import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute() {
  const { configured, loading, session } = useAuth();
  if (!configured) return <Outlet />;
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Validando sessão…</div>;
  return session ? <Outlet /> : <Navigate to="/entrar" replace />;
}
