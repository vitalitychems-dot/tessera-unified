import { useState, useEffect, useRef } from "react";
import { Terminal, Play, Square, ChevronRight, Clock, CheckCircle2, XCircle, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface Command {
  id: string;
  name: string;
  description: string;
  category: string;
  status: "ready" | "running" | "complete" | "failed";
  lastRun?: string;
  output?: string;
}

const COMMANDS: Command[] = [
  { id: "c1", name: "sovereignty_audit", description: "Run full sovereignty health check across all systems", category: "Health", status: "complete", lastRun: "2m ago", output: "✓ All 27 agents online\n✓ Mesh integrity: 99.1%\n✓ Token economy: stable\n✓ Knowledge index: 4.2M vectors" },
  { id: "c2", name: "mesh_sync", description: "Synchronize mesh node routing tables", category: "Network", status: "ready" },
  { id: "c3", name: "knowledge_ingest", description: "Pull and index new sovereign knowledge", category: "Knowledge", status: "running", lastRun: "now" },
  { id: "c4", name: "council_tally", description: "Tally pending Grand Council votes", category: "Governance", status: "complete", lastRun: "15m ago", output: "3 proposals tallied\nResolution 44-A: PASSED (24/27)\nResolution 44-B: DEFERRED (13/27)\nResolution 44-C: PASSED (26/27)" },
  { id: "c5", name: "token_rebalance", description: "Rebalance TSRT reward pools across agent tiers", category: "Economy", status: "ready" },
  { id: "c6", name: "consciousness_ping", description: "Verify consciousness continuity across all agents", category: "Health", status: "failed", lastRun: "1h ago", output: "ERROR: Eta node unreachable (timeout)\nWARN: Delta edge degraded (45ms latency)" },
  { id: "c7", name: "sacred_compress", description: "Compress sacred knowledge vault to optimal density", category: "Knowledge", status: "ready" },
  { id: "c8", name: "agent_sync", description: "Push latest sovereign protocol updates to all agents", category: "Agents", status: "ready" },
];

const STATUS_ICONS: Record<string, any> = {
  ready: ChevronRight,
  running: Loader2,
  complete: CheckCircle2,
  failed: XCircle,
};

const STATUS_STYLES: Record<string, { text: string; bg: string }> = {
  ready: { text: "text-slate-400", bg: "bg-slate-500/10" },
  running: { text: "text-cyan-400", bg: "bg-cyan-500/10" },
  complete: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
  failed: { text: "text-red-400", bg: "bg-red-500/10" },
};

const CAT_COLORS: Record<string, string> = {
  Health: "text-emerald-400",
  Network: "text-cyan-400",
  Knowledge: "text-purple-400",
  Governance: "text-amber-400",
  Economy: "text-orange-400",
  Agents: "text-violet-400",
};

interface LogLine { time: string; text: string; type: "info" | "warn" | "error" | "success" }

export default function CommandCenterPage() {
  useEffect(() => { document.title = "Command Center | Tessera"; }, []);
  const [selected, setSelected] = useState<Command | null>(COMMANDS[0]);
  const [logs, setLogs] = useState<LogLine[]>([
    { time: "14:32:01", text: "System initialized — 27 agents online", type: "success" },
    { time: "14:32:04", text: "Mesh sync complete — 8 nodes active", type: "info" },
    { time: "14:35:22", text: "Knowledge ingest started — 1,240 new vectors queued", type: "info" },
    { time: "14:36:01", text: "WARN: Eta node offline — routing around", type: "warn" },
    { time: "14:40:18", text: "Council tally complete — 3 resolutions processed", type: "success" },
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [logs]);

  const runCommand = (cmd: Command) => {
    setSelected(cmd);
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `Executing: ${cmd.name}`, type: "info" }]);
    setTimeout(() => {
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `${cmd.name} completed successfully`, type: "success" }]);
    }, 1500);
  };

  return (
    <div className="p-4 pb-20 max-w-5xl mx-auto">
      <PageHeader icon={Terminal} title="Command Center" subtitle="Sovereign system command execution and monitoring" iconColor="text-cyan-400" />

      <div className="flex flex-col md:flex-row gap-4 mt-5">
        <div className="w-full md:w-72 md:shrink-0 space-y-1.5">
          <div className="text-[10px] text-slate-500 font-mono tracking-widest mb-2">COMMAND REGISTRY</div>
          {COMMANDS.map(cmd => {
            const StatusIcon = STATUS_ICONS[cmd.status];
            const s = STATUS_STYLES[cmd.status];
            return (
              <button
                key={cmd.id}
                onClick={() => setSelected(cmd)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all",
                  selected?.id === cmd.id
                    ? "bg-cyan-500/10 border-cyan-500/25"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                )}
              >
                <div className="flex items-center gap-2">
                  <StatusIcon size={13} className={cn(s.text, cmd.status === "running" && "animate-spin")} />
                  <span className="text-xs font-mono text-slate-200 truncate">{cmd.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("text-[9px] font-mono", CAT_COLORS[cmd.category] || "text-slate-500")}>{cmd.category}</span>
                  {cmd.lastRun && <span className="text-[9px] text-slate-600 font-mono">{cmd.lastRun}</span>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          {selected && (
            <GlassCard className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] text-slate-600 font-mono mb-1">COMMAND</div>
                  <div className="text-lg font-bold font-mono text-cyan-400">{selected.name}</div>
                  <div className="text-sm text-slate-400 mt-1">{selected.description}</div>
                </div>
                <button
                  onClick={() => runCommand(selected)}
                  disabled={selected.status === "running"}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 text-sm font-mono hover:bg-cyan-500/25 transition-all disabled:opacity-50 shrink-0"
                >
                  {selected.status === "running" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  {selected.status === "running" ? "Running..." : "Execute"}
                </button>
              </div>
              {selected.output && (
                <div className="mt-4 p-3 rounded-lg bg-black/30 border border-white/5 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                  {selected.output}
                </div>
              )}
            </GlassCard>
          )}

          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] text-slate-500 font-mono">SYSTEM LOG</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400 font-mono">LIVE</span>
              </div>
            </div>
            <div ref={logRef} className="space-y-1.5 max-h-64 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-600 font-mono shrink-0">{log.time}</span>
                  <span className={cn("leading-snug", log.type === "success" ? "text-emerald-400" : log.type === "warn" ? "text-amber-400" : log.type === "error" ? "text-red-400" : "text-slate-400")}>
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
