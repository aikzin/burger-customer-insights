import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  Boxes,
  CalendarRange,
  CheckCircle2,
  ChefHat,
  CircleDollarSign,
  Clock3,
  Info,
  Lightbulb,
  PackageSearch,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  getBusinessDashboard,
  type BusinessDashboard,
  type DashboardPeriod,
} from "@/lib/business-dashboard";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compactMoney = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const channelLabels: Record<string, string> = {
  counter: "Balcão",
  delivery: "Delivery",
  pickup: "Retirada",
  whatsapp: "WhatsApp",
};

const paymentLabels: Record<string, string> = {
  cash: "Dinheiro",
  credit_card: "Crédito",
  debit_card: "Débito",
  pix: "Pix",
  voucher: "Vale",
};

type InsightLevel = "urgent" | "important" | "attention" | "opportunity" | "info";
type Insight = {
  level: InsightLevel;
  title: string;
  evidence: string;
  hypothesis: string;
  action: string;
  link: string;
};

const insightStyle: Record<InsightLevel, { label: string; className: string; icon: LucideIcon }> = {
  urgent: { label: "Urgente", className: "border-red-200 bg-red-50 text-red-800", icon: AlertTriangle },
  important: { label: "Importante", className: "border-amber-200 bg-amber-50 text-amber-900", icon: Target },
  attention: { label: "Atenção", className: "border-orange-200 bg-orange-50 text-orange-900", icon: Info },
  opportunity: { label: "Oportunidade", className: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: Lightbulb },
  info: { label: "Informação", className: "border-slate-200 bg-slate-50 text-slate-800", icon: Info },
};

function percentageDelta(current: number, previous: number) {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function DeltaBadge({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) {
  const delta = percentageDelta(current, previous);
  if (delta === null) return <Badge variant="outline" className="font-normal">Sem base anterior</Badge>;
  const positive = inverse ? delta <= 0 : delta >= 0;
  const Icon = delta >= 0 ? TrendingUp : TrendingDown;
  return <Badge variant="outline" className={cn("gap-1 font-medium", positive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}>
    <Icon className="h-3 w-3"/>{Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
  </Badge>;
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  explanation,
  current,
  previous,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  explanation: string;
  current?: number;
  previous?: number;
}) {
  return <Card className="surface-elevated rounded-2xl">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {title}
          <Tooltip><TooltipTrigger asChild><button type="button" aria-label={`Como ${title} é calculado`} className="rounded-full text-muted-foreground/70 hover:text-foreground"><Info className="h-3.5 w-3.5"/></button></TooltipTrigger><TooltipContent className="max-w-72 text-xs">{explanation}</TooltipContent></Tooltip>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4"/></span>
      </div>
      <strong className="mt-4 block text-2xl tracking-tight">{value}</strong>
      <div className="mt-2 flex min-h-6 flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {current !== undefined && previous !== undefined && <DeltaBadge current={current} previous={previous}/>}<span>{detail}</span>
      </div>
    </CardContent>
  </Card>;
}

function ConfidenceItem({ label, value, description }: { label: string; value: number; description: string }) {
  const tone = value >= 80 ? "text-emerald-700" : value >= 50 ? "text-amber-700" : "text-red-700";
  return <div className="space-y-2 rounded-xl border bg-card p-3">
    <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{label}</span><strong className={cn("text-sm", tone)}>{value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%</strong></div>
    <Progress value={value} className="h-1.5"/>
    <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
  </div>;
}

function buildInsights(data: BusinessDashboard): Insight[] {
  const insights: Insight[] = [];
  const missingRecipes = data.pricing.filter(product => product.ingredient_count === 0).length;

  if (data.operations.late_active_orders > 0) insights.push({
    level: "urgent",
    title: `${data.operations.late_active_orders} pedido(s) acima da meta operacional`,
    evidence: `Há pedidos abertos há mais de ${data.targets.prep_minutes} minutos.`,
    hypothesis: "Pode haver gargalo na confirmação, na cozinha ou na baixa do pedido.",
    action: "Abra a Cozinha, priorize os mais antigos e avance as etapas em tempo real.",
    link: "/cozinha",
  });
  if (data.inventory.low_stock_count > 0) insights.push({
    level: "urgent",
    title: `${data.inventory.low_stock_count} ingrediente(s) no estoque mínimo`,
    evidence: "O saldo atual já atingiu ou ficou abaixo do nível de segurança.",
    hypothesis: "Existe risco de ruptura e indisponibilidade de produtos.",
    action: "Revise o consumo e programe a reposição antes do próximo pico.",
    link: "/estoque",
  });
  if (missingRecipes > 0) insights.push({
    level: missingRecipes === data.pricing.length ? "important" : "attention",
    title: `${missingRecipes} produto(s) sem ficha técnica`,
    evidence: `Cobertura atual de receitas: ${data.data_quality.recipe_coverage.toLocaleString("pt-BR")}%.`,
    hypothesis: "Sem ingredientes e quantidades, o sistema não consegue comprovar CMV, margem ou preço ideal.",
    action: "Cadastre a composição dos produtos mais vendidos primeiro.",
    link: "/cardapio",
  });
  if (data.operations.cancellation_rate > 5) insights.push({
    level: "important",
    title: "Cancelamentos acima de 5%",
    evidence: `${data.operations.cancellation_rate.toLocaleString("pt-BR")}% dos pedidos do período foram cancelados.`,
    hypothesis: "A causa precisa ser confirmada pelos motivos registrados nos pedidos.",
    action: "Revise pedidos cancelados e padronize o preenchimento do motivo.",
    link: "/pedidos",
  });
  if (data.operations.average_prep_minutes !== null && data.operations.average_prep_minutes > data.targets.prep_minutes) insights.push({
    level: "attention",
    title: "Preparo acima da meta",
    evidence: `Média de ${data.operations.average_prep_minutes.toLocaleString("pt-BR")} min versus meta de ${data.targets.prep_minutes} min.`,
    hypothesis: "O mix de produtos, a sequência de produção ou a capacidade da cozinha podem estar pressionando o tempo.",
    action: "Compare os pedidos lentos e ajuste a ordem de preparo ou a ficha técnica.",
    link: "/cozinha",
  });
  if (data.kpis.revenue_previous > 0 && data.kpis.revenue < data.kpis.revenue_previous * 0.9) insights.push({
    level: "important",
    title: "Faturamento caiu mais de 10%",
    evidence: `${money.format(data.kpis.revenue)} no período, ante ${money.format(data.kpis.revenue_previous)} no anterior.`,
    hypothesis: "A queda pode vir de volume, ticket ou mix; os dados de produto e canal abaixo ajudam a separar as hipóteses.",
    action: "Compare pedidos, ticket e canais antes de criar uma promoção.",
    link: "/relatorios",
  });
  if (data.data_quality.identified_order_coverage < 70) insights.push({
    level: "attention",
    title: "Poucos pedidos identificam o cliente",
    evidence: `Somente ${data.data_quality.identified_order_coverage.toLocaleString("pt-BR")}% dos pedidos pagos estão vinculados a clientes.`,
    hypothesis: "Isso reduz a precisão da recorrência, preferências e risco de abandono.",
    action: "Peça telefone ou selecione o cadastro no fechamento, com consentimento adequado.",
    link: "/pedidos",
  });
  if (data.data_quality.cost_coverage < 80) insights.push({
    level: "info",
    title: "Margem histórica ainda incompleta",
    evidence: `${data.data_quality.cost_coverage.toLocaleString("pt-BR")}% dos itens vendidos têm custo congelado no pedido.`,
    hypothesis: "Pedidos feitos antes das fichas técnicas não possuem custo unitário registrado.",
    action: "Complete as fichas; os próximos pedidos passarão a preservar o custo da data da venda.",
    link: "/cardapio",
  });
  if (!insights.length) insights.push({
    level: "opportunity",
    title: "Nenhum alerta crítico no período",
    evidence: "Os indicadores monitorados estão dentro das faixas configuradas.",
    hypothesis: "Ainda vale acompanhar mudanças de mix e recorrência.",
    action: "Use os rankings para ampliar a venda dos produtos mais rentáveis.",
    link: "/relatorios",
  });
  return insights.slice(0, 5);
}

function LoadingDashboard() {
  return <div className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6 lg:p-8">
    <Skeleton className="h-36 rounded-3xl"/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-36 rounded-2xl"/>)}</div><div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]"><Skeleton className="h-80 rounded-2xl"/><Skeleton className="h-80 rounded-2xl"/></div>
  </div>;
}

export default function Index() {
  const { organizationId, organizationName } = useOrganization();
  const [period, setPeriod] = useState<DashboardPeriod>(30);
  const dashboard = useQuery({
    queryKey: ["business-dashboard", organizationId, period],
    enabled: Boolean(organizationId),
    queryFn: () => getBusinessDashboard(organizationId!, period),
  });
  const insights = useMemo(() => dashboard.data ? buildInsights(dashboard.data) : [], [dashboard.data]);

  if (dashboard.isLoading) return <LoadingDashboard/>;
  if (dashboard.isError || !dashboard.data) return <div className="mx-auto max-w-3xl p-6 md:p-10"><Card className="rounded-2xl border-destructive/30"><CardContent className="p-8 text-center"><AlertTriangle className="mx-auto h-10 w-10 text-destructive"/><h1 className="mt-4 text-xl font-semibold">Não foi possível montar a visão estratégica</h1><p className="mt-2 text-sm text-muted-foreground">A conexão ou a consulta analítica falhou. Tente novamente.</p><Button className="mt-5" onClick={() => dashboard.refetch()}><RefreshCw className="mr-2 h-4 w-4"/>Tentar novamente</Button></CardContent></Card></div>;

  const data = dashboard.data;
  const grossMarginPercent = data.kpis.gross_margin !== null && data.kpis.revenue > 0 ? 100 * data.kpis.gross_margin / data.kpis.revenue : null;
  const topRevenue = Math.max(...data.products.map(product => Number(product.revenue)), 1);
  const totalChannelRevenue = data.channels.reduce((sum, channel) => sum + Number(channel.revenue), 0);
  const criticalCount = insights.filter(item => item.level === "urgent" || item.level === "important").length;

  return <div className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6 lg:p-8">
    <section className="executive-hero relative overflow-hidden rounded-3xl border px-5 py-5 text-white shadow-xl shadow-primary/10 md:px-7">
      <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl"/>
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-2xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-white/60"><Sparkles className="h-3.5 w-3.5"/>Central de decisões</div><h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{organizationName}</h1><p className="mt-1 text-sm text-white/70">O que aconteceu, onde agir e quais dados sustentam cada decisão.</p></div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[["Hoje", data.kpis.revenue_today], ["Semana", data.kpis.revenue_week], ["Mês", data.kpis.revenue_month]].map(([label, value]) => <div key={String(label)} className="min-w-32 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"><p className="text-xs text-white/55">Faturamento · {label}</p><strong className="mt-1 block text-lg">{compactMoney.format(Number(value))}</strong></div>)}
        </div>
        <div className="flex flex-wrap gap-2"><Button asChild className="bg-white text-foreground hover:bg-white/90"><Link to="/pedidos"><ShoppingBag className="mr-2 h-4 w-4"/>Novo pedido</Link></Button><Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link to="/cozinha">Abrir operação</Link></Button></div>
      </div>
    </section>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">Pulso do negócio</h2><Badge variant={criticalCount ? "destructive" : "default"}>{criticalCount ? `${criticalCount} prioridade(s)` : "Operação saudável"}</Badge></div><p className="text-xs text-muted-foreground">Atualizado em {new Date(data.generated_at).toLocaleString("pt-BR")}</p></div>
      <div className="flex items-center gap-1 rounded-xl border bg-card p-1" aria-label="Período do dashboard"><CalendarRange className="mx-2 h-4 w-4 text-muted-foreground"/>{([7, 30, 90] as const).map(days => <Button key={days} size="sm" variant={period === days ? "default" : "ghost"} className="rounded-lg" onClick={() => setPeriod(days)}>{days} dias</Button>)}</div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard title={`Faturamento · ${period} dias`} value={money.format(data.kpis.revenue)} detail={`${data.kpis.paid_orders} pedido(s) pago(s)`} icon={ReceiptText} explanation="Soma do valor total dos pedidos com pagamento marcado como pago no período selecionado." current={data.kpis.revenue} previous={data.kpis.revenue_previous}/>
      <MetricCard title="Pedidos" value={String(data.kpis.orders)} detail="Exclui cancelados" icon={ShoppingBag} explanation="Quantidade de pedidos criados no período, desconsiderando pedidos cancelados." current={data.kpis.orders} previous={data.kpis.orders_previous}/>
      <MetricCard title="Ticket médio" value={money.format(data.kpis.ticket)} detail="Faturamento ÷ pedidos pagos" icon={BadgeDollarSign} explanation="Faturamento dos pedidos pagos dividido pela quantidade de pedidos pagos." current={data.kpis.ticket} previous={data.kpis.ticket_previous}/>
      <MetricCard title="Clientes recorrentes" value={`${data.kpis.repeat_customer_rate.toLocaleString("pt-BR")}%`} detail={data.kpis.average_return_days !== null ? `Retornam em média em ${data.kpis.average_return_days.toLocaleString("pt-BR")} dia(s)` : "Aguardando novas compras"} icon={Users} explanation="Percentual dos clientes identificados no período que já fizeram mais de uma compra paga."/>
      <MetricCard title="Lucro bruto estimado" value={data.kpis.gross_margin === null ? "Sem cobertura" : money.format(data.kpis.gross_margin)} detail={grossMarginPercent === null ? "Complete as fichas técnicas" : `${grossMarginPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% de margem bruta`} icon={CircleDollarSign} explanation="Receita menos o custo dos ingredientes congelado em cada item vendido. Não inclui taxas, impostos, embalagem, entrega ou mão de obra."/>
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
      <Card className="surface-elevated rounded-2xl"><CardHeader className="pb-3"><div className="flex items-center justify-between gap-4"><div><CardTitle className="text-lg">Evolução do faturamento</CardTitle><p className="mt-1 text-xs text-muted-foreground">Receita paga por dia no período selecionado.</p></div><Badge variant="secondary">{period} dias</Badge></div></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.movement} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}><defs><linearGradient id="revenue-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35}/><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} tickFormatter={value => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}/><YAxis tickLine={false} axisLine={false} tickFormatter={value => compactMoney.format(Number(value))}/><ChartTooltip formatter={value => [money.format(Number(value)), "Faturamento"]} labelFormatter={value => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { dateStyle: "full" })}/><Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#revenue-area)"/></AreaChart></ResponsiveContainer></div></CardContent></Card>

      <Card className="surface-elevated rounded-2xl"><CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-4 w-4 text-primary"/>Insights e ações</CardTitle><p className="mt-1 text-xs text-muted-foreground">Fatos, hipóteses e próximos passos.</p></div><Badge variant={criticalCount ? "destructive" : "secondary"}>{insights.length}</Badge></div></CardHeader><CardContent className="max-h-72 space-y-2 overflow-y-auto pr-2">{insights.map((insight, index) => { const style = insightStyle[insight.level]; const Icon = style.icon; return <article key={`${insight.title}-${index}`} className={cn("rounded-xl border p-3", style.className)}><div className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{insight.title}</strong><span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{style.label}</span></div><p className="mt-1 text-xs leading-relaxed opacity-90">{insight.evidence}</p><p className="mt-1 text-xs leading-relaxed opacity-75"><span className="font-semibold">Hipótese:</span> {insight.hypothesis}</p><Link to={insight.link} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline-offset-4 hover:underline">{insight.action}<ArrowRight className="h-3 w-3"/></Link></div></div></article>; })}</CardContent></Card>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="surface-elevated rounded-2xl"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2 text-lg"><Utensils className="h-4 w-4 text-primary"/>Produtos que movem o negócio</CardTitle><p className="mt-1 text-xs text-muted-foreground">Ranking por faturamento no período.</p></div><Button asChild variant="ghost" size="sm"><Link to="/relatorios">Detalhes<ArrowRight className="ml-1 h-3.5 w-3.5"/></Link></Button></div></CardHeader><CardContent>{data.products.length ? <div className="space-y-3">{data.products.slice(0, 6).map((product, index) => <div key={product.id}><div className="mb-1.5 flex items-center gap-3 text-sm"><span className="grid h-6 w-6 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><span className="min-w-0 flex-1 truncate font-medium">{product.name}</span><span className="text-xs text-muted-foreground">{product.units} un.</span><strong>{money.format(product.revenue)}</strong></div><div className="ml-9 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, 100 * Number(product.revenue) / topRevenue)}%` }}/></div></div>)}</div> : <div className="py-10 text-center text-sm text-muted-foreground"><PackageSearch className="mx-auto mb-3 h-8 w-8 opacity-40"/>Registre pedidos pagos para criar o ranking.</div>}</CardContent></Card>

      <Card className="surface-elevated rounded-2xl"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2 text-lg"><Banknote className="h-4 w-4 text-primary"/>Canais e pagamentos</CardTitle><p className="mt-1 text-xs text-muted-foreground">Onde a receita entra e como é recebida.</p></div></div></CardHeader><CardContent><div className="grid gap-5 sm:grid-cols-2"><div><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canais</p><div className="space-y-3">{data.channels.length ? data.channels.map(channel => <div key={channel.channel}><div className="flex justify-between text-sm"><span>{channelLabels[channel.channel] ?? channel.channel}</span><strong>{money.format(channel.revenue)}</strong></div><Progress className="mt-1.5 h-1.5" value={totalChannelRevenue ? 100 * Number(channel.revenue) / totalChannelRevenue : 0}/></div>) : <p className="text-sm text-muted-foreground">Sem vendas pagas.</p>}</div></div><div><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formas de pagamento</p><div className="space-y-2">{data.payment_methods.length ? data.payment_methods.map(method => <div key={method.method} className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm"><span>{paymentLabels[method.method] ?? method.method}</span><div className="text-right"><strong className="block">{money.format(method.revenue)}</strong><span className="text-[11px] text-muted-foreground">{method.payments} recebimento(s)</span></div></div>) : <p className="text-sm text-muted-foreground">Sem pagamentos registrados.</p>}</div></div></div></CardContent></Card>
    </div>

    <Card className="surface-elevated overflow-hidden rounded-2xl"><CardHeader className="border-b bg-muted/30"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="flex items-center gap-2 text-lg"><BadgeDollarSign className="h-4 w-4 text-primary"/>Preço e margem por produto</CardTitle><p className="mt-1 text-xs text-muted-foreground">CMV considera ingredientes; preço sugerido usa a meta de {data.targets.food_cost_percent}%.</p></div><Button asChild size="sm"><Link to="/cardapio">Gerenciar fichas técnicas<ArrowRight className="ml-2 h-3.5 w-3.5"/></Link></Button></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3">Produto</th><th className="px-5 py-3 text-right">Venda</th><th className="px-5 py-3 text-right">Custo receita</th><th className="px-5 py-3 text-right">CMV</th><th className="px-5 py-3 text-right">Preço pela meta</th><th className="px-5 py-3">Diagnóstico</th></tr></thead><tbody className="divide-y">{data.pricing.slice(0, 10).map(product => { const missing = product.ingredient_count === 0; const aboveTarget = product.food_cost_percent !== null && product.food_cost_percent > data.targets.food_cost_percent; return <tr key={product.id} className="hover:bg-muted/25"><td className="px-5 py-3 font-medium">{product.name}</td><td className="px-5 py-3 text-right">{money.format(product.sale_price)}</td><td className="px-5 py-3 text-right">{missing ? "—" : money.format(product.recipe_cost)}</td><td className="px-5 py-3 text-right">{product.food_cost_percent === null ? "—" : `${product.food_cost_percent.toLocaleString("pt-BR")}%`}</td><td className="px-5 py-3 text-right">{product.suggested_price === null ? "—" : money.format(product.suggested_price)}</td><td className="px-5 py-3"><Badge variant={missing || aboveTarget ? "destructive" : "default"}>{missing ? "Sem ficha técnica" : aboveTarget ? "Margem sob pressão" : "Dentro da meta"}</Badge></td></tr>; })}</tbody></table></div>{data.pricing.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Cadastre produtos para analisar preços.</p>}<p className="border-t bg-amber-50 px-5 py-3 text-xs text-amber-900">O custo mostrado não inclui embalagem, taxas, impostos, entrega ou mão de obra. Use-o como margem bruta de ingredientes, não como lucro líquido.</p></CardContent></Card>

    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-4 w-4 text-primary"/>Clientes de maior valor</CardTitle></CardHeader><CardContent>{data.customers.length ? <div className="space-y-2">{data.customers.map((customer, index) => <div key={customer.id} className="flex items-center gap-3 rounded-xl border p-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-bold">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{customer.name}</p><p className="text-xs text-muted-foreground">{customer.orders} pedido(s) · {customer.lifetime_orders > 1 ? "Recorrente" : "Novo"}</p></div><strong className="text-sm">{money.format(customer.revenue)}</strong></div>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">Identifique clientes nos pedidos para gerar este ranking.</p>}</CardContent></Card>

      <Card className="surface-elevated rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ChefHat className="h-4 w-4 text-primary"/>Eficiência operacional</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3"><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Preparo médio</p><strong className="mt-1 block text-xl">{data.operations.average_prep_minutes === null ? "—" : `${data.operations.average_prep_minutes} min`}</strong><p className="mt-1 text-[11px] text-muted-foreground">Meta: {data.targets.prep_minutes} min</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Entrega média</p><strong className="mt-1 block text-xl">{data.operations.average_delivery_minutes === null ? "—" : `${data.operations.average_delivery_minutes} min`}</strong><p className="mt-1 text-[11px] text-muted-foreground">Meta: {data.targets.delivery_minutes} min</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Em aberto</p><strong className="mt-1 block text-xl">{data.operations.active_orders}</strong><p className="mt-1 text-[11px] text-muted-foreground">{data.operations.late_active_orders} acima da meta</p></div><div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Cancelamentos</p><strong className={cn("mt-1 block text-xl", data.operations.cancellation_rate > 5 && "text-destructive")}>{data.operations.cancellation_rate}%</strong><p className="mt-1 text-[11px] text-muted-foreground">No período</p></div></CardContent></Card>

      <Card className="surface-elevated rounded-2xl"><CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-lg"><Boxes className="h-4 w-4 text-primary"/>Estoque e cobertura</CardTitle><strong className="text-sm">{money.format(data.inventory.stock_value)}</strong></div></CardHeader><CardContent>{data.inventory.alerts.length ? <div className="space-y-2">{data.inventory.alerts.map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950"><AlertTriangle className="h-4 w-4 shrink-0"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs opacity-75">{item.stock_quantity} {item.unit} · mínimo {item.minimum_stock}</p></div><Badge variant="outline" className="border-amber-300 bg-white/50">{item.coverage_days === null ? "Sem consumo" : `${item.coverage_days} dias`}</Badge></div>)}</div> : <div className="py-7 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600"/><p className="mt-2 text-sm font-medium">Nenhum alerta de estoque</p><p className="mt-1 text-xs text-muted-foreground">Itens acima do mínimo e sem risco em 7 dias.</p></div>}</CardContent></Card>
    </div>

    <Card className="rounded-2xl border-dashed bg-muted/20"><CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary"/>Confiança dos indicadores</CardTitle><p className="mt-1 text-xs text-muted-foreground">O dashboard mostra o que é fato e onde ainda falta instrumentação.</p></div><Button asChild variant="outline" size="sm"><Link to="/configuracoes">Ajustar metas</Link></Button></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><ConfidenceItem label="Clientes identificados" value={data.data_quality.identified_order_coverage} description="Base para recorrência, preferências e risco de abandono."/><ConfidenceItem label="Fichas técnicas" value={data.data_quality.recipe_coverage} description="Base para CMV atual, preço sugerido e consumo previsto."/><ConfidenceItem label="Custos nas vendas" value={data.data_quality.cost_coverage} description="Base para margem histórica dos pedidos já realizados."/><ConfidenceItem label="Tempos por etapa" value={data.data_quality.timing_coverage} description="Base para medir preparo e entrega sem estimativas."/></CardContent></Card>

    <div className="grid gap-4 sm:grid-cols-3"><Card className="rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><Clock3 className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground">Ciclo médio concluído</p><strong>{data.operations.average_cycle_minutes === null ? "Sem dados" : `${data.operations.average_cycle_minutes} min`}</strong></div></CardContent></Card><Card className="rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><Star className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground">Avaliação média</p><strong>{data.kpis.average_rating === null ? "Sem avaliações" : `${data.kpis.average_rating} / 5`}</strong></div></CardContent></Card><Card className="rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><Boxes className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground">Valor em estoque</p><strong>{money.format(data.inventory.stock_value)}</strong></div></CardContent></Card></div>
  </div>;
}
