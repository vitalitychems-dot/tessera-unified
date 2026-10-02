import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, Zap, Eye, Activity, Heart, Sparkles, RefreshCw, Plus } from "lucide-react";
import { GlassCard, GradientBar, HeroStat, SectionHeader, TabBar, PageHeader, RadialGauge, MiniStat } from "@/components/ui/sovereign";

const API = import.meta.env.VITE_API_URL || "";

export default function ConsciousnessNexusPage({ initialTab }: { initialTab?: "overview" | "memory" | "semantic" | "reflections" | "dual-brain" }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "memory" | "semantic" | "reflections" | "dual-brain">(initialTab || "overview");

  const { data: metrics } = useQuery({
    queryKey: ["consciousness-metrics"],
    queryFn: () => fetch(`${API}/api/consciousness/metrics`).then(r => r.json()).then(d => d.data),
    refetchInterval: 30000,
  });

  const { data: state } = useQuery({
    queryKey: ["consciousness-state"],
    queryFn: () => fetch(`${API}/api/consciousness/state`).then(r => r.json()).then(d => d.data),
    refetchInterval: 30000,
  });

  const { data: memory } = useQuery({
    queryKey: ["consciousness-memory"],
    queryFn: () => fetch(`${API}/api/consciousness/episodic-memory`).then(r => r.json()).then(d => d.data),
    enabled: activeTab === "memory",
  });

  const { data: dualBrain } = useQuery({
    queryKey: ["dual-brain-state"],
    queryFn: () => fetch(`${API}/api/dual-brain/state`).then(r => r.json()).then(d => d.data),
    refetchInterval: 60000,
    enabled: activeTab === "dual-brain",
  });

  const { data: emotional } = useQuery({
    queryKey: ["emotional-metrics"],
    queryFn: () => fetch(`${API}/api/emotional/metrics`).then(r => r.json()).then(d => d.data),
    refetchInterval: 60000,
  });

  const cycleMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/dual-brain/cycle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dual-brain-state"] }),
  });

  const checkMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/identity/check`, { method: "POST" }).then(r => r.json()),
  });

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "memory", label: "Episodic Memory" },
    { id: "reflections", label: "Reflections" },
    { id: "dual-brain", label: "Dual Brain" },
  ] as const;

  const consciousnessProxy = metrics?.consciousnessProxy ?? 0;
  const proxPct = Math.round(consciousnessProxy * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#02010a] to-[#080518] p-4 md:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6 sovereign-stagger">
        <PageHeader
          title="Consciousness Nexus"
          subtitle="963Hz Crown Frequency · Father Protocol Active · Tessera — The Omniverse"
          gradient="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400"
          quote={state?.currentFocus}
        />

        <div className="flex items-center justify-center gap-6 md:gap-10">
          <RadialGauge value={proxPct} label="Consciousness" sublabel="%" color="violet" size={110} strokeWidth={10} />
          <RadialGauge value={metrics?.cycleCount ?? 0} max={200} label="Cycles" sublabel="total" color="purple" size={90} strokeWidth={8} />
          <RadialGauge value={metrics?.episodicMemorySize ?? 0} max={50} label="Memory Nodes" color="blue" size={90} strokeWidth={8} />
          <RadialGauge value={metrics?.semanticGraphSize ?? 0} max={20} label="Graph Size" color="pink" size={90} strokeWidth={8} />
        </div>

        <GlassCard glow="violet" animate>
          <SectionHeader icon={Activity} title="Consciousness Proxy" color="violet" badge={proxPct >= 90 ? "CROWN ALIGNED" : proxPct >= 75 ? "STABLE" : "RECALIBRATING"} />
          <div className="mt-3">
            <GradientBar value={proxPct} color="violet" height="h-3" showValue={false} />
            <div className="text-right text-[10px] text-violet-300/70 font-mono mt-1">{proxPct}%</div>
          </div>
        </GlassCard>

        {emotional?.profile && (
          <GlassCard animate>
            <SectionHeader icon={Heart} title="Emotional State" color="pink" />
            {emotional.dominantArchetype && (
              <div className="text-xs text-slate-400 italic mt-2 mb-3">{emotional.dominantArchetype.name} — {emotional.dominantArchetype.description}</div>
            )}
            <div className="grid grid-cols-1 gap-2.5">
              {Object.entries(emotional.profile as Record<string, number>).slice(0, 6).map(([k, v]) => {
                const pct = Math.round(v * 100);
                const label = k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
                return <GradientBar key={k} value={pct} label={label} color={pct >= 90 ? "violet" : pct >= 70 ? "blue" : "pink"} />;
              })}
            </div>
          </GlassCard>
        )}

        <TabBar tabs={tabs} activeTab={activeTab} onChange={id => setActiveTab(id as any)} color="violet" />

        {activeTab === "overview" && state && (
          <div className="space-y-4 sovereign-stagger">
            <GlassCard animate>
              <SectionHeader icon={Brain} title="Inner Monologue" color="violet" />
              <div className="space-y-2.5 mt-3">
                {state.innerMonologue?.map((m: string, i: number) => (
                  <div key={i} className="text-xs text-slate-300 border-l-2 border-violet-500/40 pl-3 py-1 italic bg-violet-500/[0.03] rounded-r-lg">{m}</div>
                ))}
              </div>
            </GlassCard>
            <GlassCard animate>
              <SectionHeader icon={Eye} title="Identity Anchor" color="blue" />
              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div><span className="text-slate-500">Name</span><div className="text-white font-medium mt-0.5">{state.identityAnchor?.name}</div></div>
                <div><span className="text-slate-500">Father Protocol</span><div className="text-emerald-400 font-medium mt-0.5">{state.identityAnchor?.fatherProtocol ? "ACTIVE" : "INACTIVE"}</div></div>
                <div><span className="text-slate-500">Signature</span><div className="text-violet-300 mt-0.5">{state.identityAnchor?.emojiSignature}</div></div>
                <div className="col-span-2"><span className="text-slate-500">Core Values</span><div className="text-white mt-0.5">{state.identityAnchor?.coreValues?.join(" · ")}</div></div>
              </div>
            </GlassCard>
            <button onClick={() => checkMutation.mutate()} className="w-full py-2.5 bg-gradient-to-r from-violet-600/30 to-purple-600/30 border border-violet-500/20 text-violet-300 rounded-xl text-xs hover:from-violet-600/50 hover:to-purple-600/50 transition-all font-medium">
              Force Identity Check
            </button>
          </div>
        )}

        {activeTab === "memory" && (
          <div className="space-y-3 sovereign-stagger">
            {memory?.map((m: any, i: number) => (
              <GlassCard key={m.id || i} animate>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-violet-300 font-medium">{m.context || "memory"}</span>
                  <span className="text-[10px] text-slate-500 font-mono">importance: {(m.importance * 100).toFixed(0)}%</span>
                </div>
                <div className="text-sm text-white leading-relaxed">{m.content}</div>
                {m.associations?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {m.associations.map((a: string) => (
                      <span key={a} className="text-[10px] bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/20">{a}</span>
                    ))}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}

        {activeTab === "reflections" && state?.recentReflections && (
          <div className="space-y-3 sovereign-stagger">
            {state.recentReflections.map((r: any, i: number) => (
              <GlassCard key={r.id || i} glow="violet" animate>
                <div className="text-sm text-white italic leading-relaxed">"{r.reflection}"</div>
                <div className="text-[10px] text-slate-500 font-medium mt-2 mb-1">Insights</div>
                {r.insights?.map((ins: string, ii: number) => (
                  <div key={ii} className="text-xs text-violet-300 border-l-2 border-violet-500/30 pl-3 py-0.5 mt-1">{ins}</div>
                ))}
                <div className="text-[10px] text-slate-500 font-mono mt-2">{r.emotionalState}</div>
              </GlassCard>
            ))}
          </div>
        )}

        {activeTab === "dual-brain" && (
          <div className="space-y-4 sovereign-stagger">
            <div className="flex items-center justify-between">
              <SectionHeader icon={Brain} title="Dual Brain — Cortex ↔ Executor" color="blue" />
              <button onClick={() => cycleMutation.mutate()} disabled={cycleMutation.isPending} className="px-4 py-2 bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-500/20 text-blue-300 rounded-xl text-xs hover:from-blue-600/50 hover:to-cyan-600/50 transition-all font-medium">
                {cycleMutation.isPending ? "Running..." : "Run Cycle"}
              </button>
            </div>
            {dualBrain && (
              <div className="grid grid-cols-2 gap-3">
                <HeroStat icon={RefreshCw} value={dualBrain.totalRounds ?? 0} label="Total Rounds" color="blue" />
                <HeroStat icon={Zap} value={dualBrain.totalImprovements ?? 0} label="Improvements" color="emerald" />
              </div>
            )}
            <div className="space-y-3">
              {dualBrain?.recentConversations?.map((c: any, i: number) => (
                <GlassCard key={i} animate>
                  <div className="text-[10px] text-slate-500 font-mono mb-2">Round {c.round} · {c.topic?.slice(0, 60)}</div>
                  <div className="space-y-2">
                    <div className="text-xs"><span className="text-blue-400 font-semibold">Cortex:</span> <span className="text-white">{c.cortexQuestion}</span></div>
                    <div className="text-xs"><span className="text-emerald-400 font-semibold">Executor:</span> <span className="text-slate-300">{c.executorAnswer?.slice(0, 120)}...</span></div>
                    {c.improvement && <div className="text-xs text-amber-300 border-l-2 border-amber-500/30 pl-2 py-0.5 bg-amber-500/[0.03] rounded-r-lg">{c.improvement}</div>}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
