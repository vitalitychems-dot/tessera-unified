import { useState, useEffect, useRef } from "react";
import { Zap, Play, Pause, Square, Plus, Trash2, ChevronRight, Brain, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface Task {
  id: string;
  name: string;
  prompt: string;
  status: "queued" | "running" | "complete" | "failed";
  priority: "critical" | "high" | "normal";
  agent: string;
  result?: string;
  created: string;
  duration?: string;
}

const INITIAL_TASKS: Task[] = [
  { id: "t1", name: "Sovereignty audit", prompt: "Run a full sovereignty health check and return a summary report", status: "complete", priority: "critical", agent: "Alpha", result: "All 27 agents online. Mesh health: 99.1%. TSRT stable. Knowledge indexed: 4.2M vectors.", created: "10m ago", duration: "3.2s" },
  { id: "t2", name: "Market analysis", prompt: "Analyze current crypto market conditions and identify top 3 opportunities", status: "complete", priority: "high", agent: "Beta", result: "Top opportunities: 1) TSRT undervalued 8.7% vs. 30d avg. 2) BTC breakout imminent (RSI 68). 3) ETH/BTC ratio at 6-month low.", created: "25m ago", duration: "8.1s" },
  { id: "t3", name: "Council summary", prompt: "Summarize all pending Grand Council proposals and their current vote tallies", status: "running", priority: "normal", agent: "Gamma", created: "2m ago" },
  { id: "t4", name: "Lead qualification", prompt: "Score all new leads from the last 24 hours using the sovereign scoring algorithm", status: "queued", priority: "normal", agent: "Delta", created: "just now" },
];

const STATUS_STYLES: Record<string, { text: string; bg: string; border: string; Icon: any }> = {
  queued: { text: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", Icon: Clock },
  running: { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/25", Icon: Brain },
  complete: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", Icon: CheckCircle2 },
  failed: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", Icon: Square },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-400",
  high: "text-amber-400",
  normal: "text-slate-400",
};

export default function SelfExecutorPage() {
  useEffect(() => { document.title = "Self Executor | Tessera"; }, []);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [newPrompt, setNewPrompt] = useState("");
  const [running, setRunning] = useState(true);

  const addTask = () => {
    if (!newPrompt.trim()) return;
    const task: Task = {
      id: `t${Date.now()}`,
      name: newPrompt.slice(0, 40) + (newPrompt.length > 40 ? "..." : ""),
      prompt: newPrompt,
      status: "queued",
      priority: "normal",
      agent: "Tessera",
      created: "just now",
    };
    setTasks(prev => [task, ...prev]);
    setNewPrompt("");
  };

  const queued = tasks.filter(t => t.status === "queued").length;
  const running_ = tasks.filter(t => t.status === "running").length;
  const complete = tasks.filter(t => t.status === "complete").length;

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <PageHeader icon={Zap} title="Self Executor" subtitle="Autonomous sovereign task execution — define goals, let Tessera handle the rest" iconColor="text-violet-400" />
        <button
          onClick={() => setRunning(!running)}
          className={cn("flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all",
            running ? "bg-violet-500/15 border-violet-500/25 text-violet-400" : "bg-white/5 border-white/10 text-slate-400"
          )}
        >
          {running ? <Pause size={12} /> : <Play size={12} />}
          {running ? "Pause" : "Resume"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Queued", val: queued, color: "slate" },
          { label: "Running", val: running_, color: "cyan" },
          { label: "Complete", val: complete, color: "emerald" },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <div className={cn("text-2xl font-bold font-mono", `text-${color}-400`)}>{val}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{label.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4">
        <div className="text-[10px] text-slate-500 font-mono mb-3">SUBMIT NEW TASK</div>
        <div className="flex gap-2">
          <textarea
            value={newPrompt}
            onChange={e => setNewPrompt(e.target.value)}
            placeholder="Describe what you want Tessera to autonomously execute..."
            rows={2}
            className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500/30 resize-none"
          />
          <button
            onClick={addTask}
            disabled={!newPrompt.trim()}
            className="px-4 py-2 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-400 text-sm font-mono hover:bg-violet-500/25 transition-all disabled:opacity-40 self-start"
          >
            <Play size={14} />
          </button>
        </div>
      </GlassCard>

      <div className="space-y-2">
        {tasks.map(task => {
          const s = STATUS_STYLES[task.status];
          const StatusIcon = s.Icon;
          return (
            <GlassCard key={task.id} className={cn("p-4 border transition-all", s.border, "hover:bg-white/[0.04]")}>
              <div className="flex items-start gap-3">
                <StatusIcon size={15} className={cn("mt-0.5 shrink-0", s.text, task.status === "running" && "animate-pulse")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{task.name}</span>
                    <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full border font-mono uppercase", s.bg, s.text, s.border)}>{task.status}</span>
                    <span className={cn("text-[9px] font-mono", PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{task.prompt}</p>
                  {task.result && (
                    <div className="mt-2 p-2.5 rounded-lg bg-black/20 border border-white/5 text-xs text-slate-300 leading-snug">
                      {task.result}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[9px] text-slate-600 font-mono">
                    <span>Agent: {task.agent}</span>
                    <span>Created: {task.created}</span>
                    {task.duration && <span>Duration: {task.duration}</span>}
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
