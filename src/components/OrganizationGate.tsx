import { Navigate, Outlet } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";

export function OrganizationGate() {
  const { organizationId, loading } = useOrganization();
  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Carregando empresa…</div>;
  return organizationId ? <Outlet /> : <Navigate to="/configurar-empresa" replace />;
}
