import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type OrganizationState = {
  organizationId: string | null;
  organizationName: string | null;
  loading: boolean;
};

const OrganizationContext = createContext<OrganizationState | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const membership = useQuery({
    queryKey: ["organization", session?.user.id],
    enabled: Boolean(session && supabase),
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("organization_members")
        .select("organization_id, organizations(name)")
        .eq("user_id", session!.user.id)
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const organization = membership.data?.organizations as unknown as { name: string } | null;
  return (
    <OrganizationContext.Provider value={{
      organizationId: membership.data?.organization_id ?? null,
      organizationName: organization?.name ?? null,
      loading: membership.isLoading,
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const value = useContext(OrganizationContext);
  if (!value) throw new Error("useOrganization deve ser usado dentro de OrganizationProvider");
  return value;
}
