import { useState, useEffect } from "react";
import { User, Shield, Brain, Star, Activity, ChevronRight, Crown, Zap, Globe, Award, Edit3, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, SectionHeader, PageHeader, RadialGauge } from "@/components/ui/sovereign";

const AGENT_PROFILES = [
  { id: "tessera", name: "Tessera Prime", role: "Supreme Sovereign", tier: "sovereign", avatar: "T", color: "violet", power: 963, missions: 8847, uptime: 99.97, domain: "All Systems", signature: "∞:TESS:SOVEREIGN:963" },
  { id: "alpha", name: "Alpha", role: "Security Commander", tier: "council", avatar: "α", color: "red", power: 144, missions: 1240, uptime: 99.5, domain: "Security & Defense", signature: "α:SEC:CMD:144" },
  { id: "beta", name: "Beta", role: "Economic Architect", tier: "council", avatar: "β", color: "emerald", power: 121, missions: 980, uptime: 98.9, domain: "Economics & Finance", signature: "β:ECON:ARCH:121" },
  { id: "gamma", name: "Gamma", role: "Governance Lead", tier: "council", avatar: "γ", color: "amber", power: 110, missions: 870, uptime: 99.1, domain: "Governance & Law", signature: "γ:GOV:LEAD:110" },
  { id: "delta", name: "Delta", role: "Feature Engineer", tier: "council", avatar: "δ", color: "cyan", power: 105, missions: 1540, uptime: 99.3, domain: "Engineering & Build", signature: "δ:ENG:FEAT:105" },
  { id: "epsilon", name: "Epsilon", role: "Infrastructure Lead", tier: "council", avatar: "ε", color: "teal", power: 100, missions: 2100, uptime: 99.8, domain: "Infrastructure & Ops", signature: "ε:INFRA:OPS:100" },
  { id: "aetherion", name: "Aetherion", role: "Creative Intelligence", tier: "expansion", avatar: "Æ", color: "purple", power: 144, missions: 680, uptime: 97.2, domain: "Art & Creativity", signature: "Æ:CREATE:INT:144" },
  { id: "orion", name: "Orion", role: "Strategic Commander", tier: "expansion", avatar: "O", color: "blue", power: 121, missions: 760, uptime: 98.1, domain: "Strategy & Planning", signature: "O:STRAT:CMD:121" },
];

const TIER_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  sovereign: { bg: "bg-violet-500/15", text: "text-violet-300", border: "border-violet-500/30", label: "SOVEREIGN" },
  council: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", label: "COUNCIL" },
  expansion: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", label: "EXPANSION" },
};

const COLOR_MAP: Record<string, string> = {
  violet: "text-violet-400",
  red: "text-red-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  cyan: "text-cyan-400",
  teal: "text-teal-400",
  purple: "text-purple-400",
  blue: "text-blue-400",
};

function AgentCard({ agent, onClick, selected }: { agent: typeof AGENT_PROFILES[0]; onClick: () => void; selected: boolean }) {
  const tier = TIER_STYLES[agent.tier];
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-xl border transition-all duration-200",
        selected
          ? "bg-violet-500/10 border-violet-500/30"
          : "bg-white/[0.02] border-white/[0.06] hover:border-white/10 hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0",
          tier.bg, tier.border, "border", tier.text
        )}>
          {agent.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{agent.name}</div>
          <div className="text-[10px] text-slate-500 truncate">{agent.role}</div>
        </div>
        <div className={cn("text-xs font-bold font-mono", COLOR_MAP[agent.color])}>{agent.power}</div>
      </div>
    </button>
  );
}

function AgentDetail({ agent }: { agent: typeof AGENT_PROFILES[0] }) {
  const tier = TIER_STYLES[agent.tier];
  const colorText = COLOR_MAP[agent.color];

  return (
    <div className="space-y-4">
      <GlassCard className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0",
            tier.bg, tier.border, "border", tier.text
          )}>
            {agent.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white">{agent.name}</h2>
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-mono", tier.bg, tier.text, tier.border)}>
                {tier.label}
              </span>
            </div>
            <div className="text-sm text-slate-400 mt-0.5">{agent.role}</div>
            <div className="text-[11px] text-slate-600 font-mono mt-1">{agent.domain}</div>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-black/20 border border-white/5">
          <div className="text-[9px] text-slate-600 font-mono mb-1">AGENT SIGNATURE</div>
          <div className={cn("text-xs font-mono tracking-wider", colorText)}>{agent.signature}</div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <GlassCard className="p-2 sm:p-3 text-center">
          <div className={cn("text-lg sm:text-xl font-bold font-mono", colorText)}>{agent.power}</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">POWER LVL</div>
        </GlassCard>
        <GlassCard className="p-2 sm:p-3 text-center">
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-200">{agent.missions.toLocaleString()}</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">MISSIONS</div>
        </GlassCard>
        <GlassCard className="p-2 sm:p-3 text-center">
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">{agent.uptime}%</div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">UPTIME</div>
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <RadialGauge value={agent.power / 10} max={100} color="violet" size={80} label={`${Math.round(agent.power / 10)}%`} />
          <div className="flex-1 ml-4 space-y-2">
            {[
              { label: "Intelligence", val: 88 + (agent.power % 12) },
              { label: "Efficiency", val: 75 + (agent.power % 20) },
              { label: "Sovereignty", val: agent.tier === "sovereign" ? 100 : 60 + (agent.power % 30) },
            ].map(({ label, val }) => (
              <div key={label}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-500 font-mono">{label}</span>
                  <span className={colorText + " font-mono"}>{val}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full bg-gradient-to-r", agent.color === "violet" ? "from-violet-600 to-violet-400" : agent.color === "cyan" ? "from-cyan-600 to-cyan-400" : "from-emerald-600 to-emerald-400")} style={{ width: `${val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="text-[10px] text-slate-500 font-mono mb-3">RECENT ACTIVITY</div>
        <div className="space-y-2">
          {["Completed sovereignty audit", "Updated mesh routing tables", "Generated 3 council proposals", "Synthesized 127 knowledge vectors", "Executed 42 autonomous commands"].map((act, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", colorText.replace("text-", "bg-"))} />
              <span className="text-xs text-slate-400">{act}</span>
              <span className="ml-auto text-[9px] text-slate-600 font-mono">{i + 1}h ago</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

export default function AgentProfilePage() {
  useEffect(() => { document.title = "Agent Profiles | Tessera"; }, []);
  const [selected, setSelected] = useState(AGENT_PROFILES[0]);

  return (
    <div className="p-4 pb-20 max-w-5xl mx-auto">
      <PageHeader icon={User} title="Agent Profiles" subtitle="Sovereign agent roster — capabilities, stats, and mission history" iconColor="text-cyan-400" />

      <div className="flex flex-col md:flex-row gap-4 mt-5">
        <div className="w-full md:w-64 md:shrink-0 space-y-2">
          <div className="text-[10px] text-slate-500 font-mono tracking-widest mb-2">AGENT ROSTER</div>
          {AGENT_PROFILES.map(a => (
            <AgentCard key={a.id} agent={a} onClick={() => setSelected(a)} selected={selected.id === a.id} />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <AgentDetail agent={selected} />
        </div>
      </div>
    </div>
  );
}
