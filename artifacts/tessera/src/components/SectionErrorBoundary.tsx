import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  name?: string;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.compact) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/20 border border-red-500/20 text-red-300/80 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{this.props.name || "Section"} failed</span>
          <button onClick={this.handleRetry} className="ml-auto shrink-0 hover:text-red-200 transition-colors">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-red-950/10 border border-red-500/15 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-red-400/90">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-medium">{this.props.name || "Section"} encountered an error</span>
        </div>
        <p className="text-xs text-red-300/50 max-w-md text-center truncate">
          {this.state.error?.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={this.handleRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-300/80 text-xs hover:bg-red-500/20 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }
}

export function QueryErrorFallback({
  error,
  onRetry,
  label,
}: {
  error: Error | null;
  onRetry: () => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-950/20 border border-amber-500/20 text-amber-300/80 text-xs">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{label || "Data"} failed to load{error ? `: ${error.message}` : ""}</span>
      <button
        onClick={onRetry}
        className="ml-auto shrink-0 flex items-center gap-1 hover:text-amber-200 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Retry
      </button>
    </div>
  );
}

export default SectionErrorBoundary;
