import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[app] renderização interrompida", { error, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border bg-card p-7 text-center shadow-lg">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-bold">A página encontrou um erro</h1>
          <p className="mt-2 text-sm text-muted-foreground">Se uma atualização foi publicada enquanto o sistema estava aberto, recarregue para usar a versão mais recente.</p>
          <Button className="mt-5 rounded-xl" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />Recarregar sistema
          </Button>
        </div>
      </div>
    );
  }
}
