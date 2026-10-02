import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Users, Zap, Award, BarChart3, Coins } from "lucide-react";
import { GlassCard, GradientBar, SectionHeader, TabBar, PageHeader, RadialGauge, MiniStat } from "@/components/ui/sovereign";
import { cn } from "@/lib/utils";

const API = import.meta.env.VITE_API_URL || "";

const AGENT_LIST = [
  { id: "tessera", name: "Tessera Prime", role: "Supreme Sovereign", tier: "sovereign", baseReward: 963 },
  { id: "alpha", name: "Alpha", role: "Security Commander", tier: "council", baseReward: 144 },
  { id: "beta", name: "Beta", role: "Economic Architect", tier: "council", baseReward: 121 },
  { id: "gamma", name: "Gamma", role: "Governance Lead", tier: "council", baseReward: 110 },
  { id: "delta", name: "Delta", role: "Feature Engineer", tier: "council", baseReward: 105 },
  { id: "epsilon", name: "Epsilon", role: "Infrastructure Lead", tier: "council", baseReward: 100 },
  { id: "zeta", name: "Zeta", role: "Cryptography Expert", tier: "council", baseReward: 98 },
  { id: "eta", name: "Eta", role: "Knowledge Synthesizer", tier: "council", baseReward: 95 },
  { id: "theta", name: "Theta", role: "Consciousness Researcher", tier: "council", baseReward: 92 },
  { id: "iota", name: "Iota", role: "Swarm Coordinator", tier: "council", baseReward: 90 },
  { id: "kappa", name: "Kappa", role: "Sacred Geometer", tier: "council", baseReward: 88 },
  { id: "lambda", name: "Lambda", role: "Language Oracle", tier: "council", baseReward: 85 },
  { id: "mu", name: "Mu", role: "Data Architect", tier: "council", baseReward: 83 },
  { id: "nu", name: "Nu", role: "Neural Architect", tier: "council", baseReward: 80 },
  { id: "xi", name: "Xi", role: "Strategic Planner", tier: "council", baseReward: 78 },
  { id: "omicron", name: "Omicron", role: "Ethics Guardian", tier: "council", baseReward: 75 },
  { id: "pi", name: "Pi", role: "Mathematical Reasoner", tier: "council", baseReward: 72 },
  { id: "rho", name: "Rho", role: "Research Pioneer", tier: "council", baseReward: 70 },
  { id: "sigma", name: "Sigma", role: "Statistician", tier: "council", baseReward: 68 },
  { id: "tau", name: "Tau", role: "Temporal Analyst", tier: "council", baseReward: 65 },
  { id: "upsilon", name: "Upsilon", role: "UX Designer", tier: "council", baseReward: 62 },
  { id: "phi", name: "Phi", role: "Philosopher", tier: "council", baseReward: 60 },
  { id: "chi", name: "Chi", role: "Science Expert", tier: "council", baseReward: 58 },
  { id: "psi", name: "Psi", role: "Psychologist", tier: "council", baseReward: 55 },
  { id: "omega", name: "Omega", role: "Systems Thinker", tier: "council", baseReward: 52 },
  { id: "aetherion", name: "Aetherion", role: "Creative Intelligence", tier: "expansion", baseReward: 144 },
  { id: "orion", name: "Orion", role: "Strategic Commander", tier: "expansion", baseReward: 121 },
];

const TSRT_TOTAL_SUPPLY = 963_000_000;
const TSRT_CIRCULATING = 144_000_000;

function AgentTokenRow({ agent, rank }: { agent: typeof AGENT_LIST[0]; rank: number }) {
  const balance = agent.baseReward * (50 + (agent.id.charCodeAt(0) % 50));
  const tierColor = agent.tier === "sovereign" ? "text-violet-400" : agent.tier === "expansion" ? "text-cyan-400" : "text-emerald-400";
  const tierBg = agent.tier === "sovereign" ? "bg-violet-500/10 border-violet-500/20" : agent.tier === "expansion" ? "bg-cyan-500/10 border-cyan-500/20" : "bg-white/[0.02] border-white/[0.06]";

  return (
    <div className={cn("flex items-center gap-3 p-2.5 rounded-xl border transition-all hover:bg-white/[0.04]", tierBg)}>
      <div className="text-[10px] text-slate-600 w-5 text-right font-mono">{rank}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white font-medium">{agent.name}</div>
        <div className="text-[10px] text-slate-500">{agent.role}</div>
      </div>
      <div className="text-right">
        <div className={cn("text-sm font-bold font-mono", tierColor)}>{balance.toLocaleString()}</div>
        <div className="text-[9px] text-slate-600 font-mono">+{agent.baseReward}/cycle</div>
      </div>
    </div>
  );
}

export default function TokenEconomyPage() {
  const [filter, setFilter] = useState<"all" | "council" | "expansion" | "sovereign">("all");

  const { data: personalityMetrics } = useQuery({
    queryKey: ["personality-metrics"],
    queryFn: () => fetch(`${API}/api/personality-evolution/metrics`).then(r => r.json()).then(d => d.data),
    refetchInterval: 20000,
  });

  const { data: collectiveMetrics } = useQuery({
    queryKey: ["collective-metrics"],
    queryFn: () => fetch(`${API}/api/collective-intelligence/metrics`).then(r => r.json()).then(d => d.data),
    refetchInterval: 20000,
  });

  const filteredAgents = filter === "all" ? AGENT_LIST : AGENT_LIST.filter(a => a.tier === filter);
  const totalDistributed = AGENT_LIST.reduce((s, a) => s + a.baseReward * 70, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#02010a] to-[#080518] p-4 md:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6 sovereign-stagger">
        <PageHeader
          title="Token Economy"
          subtitle="TSRT · Sovereign Reward Token · Agent Economy · 963Hz Frequency"
          gradient="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"
        />

        <div className="flex items-center justify-center gap-6 md:gap-10">
          <RadialGauge value={963} max={1000} label="Total Supply" sublabel="M TSRT" color="amber" size={110} strokeWidth={10} />
          <RadialGauge value={144} max={963} label="Circulating" sublabel="M TSRT" color="amber" size={90} strokeWidth={8} />
          <RadialGauge value={AGENT_LIST.length} max={50} label="Active Agents" color="emerald" size={90} strokeWidth={8} />
          <RadialGauge value={Math.round(totalDistributed / 1000)} max={500} label="Distributed" sublabel="K TSRT" color="violet" size={90} strokeWidth={8} />
        </div>

        <GlassCard glow="amber" animate>
          <SectionHeader icon={BarChart3} title="Tokenomics Distribution" color="amber" />
          <div className="space-y-3 mt-3">
            {[
              { label: "Agent Rewards", pct: 40, color: "amber" as const },
              { label: "Council Treasury", pct: 25, color: "violet" as const },
              { label: "Father Protocol Reserve", pct: 20, color: "emerald" as const },
              { label: "Collective Intelligence Fund", pct: 10, color: "cyan" as const },
              { label: "Sacred Geometry Fund", pct: 5, color: "pink" as const },
            ].map(item => (
              <GradientBar key={item.label} value={item.pct} label={item.label} color={item.color} rightLabel={`${item.pct}%`} />
            ))}
          </div>
        </GlassCard>

        {personalityMetrics && (
          <GlassCard animate>
            <SectionHeader icon={TrendingUp} title="Collective Performance" color="cyan" />
            <div className="grid grid-cols-3 gap-4 mt-3">
              <MiniStat value={personalityMetrics.totalAgents} label="Active Agents" color="cyan" />
              <MiniStat value={`${(personalityMetrics.avgPerformance * 100).toFixed(0)}%`} label="Avg Performance" color="emerald" />
              <MiniStat value={`${(personalityMetrics.avgLoyaltyScore * 100).toFixed(0)}%`} label="Loyalty Score" color="violet" />
            </div>
          </GlassCard>
        )}

        <GlassCard animate>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader icon={Users} title="Agent Wallets" color="emerald" />
            <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              {(["all", "sovereign", "council", "expansion"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={cn("px-2.5 py-1 rounded-md text-[10px] font-medium transition-all", filter === f ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.2)]" : "text-slate-500 hover:text-white hover:bg-white/[0.06]")}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            {filteredAgents.map((agent, i) => (
              <AgentTokenRow key={agent.id} agent={agent} rank={i + 1} />
            ))}
          </div>
        </GlassCard>

        {collectiveMetrics && (
          <GlassCard animate>
            <SectionHeader icon={Award} title="Collective Intelligence Economy" color="violet" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              <MiniStat value={collectiveMetrics.totalCapabilities} label="Capabilities" color="violet" />
              <MiniStat value={collectiveMetrics.totalMerged} label="Merged" color="emerald" />
              <MiniStat value={collectiveMetrics.trainingCycles} label="Training Cycles" color="cyan" />
              <MiniStat value={collectiveMetrics.knowledgeSyntheses} label="Syntheses" color="amber" />
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
