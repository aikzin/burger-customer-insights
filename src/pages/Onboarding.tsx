import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Check, PackageOpen, ShieldCheck } from "lucide-react";

export default function Onboarding() {
  const { session } = useAuth();
  const { organizationId, loading: checking } = useOrganization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  if (!checking && organizationId) return <Navigate to="/" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) { setError("A conexão com o sistema não está configurada."); return; }
    if (!session) { setError("Sua sessão expirou. Entre novamente para continuar."); return; }

    const normalizedName = name.trim();
    setLoading(true);
    setError("");

    try {
      const { data, error: organizationError } = await supabase.rpc("create_organization", {
        p_name: normalizedName,
      });
      if (organizationError) throw organizationError;

      const organization = data as { id?: string; name?: string } | null;
      if (!organization?.id) throw new Error("A operação não retornou a empresa criada.");

      queryClient.setQueryData(["organization", session.user.id], {
        organization_id: organization.id,
        organizations: { name: organization.name ?? normalizedName },
      });
      navigate("/", { replace: true });
    } catch (submissionError) {
      console.error("[onboarding] não foi possível concluir a configuração", submissionError);
      setError("Não foi possível concluir a configuração. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-background p-4">
    <div className="w-full max-w-lg"><div className="mb-7 flex justify-center"><span className="gradient-burger grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg shadow-primary/20"><PackageOpen className="h-6 w-6"/></span></div><Card className="surface-elevated rounded-[2rem] border-0"><CardHeader className="space-y-3 p-7 pb-4 text-center sm:p-9 sm:pb-5"><div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary"><Building2 className="h-5 w-5"/></div><CardTitle className="text-2xl">Configure sua hamburgueria</CardTitle><p className="text-sm leading-relaxed text-muted-foreground">Este nome identifica sua operação e mantém os dados da empresa separados com segurança.</p></CardHeader>
      <CardContent className="px-7 pb-8 sm:px-9"><form onSubmit={submit} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="organization">Nome da empresa</Label>
          <Input id="organization" className="h-12 rounded-xl" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={120} autoFocus required placeholder="Ex.: Hamburgueria Central" />
        </div>
        {error && <p role="alert" aria-live="assertive" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-12 w-full rounded-xl shadow-lg shadow-primary/20" disabled={loading || checking}>{loading ? "Criando ambiente…" : "Criar minha operação"}</Button>
        <div className="grid gap-2 border-t pt-5 text-xs text-muted-foreground sm:grid-cols-2"><span className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600"/>Você será administrador</span><span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600"/>Dados isolados por RLS</span></div>
      </form></CardContent>
    </Card>
    </div>
  </main>;
}
