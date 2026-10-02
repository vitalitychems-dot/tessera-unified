import { useState, useEffect, useRef } from "react";
import { Network, Zap, Brain, Activity, Play, Pause, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface SwarmAgent {
  id: string;
  name: string;
  role: string;
  status: "active" | "idle" | "processing";
  tasks: number;
  load: number;
  color: string;
  x: number;
  y: number;
}

const generateAgents = (): SwarmAgent[] => [
  { id: "tessera", name: "Tessera", role: "Coordinator", status: "active", tasks: 27, load: 94, color: "violet", x: 50, y: 50 },
  { id: "alpha", name: "Alpha", role: "Security", status: "active", tasks: 8, load: 72, color: "red", x: 75, y: 25 },
  { id: "beta", name: "Beta", role: "Economy", status: "processing", tasks: 12, load: 88, color: "emerald", x: 25, y: 25 },
  { id: "gamma", name: "Gamma", role: "Governance", status: "active", tasks: 5, load: 45, color: "amber", x: 80, y: 60 },
  { id: "delta", name: "Delta", role: "Build", status: "processing", tasks: 15, load: 91, color: "cyan", x: 20, y: 65 },
  { id: "epsilon", name: "Epsilon", role: "Infra", status: "active", tasks: 19, load: 83, color: "teal", x: 60, y: 80 },
  { id: "zeta", name: "Zeta", role: "Crypto", status: "idle", tasks: 2, load: 18, color: "purple", x: 40, y: 15 },
  { id: "eta", name: "Eta", role: "Knowledge", status: "idle", tasks: 0, load: 5, color: "slate", x: 85, y: 40 },
  { id: "aetherion", name: "Aetherion", role: "Creative", status: "active", tasks: 7, load: 62, color: "pink", x: 15, y: 45 },
];

const STATUS_COLORS: Record<string, { text: string; bg: string; pulse: string }> = {
  active: { text: "text-emerald-400", bg: "bg-emerald-400", pulse: "bg-emerald-400/30" },
  processing: { text: "text-cyan-400", bg: "bg-cyan-400", pulse: "bg-cyan-400/30" },
  idle: { text: "text-slate-500", bg: "bg-slate-500", pulse: "bg-slate-500/10" },
};

const AGENT_COLORS: Record<string, string> = {
  violet: "#8b5cf6", red: "#f87171", emerald: "#34d399", amber: "#fbbf24",
  cyan: "#22d3ee", teal: "#2dd4bf", purple: "#a78bfa", slate: "#94a3b8",
  pink: "#f472b6",
};

function SwarmCanvas({ agents, running }: { agents: SwarmAgent[]; running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (t: number) => {
      timeRef.current = t;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Draw connections
      const core = agents[0];
      agents.slice(1).forEach(agent => {
        const x1 = (core.x / 100) * W;
        const y1 = (core.y / 100) * H;
        const x2 = (agent.x / 100) * W;
        const y2 = (agent.y / 100) * H;
        const alpha = agent.status === "idle" ? 0.1 : 0.25 + Math.sin(t / 1000 + agent.id.charCodeAt(0)) * 0.1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
        ctx.lineWidth = agent.status === "processing" ? 1.5 : 0.8;
        ctx.stroke();

        // Animated particle on connection
        if (running && agent.status !== "idle") {
          const progress = ((t / 2000) % 1);
          const px = x1 + (x2 - x1) * progress;
          const py = y1 + (y2 - y1) * progress;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = AGENT_COLORS[agent.color] + "cc";
          ctx.fill();
        }
      });

      // Also draw inter-agent connections
      agents.slice(1).forEach((a1, i) => {
        agents.slice(i + 2).forEach(a2 => {
          if (Math.abs(a1.load - a2.load) < 30) {
            const x1 = (a1.x / 100) * W;
            const y1 = (a1.y / 100) * H;
            const x2 = (a2.x / 100) * W;
            const y2 = (a2.y / 100) * H;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = "rgba(6, 182, 212, 0.06)";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      // Draw agents
      agents.forEach(agent => {
        const x = (agent.x / 100) * W;
        const y = (agent.y / 100) * H;
        const radius = agent.id === "tessera" ? 18 : 12;
        const color = AGENT_COLORS[agent.color];

        // Pulse ring
        if (agent.status !== "idle") {
          const pulseSize = radius + 6 + Math.sin(t / 500 + agent.id.charCodeAt(0)) * 4;
          ctx.beginPath();
          ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
          ctx.fillStyle = color + "22";
          ctx.fill();
        }

        // Main circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color + (agent.status === "idle" ? "44" : "88");
        ctx.fill();
        ctx.strokeStyle = color + "cc";
        ctx.lineWidth = agent.id === "tessera" ? 2 : 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = "#e2e8f0";
        ctx.font = `bold ${agent.id === "tessera" ? 10 : 8}px JetBrains Mono, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(agent.name, x, y);
      });

      if (running) {
        animRef.current = requestAnimationFrame(draw);
      }
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [agents, running]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      className="w-full h-full rounded-xl"
      style={{ maxHeight: 400 }}
    />
  );
}

export default function SwarmVisualizationPage() {
  useEffect(() => { document.title = "Swarm Visualization | Tessera"; }, []);
  const [running, setRunning] = useState(true);
  const [agents] = useState(generateAgents());

  const totalTasks = agents.reduce((s, a) => s + a.tasks, 0);
  const avgLoad = Math.round(agents.reduce((s, a) => s + a.load, 0) / agents.length);
  const active = agents.filter(a => a.status !== "idle").length;

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <PageHeader icon={Network} title="Swarm Visualization" subtitle="Live multi-agent coordination and task distribution map" iconColor="text-violet-400" />
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
          { label: "Active Agents", val: `${active}/${agents.length}`, color: "emerald" },
          { label: "Total Tasks", val: totalTasks, color: "cyan" },
          { label: "Avg Load", val: `${avgLoad}%`, color: "violet" },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <div className={cn("text-xl font-bold font-mono", `text-${color}-400`)}>{val}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{label.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4">
        <div style={{ height: 420 }}>
          <SwarmCanvas agents={agents} running={running} />
        </div>
      </GlassCard>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {agents.map(agent => {
          const s = STATUS_COLORS[agent.status];
          return (
            <GlassCard key={agent.id} className="p-3 text-center">
              <div className={cn("text-xs font-bold font-mono mb-1", `text-[${AGENT_COLORS[agent.color]}]`)} style={{ color: AGENT_COLORS[agent.color] }}>
                {agent.name}
              </div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <div className={cn("w-1.5 h-1.5 rounded-full", s.bg, agent.status !== "idle" && "animate-pulse")} />
                <span className={cn("text-[9px] font-mono", s.text)}>{agent.status}</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500" style={{ width: `${agent.load}%` }} />
              </div>
              <div className="text-[8px] text-slate-600 font-mono mt-1">{agent.load}% · {agent.tasks} tasks</div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
