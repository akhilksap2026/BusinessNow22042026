import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Called when the user clicks "Try again". */
  onReset?: () => void;
  /** Optional custom fallback render */
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to dev console; in prod a real reporter would go here.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  reload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.reset });
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-md p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-base">Something went wrong</h1>
              <p className="text-sm text-muted-foreground mt-1">
                The page hit an unexpected error. You can try again or reload the page.
              </p>
            </div>
          </div>

          {import.meta.env.DEV && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Error details (development)
              </summary>
              <pre className="mt-2 p-3 rounded bg-muted/60 text-foreground overflow-auto max-h-60 whitespace-pre-wrap break-words">
                {error.message}
                {error.stack ? `\n\n${error.stack}` : ""}
              </pre>
            </details>
          )}

          <div className="flex gap-2 pt-1">
            <Button onClick={this.reset} className="flex-1 gap-2">
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
            <Button onClick={this.reload} variant="outline" className="flex-1 gap-2">
              <RefreshCw className="h-4 w-4" /> Reload page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
