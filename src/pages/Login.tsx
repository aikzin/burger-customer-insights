import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, LockKeyhole, PackageOpen, ShieldCheck, Sparkles } from "lucide-react";

export default function Login() {
  const { session, configured } = useAuth();
  const [email,setEmail] = useState(""); const [password,setPassword] = useState("");
  const [fullName,setFullName] = useState(""); const [mode,setMode] = useState<"login"|"signup">("login");
  const [message,setMessage] = useState<{type:"error"|"success";text:string}|null>(null); const [loading,setLoading] = useState(false);
  if (session) return <Navigate to="/" replace />;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage(null);
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
    if (result?.error) setMessage({type:"error",text:mode === "login" ? "Não foi possível entrar. Verifique seus dados." : result.error.message});
    if (mode === "signup" && result?.data.user && !result.data.session) {
      setMode("login");
      setMessage({type:"success",text:"Conta criada. Confirme o e-mail e depois entre aqui com a mesma senha."});
    }
    setLoading(false);
  };
  return <main className="grid min-h-screen bg-sidebar lg:grid-cols-[1.15fr_.85fr]">
    <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,hsl(var(--primary)/.4),transparent_32rem)]"/><div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full border border-white/10"/>
      <div className="relative flex items-center gap-3"><span className="gradient-burger grid h-11 w-11 place-items-center rounded-2xl shadow-xl shadow-primary/25"><PackageOpen className="h-5 w-5"/></span><div><p className="font-bold">Burger Insights</p><p className="text-xs text-white/50">Gestão inteligente para hamburguerias</p></div></div>
      <div className="relative max-w-xl"><span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70"><Sparkles className="h-3.5 w-3.5 text-amber-300"/>Dados reais. Decisões melhores.</span><h1 className="text-5xl font-bold leading-[1.08] tracking-tight">Sua operação inteira em um só lugar.</h1><p className="mt-5 max-w-lg text-lg leading-relaxed text-white/60">Do primeiro pedido ao cliente fiel, acompanhe o que importa sem planilhas soltas ou números inventados.</p></div>
      <div className="relative flex gap-7 text-sm text-white/55"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400"/>Dados protegidos</span><span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-amber-300"/>Acesso seguro</span></div>
    </section>
    <section className="grid place-items-center bg-background p-4 sm:p-8"><div className="w-full max-w-md"><div className="mb-8 flex items-center gap-3 lg:hidden"><span className="gradient-burger grid h-10 w-10 place-items-center rounded-2xl text-white"><PackageOpen className="h-5 w-5"/></span><span className="font-bold">Burger Insights</span></div><Card className="surface-elevated rounded-[1.75rem] border-0"><CardHeader className="space-y-2 px-6 pb-3 pt-7 sm:px-8"><CardTitle className="text-2xl">{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</CardTitle><p className="text-sm text-muted-foreground">{mode === "login" ? "Entre para continuar sua operação." : "Comece configurando sua hamburgueria."}</p></CardHeader><CardContent className="px-6 pb-7 sm:px-8"><form onSubmit={submit} className="space-y-4">{mode === "signup" && <div className="space-y-2"><Label htmlFor="name">Seu nome</Label><Input id="name" className="h-11 rounded-xl" value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name" required /></div>}<div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" className="h-11 rounded-xl" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required /></div><div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" className="h-11 rounded-xl" type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required />{mode === "signup" && <p className="text-xs text-muted-foreground">Use pelo menos 8 caracteres.</p>}</div>{!configured && <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700">Configure o Supabase antes de entrar.</p>}{message && <p role={message.type === "error" ? "alert" : "status"} className={`flex gap-2 rounded-xl p-3 text-sm ${message.type === "error" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700"}`}>{message.type === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/>}{message.text}</p>}<Button className="h-11 w-full rounded-xl shadow-lg shadow-primary/20" disabled={!configured || loading}>{loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}</Button><Button type="button" variant="ghost" className="w-full rounded-xl" onClick={()=>{setMode(mode === "login" ? "signup" : "login");setMessage(null);}}>{mode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}</Button></form></CardContent></Card><p className="mt-5 text-center text-xs text-muted-foreground">Ao continuar, seus dados permanecem isolados por empresa.</p></div></section>
  </main>;
}
