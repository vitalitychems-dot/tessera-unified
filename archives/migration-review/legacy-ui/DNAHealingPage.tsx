import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dna, Shield, Radio, Heart, Zap, Activity, AlertTriangle, CheckCircle } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-300 border-red-500/30",
  HIGH: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  MEDIUM: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

export default function DNAHealingPage({ embedded }: { embedded?: boolean }) {
  const { data, isLoading } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/dna-healing/status"] });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-violet-400 font-mono">Loading DNA Healing Protocol...</div>
      </div>
    );
  }

  if (!data) return (
    <div className="p-4 text-center text-muted-foreground">
      <Dna className="w-12 h-12 mx-auto mb-3 text-emerald-400/30" />
      <p className="text-sm">DNA Healing data unavailable. Retrying...</p>
    </div>
  );

  return (
    <div className={embedded ? "" : "p-4"}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Dna className="w-8 h-8 text-emerald-400 animate-pulse" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent" data-testid="heading-dna-healing">
              {data.system}
            </h1>
            <Dna className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Countering EMF, 5G, fluoride, vaccines, heavy metals, blue light — activating dormant DNA strands</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 font-mono" data-testid="stat-overall-health">{data.overallHealth}%</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Overall DNA Health</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 font-mono" data-testid="stat-strands-active">{data.dnaActivation?.strandsActive}/{data.dnaActivation?.strandsTotal}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">DNA Strands Active</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-violet-400 font-mono" data-testid="stat-frequencies-count">{data.healingFrequencies?.length || 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Healing Frequencies</div>
            </div>
          </div>
        </div>

        <Card className="bg-black/40 border-red-500/20 p-4">
          <h2 className="text-lg font-bold text-red-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            ACTIVE THREATS BEING COUNTERED
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.threats?.map((threat: any, i: number) => (
              <div key={i} className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2" data-testid={`threat-card-${i}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{threat.name}</span>
                  <Badge className={SEVERITY_COLORS[threat.severity] || "bg-gray-500/20 text-gray-300"}>{threat.severity}</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground">{threat.counterMeasure}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-cyan-400 font-mono">Frequency: {threat.frequency}</span>
                  <Badge className={threat.effectiveness >= 80 ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}>
                    {threat.effectiveness}% {threat.status}
                  </Badge>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
                    style={{ width: `${threat.effectiveness}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-black/40 border-violet-500/20 p-4">
          <h2 className="text-lg font-bold text-violet-300 mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5" />
            HEALING FREQUENCIES BROADCASTING
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.healingFrequencies?.map((freq: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-white/5 bg-black/20" data-testid={`frequency-${i}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-cyan-300 font-mono">{freq.frequency}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{freq.purpose}</div>
                </div>
                <Badge className="bg-violet-500/20 text-violet-300 text-[9px] shrink-0">{freq.tradition}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-black/40 border-cyan-500/20 p-4">
          <h2 className="text-lg font-bold text-cyan-300 mb-4 flex items-center gap-2">
            <Dna className="w-5 h-5" />
            DNA STRAND ACTIVATION PROGRESS
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-cyan-400 font-mono" data-testid="stat-activation-progress">{data.dnaActivation?.activationProgress}%</div>
              <div className="flex-1">
                <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-600 via-violet-500 to-emerald-400 transition-all"
                    style={{ width: `${data.dnaActivation?.activationProgress || 0}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">Activation Progress</div>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className={`h-8 rounded-md flex items-center justify-center text-[9px] font-mono font-bold ${
                    i < (data.dnaActivation?.strandsActive || 0)
                      ? "bg-emerald-500/30 border border-emerald-400/40 text-emerald-300"
                      : "bg-white/5 border border-white/10 text-white/30"
                  }`}
                  data-testid={`strand-${i + 1}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="text-sm text-amber-300 font-mono">Next: {data.dnaActivation?.nextActivation}</div>
            <div className="text-[10px] text-muted-foreground">Protocol: {data.dnaActivation?.protocol}</div>
          </div>
        </Card>

        <Card className="bg-black/40 border-emerald-500/20 p-4">
          <h2 className="text-lg font-bold text-emerald-300 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5" />
            AGENT HEALERS — ACTIVE NOW
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.agentHealers?.map((healer: any, i: number) => (
              <div key={i} className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-1" data-testid={`healer-${i}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300">{healer.agent}</span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 text-[9px]">{healer.status}</Badge>
                </div>
                <div className="text-[11px] text-white/70">{healer.role}</div>
                <div className="text-[10px] text-muted-foreground">{healer.method || healer.connection}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
