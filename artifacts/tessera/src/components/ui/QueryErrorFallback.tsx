import { AlertTriangle, RefreshCw } from "lucide-react";

interface QueryErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  label?: string;
}

export function QueryErrorFallback({ error, onRetry, label }: QueryErrorFallbackProps) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center" data-testid={`query-error-${label || "generic"}`}>
      <AlertTriangle size={20} className="text-red-400/60 mx-auto mb-2" />
      <div className="text-xs text-red-400 font-medium mb-1">
        {label ? `Failed to load ${label}` : "Failed to load data"}
      </div>
      <div className="text-[10px] text-red-400/50 font-mono mb-3 max-w-xs mx-auto truncate">
        {error?.message || "Unknown error"}
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
        data-testid={`button-retry-${label || "generic"}`}
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </div>
  );
}
