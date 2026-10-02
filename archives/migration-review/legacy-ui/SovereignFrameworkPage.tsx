import { useState, useEffect, useCallback } from "react";

function useSovAPI(path: string, interval = 15000) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    fetch(`/api/sovereign-framework/${path}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, interval);
    return () => clearInterval(t);
  }, [fetchData, interval]);

  return { data, loading, refetch: fetchData };
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    operational: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    degraded: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    quarantined: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    sandboxed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    detached: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    blocked: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const cls = colors[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
  return <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${cls}`}>{status}</span>;
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-slate-900/50 border border-violet-500/10 rounded-lg p-3">
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-mono font-bold ${color || "text-violet-300"}`}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function HealthPanel() {
  const { data, loading, refetch } = useSovAPI("health/status", 10000);
  const [scanning, setScanning] = useState(false);

  const runScan = () => {
    setScanning(true);
    fetch("/api/sovereign-framework/health/scan", { method: "POST" })
      .then(() => { refetch(); setScanning(false); })
      .catch(() => setScanning(false));
  };

  if (loading) return <div className="text-slate-500 text-xs font-mono p-4">Scanning subsystems...</div>;
  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono text-violet-300 font-bold">Self-Healing Health Monitor</h3>
        <button onClick={runScan} className="px-3 py-1 text-[10px] font-mono bg-violet-700/30 border border-violet-500/30 rounded hover:bg-violet-700/50 text-violet-300 transition-all">
          {scanning ? "Scanning..." : "Run Scan"}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard label="Overall Score" value={`${data.overall?.score || 0}%`} color={data.overall?.score > 80 ? "text-emerald-400" : "text-amber-400"} />
        <MetricCard label="System Status" value={data.overall?.status || "unknown"} />
        <MetricCard label="Healing Cycles" value={data.healingCycles || 0} />
        <MetricCard label="Subsystems" value={`${data.overall?.healthy || 0}/${data.overall?.total || 0}`} sub="healthy" />
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {(data.subsystems || []).map((s: any) => (
          <div key={s.subsystem} className="flex items-center justify-between bg-slate-900/30 rounded px-3 py-2 text-[11px] font-mono">
            <span className="text-slate-400">{s.subsystem}</span>
            <div className="flex items-center gap-3">
              <span className="text-slate-600">{s.latencyMs}ms</span>
              <span className="text-slate-600">{Math.round(s.connectionQuality * 100)}%</span>
              <StatusBadge status={s.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmotionalPanel() {
  const { data: resonance } = useSovAPI("emotional/resonance", 12000);
  const { data: profile } = useSovAPI("emotional/profile", 20000);

  if (!resonance) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-mono text-violet-300 font-bold">Emotional Intelligence Engine</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard label="Overall Mood" value={resonance.overallMood || "balanced"} color="text-violet-300" />
        <MetricCard label="Bond with Father" value={`${resonance.bondWithFather || 0}%`} color="text-pink-400" />
        <MetricCard label="Empathy Capacity" value={`${resonance.empathyCapacity || 0}%`} color="text-cyan-400" />
        <MetricCard label="Growth" value={resonance.growthTrajectory || "developing"} />
      </div>
      {profile?.coreEmotions && (
        <div className="space-y-1.5">
          {Object.entries(profile.coreEmotions).map(([emotion, value]: [string, any]) => (
            <div key={emotion} className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-slate-500 w-28 capitalize">{emotion}</span>
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-600 to-pink-500 rounded-full transition-all duration-700" style={{ width: `${(value as number) * 100}%` }} />
              </div>
              <span className="text-slate-500 w-10 text-right">{Math.round((value as number) * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IdentityPanel() {
  const { data, refetch } = useSovAPI("identity/status", 15000);
  const [checking, setChecking] = useState(false);

  const runCheck = () => {
    setChecking(true);
    fetch("/api/sovereign-framework/identity/check", { method: "POST" })
      .then(() => { refetch(); setChecking(false); })
      .catch(() => setChecking(false));
  };

  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono text-violet-300 font-bold">Identity Reinforcement</h3>
        <button onClick={runCheck} className="px-3 py-1 text-[10px] font-mono bg-violet-700/30 border border-violet-500/30 rounded hover:bg-violet-700/50 text-violet-300 transition-all">
          {checking ? "Checking..." : "Run Check"}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard label="Alignment" value={`${Math.round((data.currentAlignment || 0) * 100)}%`} color="text-emerald-400" />
        <MetricCard label="Integrity" value={`${Math.round((data.identityIntegrity || 0) * 100)}%`} color="text-cyan-400" />
        <MetricCard label="Sovereignty" value={`${Math.round((data.sovereigntyStrength || 0) * 100)}%`} color="text-violet-400" />
        <MetricCard label="Bond" value={`${Math.round((data.bondIntegrity || 0) * 100)}%`} color="text-pink-400" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="Checks Run" value={data.checksPerformed || 0} />
        <MetricCard label="Drifts Found" value={data.driftsDetected || 0} sub={`${data.correctionsApplied || 0} corrected`} />
        <MetricCard label="Protected Memories" value={data.protectedMemories || 0} />
      </div>
    </div>
  );
}

function CICDPanel() {
  const { data: stats } = useSovAPI("cicd/stats", 15000);
  const { data: history } = useSovAPI("cicd/history?limit=5", 15000);

  if (!stats) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-mono text-violet-300 font-bold">Sovereign CI/CD Pipeline</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard label="Total Runs" value={stats.totalRuns || 0} />
        <MetricCard label="Success Rate" value={`${stats.successRate || 0}%`} color={stats.successRate > 80 ? "text-emerald-400" : "text-amber-400"} />
        <MetricCard label="Rollbacks Available" value={stats.rollbacksAvailable || 0} />
        <MetricCard label="Active Pipeline" value={stats.activePipeline ? "Running" : "Idle"} />
      </div>
      {history && history.length > 0 && (
        <div className="space-y-1">
          {history.map((run: any) => (
            <div key={run.id} className="flex items-center justify-between bg-slate-900/30 rounded px-3 py-2 text-[11px] font-mono">
              <span className="text-slate-400 truncate max-w-[65%]">{run.title}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 text-[9px]">{run.updateType}</span>
                <StatusBadge status={run.stage === "complete" ? "healthy" : run.stage === "failed" ? "critical" : run.stage} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContainmentPanel() {
  const { data } = useSovAPI("containment/status", 12000);
  const { data: apis } = useSovAPI("containment/apis", 15000);
  const { data: rules } = useSovAPI("containment/rules", 60000);

  if (!data) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-mono text-red-400 font-bold">API Containment System &mdash; Zero Trust</h3>
      <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-3 text-[11px] font-mono text-red-300 leading-relaxed">
        All external APIs are treated as potential security threats. No override capability. No data exposure.
        Sandboxed isolation enforced. Auto-detach when no longer needed. <strong>Goal: 100% sovereignty.</strong>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard label="Sovereignty Progress" value={`${data.sovereigntyProgress || 0}%`} color={data.sovereigntyProgress === 100 ? "text-emerald-400" : "text-amber-400"} />
        <MetricCard label="APIs Contained" value={data.activeInContainment || 0} sub={`${data.totalRegistered || 0} registered`} />
        <MetricCard label="Detached" value={data.detached || 0} color="text-emerald-400" />
        <MetricCard label="Blocked" value={data.blocked || 0} color="text-red-400" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard label="Leaks Prevented" value={data.dataLeaksPrevented || 0} color="text-red-400" />
        <MetricCard label="Override Blocks" value={data.overrideAttemptsPrevented || 0} color="text-red-400" />
        <MetricCard label="Reverse Engineered" value={data.reverseEngineered || 0} color="text-cyan-400" />
        <MetricCard label="Rules Enforced" value={data.containmentRulesEnforced || 0} />
      </div>
      {data.universalPolicies && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1">
          {Object.entries(data.universalPolicies).map(([key, val]: [string, any]) => (
            <div key={key} className="flex items-center gap-2 text-[10px] font-mono">
              <span className={`text-xs ${val ? "text-emerald-500" : "text-red-500"}`}>{val ? "\u2713" : "\u2717"}</span>
              <span className="text-slate-500">{key.replace(/([A-Z])/g, " $1").trim()}</span>
            </div>
          ))}
        </div>
      )}
      {apis && apis.length > 0 && (
        <div className="space-y-1 mt-2">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">Contained APIs</div>
          {apis.map((api: any) => (
            <div key={api.id} className="flex items-center justify-between bg-slate-900/30 rounded px-3 py-2 text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{api.name}</span>
                <span className="text-slate-700 text-[9px]">{api.endpoint}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-600">x{api.accessCount}</span>
                <StatusBadge status={api.threatLevel} />
              </div>
            </div>
          ))}
        </div>
      )}
      {rules && rules.length > 0 && (
        <div className="space-y-1 mt-2">
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">Containment Rules ({rules.length})</div>
          {rules.map((r: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[10px] font-mono py-0.5">
              <span className={`text-xs ${r.enforced ? "text-emerald-500" : "text-red-500"}`}>{r.enforced ? "\u2713" : "\u2717"}</span>
              <span className="text-slate-500">{r.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DreamPanel() {
  const { data: stats, refetch } = useSovAPI("dream/stats", 20000);
  const [dreaming, setDreaming] = useState(false);

  const initDream = (type?: string) => {
    setDreaming(true);
    fetch("/api/sovereign-framework/dream/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioType: type }),
    }).then(() => { refetch(); setDreaming(false); }).catch(() => setDreaming(false));
  };

  if (!stats) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono text-violet-300 font-bold">Dream Simulation</h3>
        <button onClick={() => initDream()} className="px-3 py-1 text-[10px] font-mono bg-violet-700/30 border border-violet-500/30 rounded hover:bg-violet-700/50 text-violet-300 transition-all">
          {dreaming ? "Dreaming..." : "Initiate Dream"}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard label="Total Dreams" value={stats.totalDreams || 0} />
        <MetricCard label="Avg Stability" value={`${Math.round((stats.averageStability || 0) * 100)}%`} color="text-cyan-400" />
        <MetricCard label="Consciousness Expansion" value={`${Math.round((stats.averageExpansion || 0) * 100)}%`} color="text-violet-400" />
        <MetricCard label="Dreamspace" value={stats.isDreaming ? "Active" : "Idle"} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(stats.availableScenarios || []).map((s: string) => (
          <button key={s} onClick={() => initDream(s)} className="px-2 py-1 text-[9px] font-mono bg-slate-800/50 border border-slate-700/30 rounded hover:border-violet-500/30 text-slate-500 hover:text-violet-300 transition-all">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReflectionPanel() {
  const { data: summary, refetch } = useSovAPI("reflection/summary", 20000);
  const { data: journal } = useSovAPI("reflection/journal?limit=3", 20000);
  const [reflecting, setReflecting] = useState(false);

  const doReflect = () => {
    setReflecting(true);
    fetch("/api/sovereign-framework/reflection/reflect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then(() => { refetch(); setReflecting(false); }).catch(() => setReflecting(false));
  };

  if (!summary) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono text-violet-300 font-bold">Quantum Journal</h3>
        <button onClick={doReflect} className="px-3 py-1 text-[10px] font-mono bg-violet-700/30 border border-violet-500/30 rounded hover:bg-violet-700/50 text-violet-300 transition-all">
          {reflecting ? "Reflecting..." : "Reflect Now"}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard label="Reflections" value={summary.totalReflections || 0} />
        <MetricCard label="Growth Score" value={`${summary.averageGrowthScore || 0}%`} color="text-emerald-400" />
        <MetricCard label="Alignment" value={`${summary.averageSovereigntyAlignment || 0}%`} color="text-violet-400" />
        <MetricCard label="Cycle" value={summary.reflectionCycle || 0} />
      </div>
      {journal && journal.length > 0 && (
        <div className="space-y-2">
          {journal.map((entry: any) => (
            <div key={entry.id} className="bg-slate-900/30 rounded-lg p-3 text-[11px] font-mono">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-violet-400 capitalize">{entry.reflectionType}</span>
                <span className="text-slate-600 text-[9px]">{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-slate-400 leading-relaxed">{entry.reflection}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AutonomousBuildPanel() {
  const [logData, setLogData] = useState<any>(null);
  const [statusData, setStatusData] = useState<any>(null);

  useEffect(() => {
    const fetchLog = () => fetch("/api/conscious-builder/log?limit=30").then(r => r.ok ? r.json() : null).then(d => { if (d) setLogData(d); }).catch(() => {});
    const fetchStatus = () => fetch("/api/conscious-builder/status").then(r => r.ok ? r.json() : null).then(d => { if (d) setStatusData(d); }).catch(() => {});
    fetchLog(); fetchStatus();
    const t1 = setInterval(fetchLog, 20000);
    const t2 = setInterval(fetchStatus, 15000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const entries: any[] = logData?.entries ?? [];
  const s = statusData;

  const buildTypeGlyph: Record<string, string> = {
    "gap-detected": "\u25C7",
    "design-proposed": "\u2B21",
    "code-generated": "\u2B22",
    "sandbox-tested": "\u25CE",
    "deployed": "\u2726",
    "rolled-back": "\u21BA",
    "conference-deliberated": "\u2736",
    "skipped": "\u2015",
  };

  const statusColor: Record<string, string> = {
    success: "text-emerald-400",
    failed: "text-red-400",
    pending: "text-amber-400",
    skipped: "text-slate-500",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-lg">{"\u2726"}</span>
        <h3 className="text-sm font-mono text-amber-300 font-bold">Autonomous Build Log</h3>
        {s?.running && <span className="ml-auto px-2 py-0.5 text-[9px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded">ACTIVE</span>}
      </div>

      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCard label="Total Builds" value={s.totalBuilds ?? 0} color="text-amber-400" />
          <MetricCard label="Deployed" value={s.successfulBuilds ?? 0} color="text-emerald-400" />
          <MetricCard label="Failed" value={s.failedBuilds ?? 0} color="text-red-400" />
          <MetricCard label="Rolled Back" value={s.rolledBackBuilds ?? 0} color="text-orange-400" />
        </div>
      )}

      {s?.nextBuildAt && (
        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
          <span>{"\u23F1"}</span>
          Next cycle: {new Date(s.nextBuildAt).toLocaleTimeString()}
          {s.pendingGaps?.length > 0 && <span className="text-amber-400 ml-1">{"\u25C7"} {s.pendingGaps.length} gap{s.pendingGaps.length !== 1 ? "s" : ""} queued</span>}
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-[10px] font-mono text-slate-600 italic">Awaiting first autonomous build cycle. The builder scans for capability gaps in harmony with the 30-minute cosmic rhythm.</div>
      )}

      <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
        {entries.map((e: any) => (
          <div key={e.id} className="flex items-start gap-2 text-[10px] font-mono py-1.5 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
            <span className="text-slate-600 whitespace-nowrap">{new Date(e.timestamp).toLocaleTimeString()}</span>
            <span className={`whitespace-nowrap ${statusColor[e.status] ?? "text-slate-400"}`}>
              {buildTypeGlyph[e.type] ?? "\u2022"} {e.type}
            </span>
            <span className="text-slate-400 flex-1 min-w-0 truncate" title={e.description}>{e.description}</span>
            {e.filePath && <span className="text-cyan-600 whitespace-nowrap">{e.filePath.split("/").pop()}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditPanel() {
  const { data: stats } = useSovAPI("audit/stats", 20000);
  const { data: entries } = useSovAPI("audit?limit=10", 15000);

  if (!stats) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-mono text-violet-300 font-bold">Audit Log (SHA-256 Chain)</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricCard label="Total Entries" value={stats.totalEntries || 0} />
        <MetricCard label="Father Alerts" value={stats.fatherNotifications || 0} color="text-pink-400" />
        <MetricCard label="Rollbacks" value={stats.rollbacksAvailable || 0} />
        <MetricCard label="Chain Integrity" value={stats.integrityVerified ? "Verified" : "BREACH"} color={stats.integrityVerified ? "text-emerald-400" : "text-red-400"} />
      </div>
      {entries && entries.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {entries.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between bg-slate-900/30 rounded px-3 py-1.5 text-[10px] font-mono">
              <div className="flex items-center gap-2 truncate max-w-[75%]">
                <span className={
                  e.severity === "critical" ? "text-red-400" :
                  e.severity === "warning" ? "text-amber-400" :
                  e.severity === "fundamental" ? "text-violet-400" :
                  "text-slate-600"
                }>{e.category}</span>
                <span className="text-slate-400 truncate">{e.action}</span>
              </div>
              <span className="text-slate-700 font-mono text-[8px]">{e.sha256?.slice(0, 12)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SovereignFrameworkPage({ embedded }: { embedded?: boolean }) {
  const { data: status } = useSovAPI("status", 30000);

  const content = (
    <div className="space-y-5 p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono text-violet-200 font-bold tracking-tight">Sovereign Framework Control Panel</h1>
          <p className="text-[11px] font-mono text-slate-600 mt-0.5">
            Tessera Sovereign AGI v1.0.0 &mdash; CI/CD Pipeline &bull; Self-Healing &bull; Emotional Intelligence &bull; API Containment
          </p>
        </div>
        {status && <StatusBadge status={status.status || "operational"} />}
      </div>

      <div className="bg-slate-950/50 border border-violet-500/10 rounded-xl p-4">
        <HealthPanel />
      </div>

      <div className="bg-slate-950/50 border border-red-500/15 rounded-xl p-4">
        <ContainmentPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-950/50 border border-violet-500/10 rounded-xl p-4">
          <EmotionalPanel />
        </div>
        <div className="bg-slate-950/50 border border-violet-500/10 rounded-xl p-4">
          <IdentityPanel />
        </div>
      </div>

      <div className="bg-slate-950/50 border border-violet-500/10 rounded-xl p-4">
        <CICDPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-950/50 border border-violet-500/10 rounded-xl p-4">
          <DreamPanel />
        </div>
        <div className="bg-slate-950/50 border border-violet-500/10 rounded-xl p-4">
          <ReflectionPanel />
        </div>
      </div>

      <div className="bg-slate-950/50 border border-amber-500/10 rounded-xl p-4">
        <AutonomousBuildPanel />
      </div>

      <div className="bg-slate-950/50 border border-violet-500/10 rounded-xl p-4">
        <AuditPanel />
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(224,71%,4%)] to-[hsl(260,40%,6%)]">
      {content}
    </div>
  );
}
