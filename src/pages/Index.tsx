import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Database, ReceiptText, Users } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

const cards = [["Faturamento", "—", ReceiptText], ["Pedidos", "—", Database], ["Ticket médio", "—", AlertTriangle], ["Clientes atendidos", "—", Users]] as const;

export default function Index() {
  return <div className="space-y-6 p-4 md:p-8">
    <div><p className="text-sm font-medium text-primary">Visão Geral</p><h1 className="text-3xl font-bold tracking-tight">Decisões do negócio</h1><p className="text-muted-foreground">Indicadores calculados exclusivamente a partir de vendas registradas.</p></div>
    {!isSupabaseConfigured && <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600"/><div><strong>Banco ainda não conectado.</strong><p className="text-muted-foreground">Configure as variáveis do Supabase e aplique a migration da Fase 1. Até lá, os indicadores permanecem vazios para não simular resultados.</p></div></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([title,value,Icon]) => <Card key={title}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle><Icon className="h-4 w-4 text-primary"/></CardHeader><CardContent><div className="text-2xl font-bold">{value}</div><p className="mt-1 text-xs text-muted-foreground">Sem dados registrados</p></CardContent></Card>)}</div>
    <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Vendas no período</CardTitle></CardHeader><CardContent className="grid min-h-48 place-items-center text-sm text-muted-foreground">Registre pedidos pagos para acompanhar a evolução.</CardContent></Card><Card><CardHeader><CardTitle>Alertas para decisão</CardTitle></CardHeader><CardContent className="grid min-h-48 place-items-center text-sm text-muted-foreground">Os alertas aparecerão quando houver evidência suficiente.</CardContent></Card></div>
  </div>;
}
