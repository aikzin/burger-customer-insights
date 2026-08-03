import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const names: Record<string, string> = { pedidos:"Pedidos", cozinha:"Cozinha", cardapio:"Cardápio", estoque:"Estoque", compras:"Compras e fornecedores", financeiro:"Financeiro", marketing:"Marketing", avaliacoes:"Avaliações", relatorios:"Relatórios", configuracoes:"Configurações" };

export default function ModulePlaceholder() {
  const key = useLocation().pathname.slice(1);
  const name = names[key] ?? "Módulo";
  return <div className="p-4 md:p-8"><Card><CardHeader><CardTitle>{name}</CardTitle></CardHeader><CardContent className="text-muted-foreground">Este módulo será liberado na fase correspondente, conectado aos registros reais. Nenhum dado fictício será exibido.</CardContent></Card></div>;
}
