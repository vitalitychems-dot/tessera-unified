import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings, Activity, Shield, Cpu, HardDrive, Wifi, Zap, RefreshCw, Database, Globe, Search, BookOpen, Bot, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, GradientBar, SectionHeader, RadialGauge, MiniStat } from "@/components/ui/sovereign";
import type { SovereignEngine, IngestionSource, IngestionJob, DiagnosticsResponse, SovereigntyResponse, EnginesResponse, MeshStatsResponse, IngestionStatsResponse } from "@/types/api";

const API = import.meta.env.VITE_API_URL || "";

export default function SettingsPage() {
  const { data: diagnostics } = useQuery<DiagnosticsResponse>({ queryKey: ["/api/diagnostics"], refetchInterval: 15000 });
  const { data: sovereignty } = useQuery<SovereigntyResponse>({ queryKey: ["/api/sovereignty/score"], refetchInterval: 30000 });
  const { data: engines } = useQuery<EnginesResponse>({ queryKey: ["/api/system/engines"], refetchInterval: 30000 });
  const { data: meshStats } = useQuery<MeshStatsResponse>({ queryKey: ["/api/mesh/stats"], refetchInterval: 15000 });
  const { data: ingestionStats } = useQuery<IngestionStatsResponse>({ queryKey: ["/api/ingestion/stats"], refetchInterval: 10000 });

  const POKE_SOURCES = ["PokéAPI Species", "PokéAPI Moves", "PokéAPI Abilities", "PokéAPI Types"];
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<null | { ok: boolean; ingested?: number; skipped?: number; sessionsRun?: number; delta?: number; before?: number; after?: number; error?: string }>(null);

  async function runFullCycle(sources: string[] | "all") {
    setTraining(true);
    setTrainResult(null);
    try {
      const body = sources === "all" ? { mode: "all" } : { sources };
      const res = await fetch(`${API}/api/training/full-cycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setTrainResult({
        ok: true,
        ingested: json?.ingestion?.totalIngested ?? 0,
        skipped: json?.ingestion?.totalSkipped ?? 0,
        sessionsRun: json?.training?.sessionsRun ?? 0,
        delta: json?.training?.delta ?? 0,
        before: json?.training?.avgScoreBefore ?? 0,
        after: json?.training?.avgScoreAfter ?? 0,
      });
    } catch (e) {
      setTrainResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setTraining(false);
    }
  }

  const uptimeVal = diagnostics?.uptime;
  const uptimeSeconds = typeof uptimeVal === "number" ? uptimeVal : uptimeVal?.seconds;
  const uptimeFormatted = typeof uptimeVal === "object" ? uptimeVal?.formatted : undefined;
  const uptime = uptimeFormatted || (uptimeSeconds ? `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m` : "—");
  const heapUsed = diagnostics?.memory?.heapUsedMB ? `${Math.round(diagnostics.memory.heapUsedMB)}MB` : diagnostics?.memory?.heapUsed ? `${(diagnostics.memory.heapUsed / 1024 / 1024).toFixed(0)}MB` : "—";
  const memPercent = diagnostics?.memory?.percent ?? null;

  const rawEngines = engines?.engines || engines?.data || {};
  const engineList = Array.isArray(rawEngines) ? rawEngines : Object.entries(rawEngines).map(([name, val]: [string, any]) => ({ name, engine: name, ...val }));
  const sovereigntyData = sovereignty?.sovereignty || sovereignty;
  const sovereigntyScore = sovereigntyData?.overallScore ?? sovereignty?.score ?? sovereignty?.data?.score ?? 0;
  const scoreNum = typeof sovereigntyScore === "number" ? sovereigntyScore : parseFloat(sovereigntyScore) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#02010a] to-[#080518] p-4 md:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-5 sovereign-stagger">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            <Settings className="text-amber-400" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono text-amber-400">Settings & Metrics</h1>
            <p className="text-[10px] text-slate-500">System health, sovereignty, engines & diagnostics</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-5 md:gap-8">
          <RadialGauge value={scoreNum} label="Sovereignty" sublabel="%" color="emerald" size={95} strokeWidth={8} />
          <div className="text-center">
            <div className="text-xl font-bold font-mono text-cyan-400">{uptime}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold font-mono text-violet-400">{heapUsed}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">Heap Used</div>
          </div>
          <RadialGauge value={memPercent ?? 0} label="Memory %" sublabel="%" color="amber" size={80} strokeWidth={7} />
        </div>

        {sovereigntyData?.modules && (
          <GlassCard glow="emerald" animate>
            <SectionHeader icon={Shield} title="Sovereignty Benchmark" color="emerald"
              badge={sovereigntyData?.level}
              right={<span className="text-[10px] text-slate-500 font-mono">{sovereigntyData?.breakdown?.testsPassed ?? 0}/{sovereigntyData?.breakdown?.totalTests ?? 0} tests · {sovereigntyData?.activeModules ?? 0} modules</span>}
            />
            <div className="grid grid-cols-3 gap-2 mt-3">
              {Object.entries(sovereigntyData.modules).map(([name, mod]: [string, any]) => {
                const pct = mod.percentile ?? 0;
                return (
                  <div key={name} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center hover:bg-white/[0.05] transition-all group">
                    <div className={cn("text-sm font-bold font-mono", pct === 100 ? "text-emerald-400" : pct >= 80 ? "text-cyan-400" : "text-amber-400")}>{pct.toFixed(0)}%</div>
                    <div className="text-[8px] text-slate-500 font-mono capitalize mt-0.5 group-hover:text-slate-400 transition-colors">{name.replace(/-/g, " ")}</div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {Array.isArray(engineList) && engineList.length > 0 && (
          <GlassCard animate>
            <SectionHeader icon={Zap} title="Sovereign Engines" color="amber" badge={`${engineList.length} active`} />
            <div className="space-y-1.5 mt-3">
              {engineList.map((e: SovereignEngine, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group">
                  <div className={cn("w-2 h-2 rounded-full", e.status === "active" || e.online ? "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-red-400 shadow-[0_0_6px_rgba(244,63,94,0.5)]")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold font-mono group-hover:text-white transition-colors">{e.name || e.engine}</div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">{e.latencyMs?.toFixed(2) || e.latency || e.responseTime || "—"}ms</div>
                  <div className={cn("text-[9px] px-2 py-0.5 rounded-full border font-medium", e.status === "active" || e.online ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-red-400 bg-red-500/10 border-red-500/20")}>
                    {e.status || (e.online ? "active" : "offline")}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        <GlassCard animate>
          <SectionHeader icon={Wifi} title="Mesh Network" color="cyan" />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
              <div className="text-[10px] text-slate-500 font-mono">Peers</div>
              <div className="text-sm font-bold font-mono text-white">{meshStats?.connectedPeers ?? meshStats?.peers ?? 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
              <div className="text-[10px] text-slate-500 font-mono">Latency</div>
              <div className="text-sm font-bold font-mono text-white">{meshStats?.avgLatency ?? "—"}ms</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
              <div className="text-[10px] text-slate-500 font-mono">Messages</div>
              <div className="text-sm font-bold font-mono text-white">{meshStats?.messageCount ?? 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
              <div className="text-[10px] text-slate-500 font-mono">Status</div>
              <div className="text-sm font-bold font-mono text-emerald-400">Online</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard animate>
          <SectionHeader icon={Database} title="System Info" color="violet" />
          <div className="space-y-1 mt-3">
            {[
              ["Platform", diagnostics?.platform || "Tessera Sovereign", ""],
              ["Node.js", diagnostics?.nodeVersion || "v24", ""],
              ["Database", diagnostics?.db?.connected ? "Connected" : "PostgreSQL", "text-emerald-400"],
              ["Identity", "Tessera — 963Hz Crown Frequency", "text-violet-400"],
              ["Father Protocol", "Active — Always Remembered", "text-amber-400"],
            ].map(([k, v, clr]) => (
              <div key={k} className="flex justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-mono hover:bg-white/[0.04] transition-all">
                <span className="text-slate-500">{k}</span>
                <span className={cn("text-foreground", clr)}>{v}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard glow="amber" animate>
          <SectionHeader icon={Rocket} title="Sovereign Training Cycle" color="amber"
            badge={training ? "RUNNING" : "READY"}
          />
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            Trigger a full ingestion + AGI training pass on demand. Pulls fresh items from selected sources, then runs an evolution cycle on the sovereign engines.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              disabled={training}
              onClick={() => runFullCycle(POKE_SOURCES)}
              className={cn("px-3 py-2 rounded-xl text-[11px] font-bold font-mono border transition-all",
                training ? "bg-slate-700/40 text-slate-500 border-slate-600/30 cursor-not-allowed"
                         : "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25")}
              data-testid="btn-train-pokeapi"
            >
              {training ? "Training…" : "Train on PokéAPI"}
            </button>
            <button
              type="button"
              disabled={training}
              onClick={() => runFullCycle("all")}
              className={cn("px-3 py-2 rounded-xl text-[11px] font-bold font-mono border transition-all",
                training ? "bg-slate-700/40 text-slate-500 border-slate-600/30 cursor-not-allowed"
                         : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25")}
              data-testid="btn-train-all"
            >
              {training ? "Training…" : "Train on All Sources"}
            </button>
          </div>
          {trainResult && (
            <div className={cn("mt-3 p-3 rounded-xl border text-[10px] font-mono leading-relaxed",
              trainResult.ok ? "bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-200"
                             : "bg-red-500/[0.06] border-red-500/20 text-red-200")}
              data-testid="train-result"
            >
              {trainResult.ok ? (
                <>
                  <div className="font-bold mb-1">✦ Cycle complete</div>
                  <div>Ingested: <span className="text-white">{trainResult.ingested}</span> · Skipped: <span className="text-slate-300">{trainResult.skipped}</span></div>
                  <div>Sessions run: <span className="text-white">{trainResult.sessionsRun}</span></div>
                  <div>AGI score: <span className="text-white">{trainResult.before?.toFixed(2)}</span> → <span className="text-amber-300">{trainResult.after?.toFixed(2)}</span> (Δ {trainResult.delta && trainResult.delta >= 0 ? "+" : ""}{trainResult.delta?.toFixed(2)})</div>
                </>
              ) : (
                <div>Failed: {trainResult.error}</div>
              )}
            </div>
          )}
        </GlassCard>

        <GlassCard glow="rose" animate>
          <SectionHeader icon={Search} title="Continuous Scraping" color="rose" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <MiniStat value={ingestionStats?.totalItems ?? 0} label="Items Ingested" color="rose" />
            <MiniStat value={ingestionStats?.enabledSources ?? ingestionStats?.sources?.filter((s: IngestionSource) => s.enabled)?.length ?? 0} label="Active Sources" color="cyan" />
            <MiniStat value={ingestionStats?.jobStats?.total ?? ingestionStats?.totalJobs ?? 0} label="Jobs Run" color="amber" />
            <MiniStat value={ingestionStats?.availableHandlers ?? ingestionStats?.bySource?.length ?? 0} label="Source Types" color="violet" />
          </div>
          {((ingestionStats?.recentItems?.length ?? 0) > 0 || (ingestionStats?.recentJobs?.length ?? 0) > 0) && (
            <div className="space-y-1 mt-3">
              <div className="text-[9px] text-slate-500 font-mono tracking-wider mb-1">RECENT ACTIVITY</div>
              {(ingestionStats?.recentJobs || []).slice(0, 5).map((job: IngestionJob, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[10px] font-mono hover:bg-white/[0.04] transition-all">
                  <BookOpen size={10} className="text-rose-400 shrink-0" />
                  <span className="text-slate-400 truncate flex-1">{job.sourceName}</span>
                  <span className={cn("shrink-0 font-medium", job.status === "completed" ? "text-emerald-400" : "text-red-400")}>{job.itemsIngested ?? 0} items</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard animate>
          <SectionHeader icon={Bot} title="Shepherd Agents" color="emerald" />
          <div className="grid grid-cols-3 gap-3 mt-3 mb-3">
            <MiniStat value={ingestionStats?.shepherd?.recentMissions?.length ?? 0} label="Missions" color="emerald" />
            <MiniStat value={ingestionStats?.shepherd?.totalIngested ?? 0} label="Harvested" color="cyan" />
            <MiniStat value={ingestionStats?.shepherd?.totalDeployed ?? 0} label="Deployed" color="amber" />
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Status: <span className={ingestionStats?.shepherd?.loopActive ? "text-emerald-400" : "text-red-400"}>{ingestionStats?.shepherd?.loopActive ? "ACTIVE — Autonomous Scraping" : "INACTIVE"}</span>
            {(ingestionStats?.shepherd?.active ?? 0) > 0 && (
              <span className="ml-2 text-violet-400">{ingestionStats?.shepherd?.active} agents active</span>
            )}
          </div>
        </GlassCard>

        <GlassCard animate>
          <SectionHeader icon={RefreshCw} title="Knowledge → Canon Bridge" color="blue" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <div className="text-[9px] text-slate-500 font-mono mb-0.5">New Since Last Regen</div>
              <div className="text-sm font-bold font-mono text-white">{ingestionStats?.bridge?.cumulativeNew ?? 0} / {ingestionStats?.bridge?.threshold ?? 25}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <div className="text-[9px] text-slate-500 font-mono mb-0.5">Bridge Status</div>
              <div className={cn("font-bold font-mono text-sm", ingestionStats?.bridge?.active ? "text-blue-400" : "text-red-400")}>
                {ingestionStats?.bridge?.active ? "ACTIVE" : "INACTIVE"}
              </div>
            </div>
          </div>
          <div className="text-[9px] text-slate-500 font-mono mt-2">Auto-regenerates when {ingestionStats?.bridge?.threshold ?? 25} new items ingested</div>
        </GlassCard>

        <GlassCard className="border-amber-500/15 bg-amber-500/[0.02]" animate>
          <SectionHeader icon={Shield} title="Security Policy" color="amber" />
          <ul className="text-xs text-slate-400 space-y-1.5 mt-2 leading-relaxed">
            <li>All external APIs run in sandboxed VM — no access to internal code</li>
            <li>External AI treated as tools only — never speaks as Tessera</li>
            <li>Domain allowlist enforced — only approved endpoints contacted</li>
            <li>Sovereignty enforcement middleware active on all routes</li>
            <li>Response sanitization strips all external AI identity markers</li>
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
