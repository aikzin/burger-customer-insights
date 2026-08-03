import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { session, configured } = useAuth();
  const [email,setEmail] = useState(""); const [password,setPassword] = useState("");
  const [error,setError] = useState(""); const [loading,setLoading] = useState(false);
  if (session) return <Navigate to="/" replace />;
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setLoading(true); setError(""); const result = await supabase?.auth.signInWithPassword({email,password}); if (result?.error) setError("Não foi possível entrar. Verifique seus dados."); setLoading(false); };
  return <main className="grid min-h-screen place-items-center bg-muted/30 p-4"><Card className="w-full max-w-sm"><CardHeader><CardTitle>Entrar no Burger Insights</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>{!configured && <p className="text-sm text-amber-600">Configure o Supabase antes de entrar.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={!configured || loading}>{loading ? "Entrando…" : "Entrar"}</Button></form></CardContent></Card></main>;
}
