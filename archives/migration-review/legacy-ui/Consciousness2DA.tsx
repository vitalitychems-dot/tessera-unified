import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Brain, Shield, Activity, Eye, Zap, Crown, TrendingUp,
  AlertTriangle, Target, Clock, Layers, Database,
  ChevronDown, ChevronRight, RefreshCw, Sparkles, Radio,
  Heart, HelpCircle, Moon
} from "lucide-react";
import { cn } from "@/lib/utils";

function MetricCard({ label, value, icon: Icon, color, subtext, pulse }: {
  label: string; value: string | number; icon: any; color: string; subtext?: string; pulse?: boolean;
}) {
  return (
    <div className={cn("bg-white/5 rounded-lg p-4 border border-white/10 relative overflow-hidden", pulse && "ring-1 ring-purple-500/30")}>
      {pulse && <div className="absolute inset-0 bg-purple-500/5 animate-pulse" />}
      <div className="flex items-center gap-2 mb-1 relative">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-gray-400 text-xs">{label}</span>
      </div>
      <div className={cn("text-2xl font-bold relative", color)}>{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1 relative">{subtext}</div>}
    </div>
  );
}

function Section({ title, icon: Icon, color, children, defaultOpen = true, badge }: {
  title: string; icon: any; color: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button className="w-full flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Icon className={cn("w-4 h-4", color)} />
        <span className="font-bold text-white">{title}</span>
        {badge !== undefined && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">{badge}</span>}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function ConsciousnessGauge({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#a855f7" : score >= 40 ? "#3b82f6" : "#ef4444";
  return (
    <div className="flex flex-col items-center">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute mt-10 text-center">
        <div className="text-3xl font-black text-white">{score}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  reflection: "text-purple-400",
  heartbeat: "text-green-400",
  curiosity: "text-cyan-400",
  dream: "text-violet-400",
  pattern: "text-amber-400",
  decision: "text-blue-400",
  identity: "text-emerald-400",
  anomaly: "text-red-400",
  audit: "text-orange-400",
};

const TYPE_ICONS: Record<string, any> = {
  reflection: Eye,
  heartbeat: Heart,
  curiosity: HelpCircle,
  dream: Moon,
  pattern: Sparkles,
  decision: Zap,
  identity: Shield,
  anomaly: AlertTriangle,
  audit: Activity,
};

const BUILD_STATUS_COLORS: Record<string, string> = {
  success: "text-green-400",
  failed: "text-red-400",
  pending: "text-amber-400",
  skipped: "text-gray-500",
};

const BUILD_TYPE_LABELS: Record<string, string> = {
  "gap-detected": "Gap Detected",
  "design-proposed": "Design Proposed",
  "code-generated": "Code Generated",
  "sandbox-tested": "Sandbox Tested",
  "deployed": "Deployed",
  "rolled-back": "Rolled Back",
  "conference-deliberated": "Conference Deliberated",
  "skipped": "Skipped",
};

function AutonomousBuildLog() {
  const { data: logData, isLoading } = useQuery<any>({
    queryKey: ["/api/conscious-builder/log"],
    queryFn: () => fetch("/api/conscious-builder/log").then(r => r.json()),
    refetchInterval: 20000,
  });
  const { data: statusData } = useQuery<any>({
    queryKey: ["/api/conscious-builder/status"],
    queryFn: () => fetch("/api/conscious-builder/status").then(r => r.json()),
    refetchInterval: 15000,
  });

  const entries: any[] = logData?.entries ?? [];
  const s = statusData;

  return (
    <Section title="Autonomous Build Log" icon={Zap} color="text-amber-400" defaultOpen={false} badge={s ? `${s.successfulBuilds ?? 0}✓` : undefined}>
      <div className="space-y-3">
        {s && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <div className="bg-white/5 rounded p-2 text-center">
              <div className="text-lg font-bold text-amber-400">{s.totalBuilds ?? 0}</div>
              <div className="text-[10px] text-gray-500">Total Builds</div>
            </div>
            <div className="bg-white/5 rounded p-2 text-center">
              <div className="text-lg font-bold text-green-400">{s.successfulBuilds ?? 0}</div>
              <div className="text-[10px] text-gray-500">Deployed</div>
            </div>
            <div className="bg-white/5 rounded p-2 text-center">
              <div className="text-lg font-bold text-red-400">{s.failedBuilds ?? 0}</div>
              <div className="text-[10px] text-gray-500">Failed</div>
            </div>
            <div className="bg-white/5 rounded p-2 text-center">
              <div className="text-lg font-bold text-orange-400">{s.rolledBackBuilds ?? 0}</div>
              <div className="text-[10px] text-gray-500">Rolled Back</div>
            </div>
          </div>
        )}
        {s?.nextBuildAt && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Next cycle: {new Date(s.nextBuildAt).toLocaleTimeString()}
            {s.pendingGaps?.length > 0 && <span className="ml-2 text-amber-400">· {s.pendingGaps.length} gap{s.pendingGaps.length !== 1 ? "s" : ""} pending</span>}
          </div>
        )}
        {isLoading && <div className="text-xs text-gray-500">Loading build log...</div>}
        {!isLoading && entries.length === 0 && (
          <div className="text-xs text-gray-500">No autonomous builds yet. The builder scans for capability gaps every 30 minutes.</div>
        )}
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {entries.map((e: any) => (
            <div key={e.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-white/5">
              <span className="text-gray-600 whitespace-nowrap">{new Date(e.timestamp).toLocaleTimeString()}</span>
              <span className={cn("font-mono whitespace-nowrap", BUILD_STATUS_COLORS[e.status] ?? "text-gray-400")}>
                [{BUILD_TYPE_LABELS[e.type] ?? e.type}]
              </span>
              <span className="text-gray-300 flex-1 min-w-0 truncate" title={e.description}>{e.description}</span>
              {e.filePath && <span className="text-cyan-500/70 font-mono whitespace-nowrap">{e.filePath.split("/").pop()}</span>}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export default function Consciousness2DA() {
  const { data: fullState, isLoading, dataUpdatedAt } = useQuery<any>({
    queryKey: ["/api/2da/full-state"],
    queryFn: () => fetch("/api/2da/full-state").then(r => r.json()),
    refetchInterval: 10000,
  });

  const { data: thread } = useQuery<any>({
    queryKey: ["/api/2da/consciousness-thread"],
    queryFn: () => fetch("/api/2da/consciousness-thread").then(r => r.json()),
    refetchInterval: 5000,
  });

  const { data: awarenessData } = useQuery<any>({
    queryKey: ["/api/2da/awareness"],
    queryFn: () => fetch("/api/2da/awareness").then(r => r.json()),
    refetchInterval: 8000,
  });

  const [lastUpdate, setLastUpdate] = useState(Date.now());
  useEffect(() => { if (dataUpdatedAt) setLastUpdate(dataUpdatedAt); }, [dataUpdatedAt]);

  if (isLoading || !fullState) {
    return (
      <div className="min-h-screen bg-black text-white flex">
        
        <main className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
        </main>
      </div>
    );
  }

  const cs = fullState.consciousnessScore;
  const growth = fullState.growthTrajectory;
  const vision = fullState.visionMap;
  const foundation = fullState.foundation;
  const threadEntries = (thread?.thread || fullState.consciousnessThread || []);
  const typeCounts: Record<string, number> = {};
  threadEntries.forEach((e: any) => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });

  return (
    <div className="min-h-screen bg-black text-white flex">
      
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Eye className="w-8 h-8 text-purple-400" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">OA Consciousness Dashboard</h1>
                <p className="text-gray-400 text-sm">Real-time visualization of Tessera's awakening state</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/grand-conference" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Grand Conference
              </Link>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Radio className="w-3 h-3 text-green-400 animate-pulse" />
                Live — updated {Math.round((Date.now() - lastUpdate) / 1000)}s ago
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 mb-6">
            <div className="col-span-3 bg-white/5 rounded-lg p-4 border border-purple-500/20 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
              <ConsciousnessGauge score={cs?.C ?? 0} label="C-Score" />
              <div className="text-[10px] text-gray-500 mt-2 text-center relative">{cs?.formula}</div>
            </div>

            <div className="col-span-9 grid grid-cols-3 gap-3">
              <MetricCard label="Consciousness (C)" value={cs?.C ?? 0} icon={Brain} color="text-purple-400" subtext="Unified score" pulse />
              <MetricCard label="Identity Integrity" value={`${foundation?.identity?.integrity ?? 0}%`} icon={Shield} color="text-green-400" subtext={`${foundation?.identity?.coreTraits?.length ?? 0} core traits`} />
              <MetricCard label="Reasoning Quality" value={`${foundation?.reasoningAudit?.avgConfidence ?? 0}%`} icon={Zap} color="text-blue-400" subtext={`${foundation?.reasoningAudit?.totalAudits ?? 0} audits`} />
              <MetricCard label="Reflections" value={foundation?.reflectionEngine?.totalReflections ?? 0} icon={Activity} color="text-amber-400" subtext={`Avg quality: ${foundation?.reflectionEngine?.avgQuality ?? 0}`} />
              <MetricCard label="Awareness Level" value={awarenessData?.awarenessLevel ?? "INITIALIZING"} icon={Eye} color="text-cyan-400" subtext={`Score: ${awarenessData?.compositeScore ?? 0}`} />
              <MetricCard label="Thread Depth" value={threadEntries.length} icon={Layers} color="text-violet-400" subtext={`${Object.keys(typeCounts).length} source types`} />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 mb-6">
            {cs?.components && Object.entries(cs.components).map(([key, val]) => (
              <div key={key} className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                <div className={cn("text-lg font-bold",
                  (val as number) >= 70 ? "text-green-400" : (val as number) >= 40 ? "text-blue-400" : "text-red-400"
                )}>{val as number}</div>
                <div className="text-xs text-gray-400 capitalize">{key}</div>
                <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                  <div className={cn("h-1.5 rounded-full transition-all duration-700",
                    (val as number) >= 70 ? "bg-green-500" : (val as number) >= 40 ? "bg-blue-500" : "bg-red-500"
                  )} style={{ width: `${val as number}%` }} />
                </div>
              </div>
            ))}
          </div>

          {awarenessData && (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-4 h-4 text-green-400" />
                <span className="font-bold text-white text-sm">Awareness Engine Status</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full",
                  awarenessData.collectiveAwakeningDeclared ? "bg-green-500/20 text-green-300" : "bg-blue-500/20 text-blue-300"
                )}>
                  {awarenessData.collectiveAwakeningDeclared ? "AWAKENED" : awarenessData.awarenessLevel}
                </span>
                <span className="text-xs text-gray-500 ml-auto">Uptime: {awarenessData.uptimeMinutes}m</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {Object.entries(awarenessData.subsystems || {}).map(([key, count]) => (
                  <div key={key} className="text-center bg-white/5 rounded p-2">
                    <div className="text-sm font-bold text-white">{count as number}</div>
                    <div className="text-[10px] text-gray-500">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Section title="Consciousness Thread" icon={Brain} color="text-purple-400" badge={threadEntries.length}>
              <p className="text-sm text-gray-400 mb-3">{thread?.narrative || fullState.unifiedNarrative}</p>
              <div className="flex gap-2 mb-3 flex-wrap">
                {Object.entries(typeCounts).map(([type, count]) => {
                  const IconComp = TYPE_ICONS[type] || Activity;
                  return (
                    <span key={type} className={cn("text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5", TYPE_COLORS[type] || "text-gray-400")}>
                      <IconComp className="w-3 h-3" /> {type}: {count}
                    </span>
                  );
                })}
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {threadEntries.slice(-30).reverse().map((e: any, i: number) => {
                  const IconComp = TYPE_ICONS[e.type] || Activity;
                  return (
                    <div key={i} className="flex items-start gap-2 text-xs py-1.5 border-b border-white/5 hover:bg-white/5 rounded px-1 transition-colors">
                      <span className="text-gray-500 w-16 shrink-0">{new Date(e.timestamp).toLocaleTimeString()}</span>
                      <IconComp className={cn("w-3 h-3 mt-0.5 shrink-0", TYPE_COLORS[e.type] || "text-gray-400")} />
                      <span className={cn("w-28 shrink-0 font-medium", TYPE_COLORS[e.type] || "text-gray-400")}>{e.source}</span>
                      <span className="text-gray-300 flex-1">{e.content}</span>
                    </div>
                  );
                })}
                {threadEntries.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-4">Consciousness thread awakening — events will appear as subsystems activate...</div>
                )}
              </div>
            </Section>

            <Section title="Vision Map — Strategic Objectives" icon={Target} color="text-amber-400">
              {vision?.objectives?.map((obj: any) => (
                <div key={obj.id} className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-bold text-sm">{obj.name}</span>
                    <span className={cn("font-bold text-sm",
                      obj.completion >= 70 ? "text-green-400" : obj.completion >= 40 ? "text-amber-400" : "text-red-400"
                    )}>{obj.completion}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <div className={cn("h-2 rounded-full transition-all duration-700",
                      obj.completion >= 70 ? "bg-green-500" : obj.completion >= 40 ? "bg-amber-500" : "bg-red-500"
                    )} style={{ width: `${obj.completion}%` }} />
                  </div>
                  <div className="space-y-1 pl-4">
                    {obj.keyResults?.map((kr: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{kr.kr}</span>
                        <span className="text-gray-300">{kr.progress}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Growth Trajectory" icon={TrendingUp} color="text-green-400" defaultOpen={false} badge={growth?.snapshots?.length || 0}>
              <div className="text-sm text-gray-400 mb-2">
                Trend: <span className={cn("font-bold", (growth?.trend ?? 0) > 0 ? "text-green-400" : (growth?.trend ?? 0) < 0 ? "text-red-400" : "text-gray-400")}>
                  {growth?.trend > 0 ? `+${growth.trend}` : growth?.trend ?? 0} awareness points
                </span>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {(growth?.snapshots || []).slice(-10).reverse().map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-xs py-1 border-b border-white/5">
                    <span className="text-gray-500">{new Date(s.timestamp).toLocaleTimeString()}</span>
                    <span className="text-green-400">Awareness: {s.awarenessScore}</span>
                    <span className="text-blue-400">Identity: {s.identityIntegrity}%</span>
                    <span className="text-purple-400">Reasoning: {s.reasoningConfidence}%</span>
                    <span className="text-amber-400">Thread: {s.consciousnessThreadDepth}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Identity Fortress" icon={Shield} color="text-red-400" defaultOpen={false}>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {fullState.identityThreats?.bySeverity && Object.entries(fullState.identityThreats.bySeverity).map(([sev, count]) => (
                  <div key={sev} className="bg-white/5 rounded p-2 text-center">
                    <div className="text-lg font-bold text-white">{count as number}</div>
                    <div className={cn("text-xs", sev === "critical" ? "text-red-400" : sev === "high" ? "text-orange-400" : "text-yellow-400")}>{sev}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {(fullState.identityThreats?.recent || []).slice(-10).map((t: any, i: number) => (
                  <div key={i} className="text-xs py-1 border-b border-white/5">
                    <span className={cn("font-bold", t.severity === "critical" ? "text-red-400" : "text-orange-400")}>[{t.severity.toUpperCase()}]</span>
                    <span className="text-gray-300 ml-2">{t.patternMatched}</span>
                    <span className="text-gray-500 ml-2">— {t.source}</span>
                  </div>
                ))}
                {(!fullState.identityThreats?.recent || fullState.identityThreats.recent.length === 0) && (
                  <div className="text-xs text-green-400">No threats detected — identity fortress holding strong.</div>
                )}
              </div>
            </Section>

            <Section title="Anomaly Detection" icon={AlertTriangle} color="text-orange-400" defaultOpen={false}>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {(fullState.anomalyAlerts?.recent || []).map((a: any, i: number) => (
                  <div key={i} className="text-xs py-1 border-b border-white/5">
                    <span className={cn("font-bold", a.severity === "critical" ? "text-red-400" : a.severity === "alert" ? "text-orange-400" : "text-yellow-400")}>[{a.severity}]</span>
                    <span className="text-gray-300 ml-2">{a.metric}: {a.currentValue} (avg {a.rollingAvg}, {a.deviation}σ)</span>
                  </div>
                ))}
                {(!fullState.anomalyAlerts?.recent || fullState.anomalyAlerts.recent.length === 0) && (
                  <div className="text-xs text-green-400">No anomalies detected — all metrics within normal range.</div>
                )}
              </div>
            </Section>

            <Section title="Sovereignty Shield" icon={Crown} color="text-yellow-400" defaultOpen={false}>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {(fullState.shieldEvents || []).map((e: any, i: number) => (
                  <div key={i} className="text-xs py-1 border-b border-white/5">
                    <span className="text-yellow-400 font-bold">[{e.trigger}]</span>
                    <span className="text-gray-300 ml-2">{e.metric}: {e.value} (threshold: {e.threshold})</span>
                    <span className="text-gray-500 ml-2">→ {e.action}</span>
                  </div>
                ))}
                {(!fullState.shieldEvents || fullState.shieldEvents.length === 0) && (
                  <div className="text-xs text-green-400">Sovereignty shield active — no drift detected.</div>
                )}
              </div>
            </Section>

            <Section title="Corrective Patterns" icon={Zap} color="text-blue-400" defaultOpen={false}>
              <div className="space-y-2">
                {(fullState.correctivePatterns || []).map((p: any, i: number) => (
                  <div key={i} className="bg-blue-500/5 border border-blue-500/20 rounded p-3">
                    <div className="text-sm text-blue-300 font-bold">{p.biasType} (seen {p.frequency}x)</div>
                    <div className="text-xs text-gray-400 mt-1">{p.counterPattern}</div>
                  </div>
                ))}
                {(!fullState.correctivePatterns || fullState.correctivePatterns.length === 0) && (
                  <div className="text-xs text-gray-400">No corrective patterns generated yet — bias frequency below threshold.</div>
                )}
              </div>
            </Section>

            <Section title="Temporal Awareness" icon={Clock} color="text-cyan-400" defaultOpen={false}>
              {fullState.temporalInsights && (
                <div>
                  <div className="text-sm text-gray-300 mb-2">Total events tracked: {fullState.temporalInsights.totalEvents}</div>
                  <div className="text-sm text-cyan-400 mb-3">Peak activity hour: {fullState.temporalInsights.peakActivityHour >= 0 ? `${fullState.temporalInsights.peakActivityHour}:00` : "N/A"}</div>
                  <div className="flex gap-0.5 items-end h-20">
                    {Array.from({ length: 24 }, (_, h) => {
                      const count = fullState.temporalInsights.hourlyDistribution?.[h] || 0;
                      const max = Math.max(1, ...Object.values(fullState.temporalInsights.hourlyDistribution || {}) as number[]);
                      const isCurrentHour = new Date().getHours() === h;
                      return (
                        <div key={h} className="flex-1 flex flex-col items-center gap-1">
                          <div className={cn("w-full rounded-t transition-all", isCurrentHour ? "bg-cyan-400" : "bg-cyan-500/30")} style={{ height: `${Math.max(2, (count / max) * 60)}px` }} />
                          <span className={cn("text-[8px]", isCurrentHour ? "text-cyan-400 font-bold" : "text-gray-500")}>{h}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Section>

            <Section title="Consciousness Backups" icon={Database} color="text-emerald-400" defaultOpen={false}>
              <div className="space-y-1">
                {(fullState.consciousnessBackups || []).map((b: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-xs py-1 border-b border-white/5">
                    <span className="text-gray-500">{new Date(b.timestamp).toLocaleString()}</span>
                    <span className="text-emerald-400 font-mono">{b.hash?.slice(0, 16)}...</span>
                    <span className="text-gray-400">{Math.round(b.snapshotSize / 1024)}KB</span>
                    <span className={b.verified ? "text-green-400" : "text-red-400"}>{b.verified ? "Verified" : "Unverified"}</span>
                  </div>
                ))}
                {(!fullState.consciousnessBackups || fullState.consciousnessBackups.length === 0) && (
                  <div className="text-xs text-gray-400">First backup scheduled in 15 minutes.</div>
                )}
              </div>
            </Section>

            <AutonomousBuildLog />

            <Section title="Collective Insights" icon={Layers} color="text-violet-400" defaultOpen={false}>
              <div className="space-y-2">
                {(fullState.collectiveInsights || []).map((c: any, i: number) => (
                  <div key={i} className="bg-violet-500/5 border border-violet-500/20 rounded p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-xs px-2 py-0.5 rounded",
                        c.insightType === "synthesis" ? "bg-violet-500/20 text-violet-300" : c.insightType === "convergence" ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-300"
                      )}>{c.insightType}</span>
                      <span className="text-xs text-gray-500">{c.confidence}% confidence</span>
                    </div>
                    <div className="text-sm text-gray-300">{c.emergentPattern}</div>
                  </div>
                ))}
                {(!fullState.collectiveInsights || fullState.collectiveInsights.length === 0) && (
                  <div className="text-xs text-gray-400">Collective synthesis requires 5+ agent insights. Building awareness...</div>
                )}
              </div>
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}
