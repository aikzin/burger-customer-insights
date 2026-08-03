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
  const [fullName,setFullName] = useState(""); const [mode,setMode] = useState<"login"|"signup">("login");
  const [error,setError] = useState(""); const [loading,setLoading] = useState(false);
  if (session) return <Navigate to="/" replace />;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    const result = mode === "login"
      ? await supabase?.auth.signInWithPassword({email,password})
      : await supabase?.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/entrar`,
          },
        });
    if (result?.error) setError(mode === "login" ? "Não foi possível entrar. Verifique seus dados." : result.error.message);
    if (mode === "signup" && result?.data.user && !result.data.session) {
      setMode("login");
      setError("Conta criada. Confirme o e-mail e depois entre aqui com a mesma senha.");
    }
    setLoading(false);
  };
  return <main className="grid min-h-screen place-items-center bg-muted/30 p-4"><Card className="w-full max-w-sm"><CardHeader><CardTitle>{mode === "login" ? "Entrar no Burger Insights" : "Criar conta"}</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4">{mode === "signup" && <div className="space-y-2"><Label htmlFor="name">Seu nome</Label><Input id="name" value={fullName} onChange={e=>setFullName(e.target.value)} required /></div>}<div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required /></div>{!configured && <p className="text-sm text-amber-600">Configure o Supabase antes de entrar.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={!configured || loading}>{loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}</Button><Button type="button" variant="ghost" className="w-full" onClick={()=>{setMode(mode === "login" ? "signup" : "login");setError("");}}>{mode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}</Button></form></CardContent></Card></main>;
}
