import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Onboarding() {
  const { session } = useAuth();
  const { organizationId, loading: checking } = useOrganization();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (!checking && organizationId) return <Navigate to="/" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !session) return;
    setLoading(true); setError("");
    const organizationId = crypto.randomUUID();
    const { error: organizationError } = await supabase
      .from("organizations").insert({ id: organizationId, name: name.trim(), created_by: session.user.id });
    if (organizationError) { setError("Não foi possível criar a empresa."); setLoading(false); return; }
    const { error: membershipError } = await supabase.from("organization_members")
      .insert({ organization_id: organizationId, user_id: session.user.id, role: "admin" });
    if (membershipError) { setError("A empresa foi criada, mas o acesso não pôde ser concluído."); setLoading(false); return; }
    await queryClient.invalidateQueries({ queryKey: ["organization"] });
    setLoading(false);
  };

  return <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
    <Card className="w-full max-w-md"><CardHeader><CardTitle>Configure sua hamburgueria</CardTitle></CardHeader>
      <CardContent><form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="organization">Nome da empresa</Label>
          <Input id="organization" value={name} onChange={event => setName(event.target.value)} minLength={2} required placeholder="Ex.: Hamburgueria Central" />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" disabled={loading || checking}>{loading ? "Criando…" : "Começar"}</Button>
      </form></CardContent>
    </Card>
  </main>;
}
