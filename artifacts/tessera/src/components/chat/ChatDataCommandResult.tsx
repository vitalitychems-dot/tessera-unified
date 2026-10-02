import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DataCommandResultProps {
  result: { label: string; content: string; loading: boolean };
  onDismiss: () => void;
}

export function ChatDataCommandResult({ result, onDismiss }: DataCommandResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="max-w-3xl mx-auto mb-3 data-command-card"
      data-testid="data-command-result"
    >
      <div className="px-4 py-3 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 pulse-glow" />
          <span className="text-[11px] font-mono text-cyan-400 tracking-wider uppercase" style={{ fontFamily: 'var(--font-display)' }}>{result.label}</span>
          {!result.loading && (
            <button onClick={onDismiss} className="ml-auto text-white/30 hover:text-white/60 transition-colors" data-testid="button-dismiss-data"><X size={12} /></button>
          )}
        </div>
        {result.loading ? (
          <div className="flex items-center gap-2 text-cyan-300/60 text-xs">
            <Loader2 size={12} className="animate-spin" />
            <span className="font-mono">Fetching live data...</span>
          </div>
        ) : (
          <div className="tessera-message prose prose-invert max-w-none prose-sm text-[13px] leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
