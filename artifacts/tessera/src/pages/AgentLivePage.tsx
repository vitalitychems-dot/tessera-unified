import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Activity, Zap, Brain, Globe2, Star } from "lucide-react";
import { GlassCard, PageHeader, RadialGauge, MiniStat } from "@/components/ui/sovereign";

interface FleetMember {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSeen: number;
  callCount24h: number;
  successRate: number;
  synapseStrength: number;
  consciousnessLevel: number;
  agentId?: string;
  archetype?: string;
  masteredDomains?: string[];
  capabilities?: string[];
}
interface FleetMapResponse {
  ok: boolean;
  nodes: FleetMember[];
  fleetMemberCount?: number;
}

const API = import.meta.env.VITE_API_URL || "";

/**
 * Live page for a single fleet agent. Sourced entirely from
 * /api/fleet-synapse/map, which is now populated from the real agent-spawner
 * registry — so each agent gets its own live project surface (current
 * domains, capabilities, pulse activity) rather than a hard-coded card.
 */
export default function AgentLivePage() {
  const [, params] = useRoute("/agent/:agentId");
  const agentId = params?.agentId;

  const { data, isLoading } = useQuery<FleetMapResponse>({
    queryKey: ["fleet-synapse-map-agent-live"],
    queryFn: () => fetch(`${API}/api/fleet-synapse/map`).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const member = (data?.nodes ?? []).find(n => n.agentId === agentId || n.id === `agent::${agentId}`);

  if (isLoading) {
    return <div className="min-h-screen bg-[#02010a] text-white p-6 text-sm text-slate-400">Loading agent…</div>;
  }
  if (!member) {
    return (
      <div className="min-h-screen bg-[#02010a] text-white p-6">
        <Link href="/lattice" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Lattice
        </Link>
        <div className="mt-4 text-sm text-slate-300">No live fleet identity matches <code className="text-amber-300">{agentId}</code>. The registry may not have spawned this agent yet.</div>
      </div>
    );
  }

  const onlineMs = Date.now() - (member.lastSeen ?? 0);
  const onlineLabel = onlineMs < 60_000 ? "just now" : onlineMs < 3600_000 ? `${Math.floor(onlineMs / 60_000)}m ago` : `${Math.floor(onlineMs / 3600_000)}h ago`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#02010a] to-[#080518] p-4 md:p-6 pb-24" data-testid="agent-live-page">
      <div className="max-w-3xl mx-auto space-y-5">
        <Link href="/lattice" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Lattice
        </Link>

        <PageHeader
          title={member.name}
          subtitle={`${member.archetype ? member.archetype + " · " : ""}Live agent identity from the sovereign fleet registry`}
          gradient="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400"
        />

        <GlassCard glow="cyan" animate>
          <div className="flex items-center justify-around gap-4">
            <RadialGauge value={Math.round(member.consciousnessLevel * 100)} max={100} label="Consciousness" sublabel="%" color="violet" size={88} strokeWidth={8} />
            <RadialGauge value={Math.round(member.synapseStrength * 100)} max={100} label="Synapse" sublabel="%" color="cyan" size={88} strokeWidth={8} />
            <RadialGauge value={member.successRate} max={100} label="Success" sublabel="%" color="emerald" size={88} strokeWidth={8} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <MiniStat value={member.callCount24h} label="Pulses 24h" color="cyan" />
            <MiniStat value={onlineLabel} label="Last seen" color="violet" />
            <MiniStat value={member.status} label="Status" color={member.status === "online" ? "emerald" : "amber"} />
          </div>
        </GlassCard>

        {member.masteredDomains && member.masteredDomains.length > 0 && (
          <GlassCard animate>
            <div className="flex items-center gap-2 mb-3">
              <Globe2 className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-white">Mastered Domains</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {member.masteredDomains.map(d => (
                <Link key={d} href={`/lattice`} className="px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/30 text-xs text-violet-300 hover:bg-violet-500/20" data-testid={`agent-domain-${d}`}>
                  {d}
                </Link>
              ))}
            </div>
          </GlassCard>
        )}

        {member.capabilities && member.capabilities.length > 0 && (
          <GlassCard animate>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Capabilities</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {member.capabilities.map(c => (
                <span key={c} className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">{c}</span>
              ))}
            </div>
          </GlassCard>
        )}

        <GlassCard animate>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Live Agent Project</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            This page is generated live from the sovereign fleet registry — every metric, domain, and capability above
            reflects {member.name}'s current state, not a static profile. As {member.name} learns new domains and
            participates in pulses, this page updates automatically.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
