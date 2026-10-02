import { Brain, Activity, Zap } from "lucide-react";

export function FatherNotesPanel() {
  return null;
}

export function AgentActivityPanel({ comms, isActive }: { comms: any[]; isActive: boolean }) {
  if (!comms || comms.length === 0) return null;
  return (
    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Activity className="w-3 h-3 text-cyan-400" />
        <span className="text-xs font-medium text-gray-300">Agent Activity</span>
        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {comms.slice(-5).map((c: any, i: number) => (
          <div key={i} className="text-[10px] text-gray-500 truncate">
            <span className="text-cyan-400/70">{c.agent || "Agent"}</span>: {c.message || c.content || "..."}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActiveAgentsBadges({ agents }: { agents: string[] }) {
  if (!agents || agents.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {agents.map((agent, i) => (
        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" data-testid={`badge-agent-${agent}`}>
          {agent}
        </span>
      ))}
    </div>
  );
}

export function TesseractSwarmPanel({ agents, comms, isActive }: { agents: any[]; comms: any[]; isActive: boolean }) {
  if ((!agents || agents.length === 0) && (!comms || comms.length === 0)) return null;
  return (
    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Brain className="w-3 h-3 text-violet-400" />
        <span className="text-xs font-medium text-gray-300">Swarm Active</span>
        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />}
      </div>
      {agents && agents.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {agents.map((a: any, i: number) => (
            <span key={i} className="px-1 py-0.5 rounded text-[9px] bg-violet-500/10 text-violet-300">{a.name || a}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThinkingRepoBlocks() {
  return (
    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-black/20 border border-white/5">
      <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
      <span className="text-xs text-gray-400">Processing...</span>
    </div>
  );
}

export function ContextSuggestions({ suggestions, onSelect }: { suggestions?: string[]; onSelect?: (s: string) => void }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {suggestions.map((s, i) => (
        <button key={i} onClick={() => onSelect?.(s)} className="px-2 py-1 rounded-full text-xs bg-white/5 text-gray-300 hover:bg-white/10 transition-colors border border-white/5" data-testid={`suggestion-${i}`}>
          {s}
        </button>
      ))}
    </div>
  );
}
