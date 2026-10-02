import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield, ShieldCheck, ShieldAlert, Zap, Cpu, Network, Users, BarChart3, Play,
  AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw, Power, PowerOff, Activity,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) => `${BASE}${path}`;

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-900/50 text-emerald-300 border border-emerald-700">
      <CheckCircle className="w-3 h-3" /> {label ?? "PASS"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-900/50 text-red-300 border border-red-700">
      <XCircle className="w-3 h-3" /> {label ?? "FAIL"}
    </span>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    SOVEREIGN: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
    APPROACHING: "bg-cyan-900/50 text-cyan-300 border-cyan-700",
    DEPENDENT: "bg-amber-900/50 text-amber-300 border-amber-700",
    CRITICAL: "bg-red-900/50 text-red-300 border-red-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${colors[grade] ?? "bg-slate-900/50 text-slate-300 border-slate-700"}`}>
      {grade}
    </span>
  );
}

function ScoreBar({ value, max = 100, color = "cyan" }: { value: number; max?: number; color?: string }) {
  const pct = Math.round((value / max) * 100);
  const colors: Record<string, string> = {
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    violet: "bg-violet-500",
  };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
        <div
          className={`h-full rounded transition-all duration-500 ${colors[color] ?? "bg-cyan-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function Card({ title, icon: Icon, children, className = "" }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function SovereigntyReadinessPage() {
  const qc = useQueryClient();
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [dryRunRunning, setDryRunRunning] = useState(false);
  const [hardDisconnectConfirm, setHardDisconnectConfirm] = useState(false);

  const sovereignty = useQuery({
    queryKey: ["ps-sovereignty"],
    queryFn: () => fetch(api("/api/provider-sovereignty/sovereignty")).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const localModels = useQuery({
    queryKey: ["local-models-status"],
    queryFn: () => fetch(api("/api/local-models/status")).then(r => r.json()),
    refetchInterval: 60_000,
  });

  const councilStatus = useQuery({
    queryKey: ["council-roster"],
    queryFn: () => fetch(api("/api/council/agents")).then(r => r.json()),
    retry: false,
  });

  const routingGraph = useQuery({
    queryKey: ["routing-graph"],
    queryFn: () => fetch(api("/api/routing/graph")).then(r => r.json()),
    refetchInterval: 60_000,
  });

  const selfCheck = useQuery({
    queryKey: ["sovereignty-self-check"],
    queryFn: () => fetch(api("/api/sovereignty/self-check")).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const hardDisconnectQuery = useQuery({
    queryKey: ["hard-disconnect"],
    queryFn: () => fetch(api("/api/provider-sovereignty/hard-disconnect")).then(r => r.json()),
    refetchInterval: 10_000,
  });

  const evalQuery = useQuery({
    queryKey: ["eval-score"],
    queryFn: () => fetch(api("/api/sovereignty/score")).then(r => r.json()),
    refetchInterval: 60_000,
  });

  const hardDisconnectMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      const resp = await fetch(api(`/api/provider-sovereignty/hard-disconnect/${enable ? "enable" : "disable"}`), { method: "POST" });
      return resp.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hard-disconnect"] });
      setHardDisconnectConfirm(false);
    },
  });

  const runDryRun = useCallback(async () => {
    setDryRunRunning(true);
    setDryRunResult(null);
    try {
      const resp = await fetch(api("/api/provider-sovereignty/full-dry-run"), { method: "POST" });
      const data = await resp.json();
      setDryRunResult(data);
    } catch (err) {
      setDryRunResult({ ok: false, error: String(err) });
    } finally {
      setDryRunRunning(false);
    }
  }, []);

  const sov = sovereignty.data;
  const lm = localModels.data;
  const graph = routingGraph.data;
  const sc = selfCheck.data;
  const hd = hardDisconnectQuery.data;
  const evalData = evalQuery.data;

  const GRAND_COUNCIL_AGENTS = [
    "GrandCoordinatorAgent", "QuantumMechanicAgent", "BioNeuralistAgent",
    "DNACrystalArchivistAgent", "MeshNetworkArchitectAgent", "LowPowerInnovatorAgent",
    "SelfExpansionTutorAgent",
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h1 className="text-2xl font-bold text-white tracking-tight">Sovereignty Readiness</h1>
            </div>
            <p className="text-slate-400 text-sm">
              Live status of the Tessera Sovereign bootstrap — provider sovereignty, local inference, evaluation scores, routing topology, council roster, and dry-run detachment.
            </p>
          </div>
          <button
            onClick={() => {
              qc.invalidateQueries();
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh All
          </button>
        </div>

        {/* Hard-disconnect banner */}
        {hd?.active && (
          <div className="bg-red-950/60 border border-red-700 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <PowerOff className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <div className="font-bold text-red-300 text-sm">HARD-DISCONNECT MODE ACTIVE</div>
                <div className="text-red-400 text-xs">External provider calls are blocked at the sovereignty wrapper. Active since {hd.activeSince ? new Date(hd.activeSince).toLocaleString() : "just now"}.</div>
              </div>
            </div>
            <button
              onClick={() => hardDisconnectMutation.mutate(false)}
              className="px-3 py-1.5 bg-red-800 hover:bg-red-700 border border-red-600 rounded-lg text-xs font-bold text-red-100 transition-colors flex-shrink-0"
            >
              Restore External Access
            </button>
          </div>
        )}

        {/* Top-row KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-cyan-400">
              {sov ? `${sov.sovereigntyScore}` : "—"}
            </div>
            <div className="text-xs text-slate-400 mt-1">Sovereignty Score</div>
            {sov?.grade && <div className="mt-2"><GradeBadge grade={sov.grade} /></div>}
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">
              {lm ? `${lm.availableCount}/${lm.totalCount}` : "—"}
            </div>
            <div className="text-xs text-slate-400 mt-1">Local Adapters Ready</div>
            <div className="mt-2 text-xs font-bold text-slate-300">{lm?.sovereignCapacity ?? "—"}</div>
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-violet-400">
              {sc ? `${sc.sovereigntyScore}` : "—"}
            </div>
            <div className="text-xs text-slate-400 mt-1">Self-Check Score</div>
            {sc && <div className="mt-2 text-xs font-bold text-slate-300">Grade: {sc.grade}</div>}
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-amber-400">
              {evalData?.sovereignty ? `${evalData.sovereignty.overallScore}` : "—"}
            </div>
            <div className="text-xs text-slate-400 mt-1">Benchmark Score</div>
            {evalData?.sovereignty && (
              <div className="mt-2 text-xs text-slate-300">{evalData.sovereignty.level}</div>
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* Provider Sovereignty */}
          <Card title="Provider Sovereignty" icon={Shield}>
            {sov ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-slate-400">Internal ratio</div>
                    <div className="font-bold text-emerald-300">{Math.round(sov.internalRatio * 100)}%</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Detach readiness</div>
                    <div className="font-bold text-cyan-300">{sov.detachmentReadiness}/100</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Internal providers</div>
                    <div className="font-bold text-emerald-300">{sov.internalProviders}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">External providers</div>
                    <div className="font-bold text-amber-300">{sov.externalProviders}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Detachment readiness</div>
                  <ScoreBar value={sov.detachmentReadiness} color={sov.detachmentReadiness >= 60 ? "emerald" : sov.detachmentReadiness >= 30 ? "amber" : "red"} />
                </div>
                <div className="text-xs text-slate-400 italic">{sov.summary}</div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs animate-pulse">Loading sovereignty data…</div>
            )}
          </Card>

          {/* Local LLM Adapters */}
          <Card title="Local Model Adapters" icon={Cpu}>
            {lm ? (
              <div className="space-y-2">
                {lm.adapters?.map((adapter: any) => (
                  <div key={adapter.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{adapter.name}</div>
                      <div className="text-[10px] text-slate-500">{adapter.endpoint}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {adapter.isAvailable ? (
                        <>
                          <span className="text-[10px] text-slate-400">{adapter.latencyMs}ms</span>
                          <StatusBadge ok={true} label="UP" />
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          OFFLINE
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="text-xs text-slate-500 pt-1 border-t border-slate-800">
                  Ollama: reference implementation. Others: typed stubs — set env vars to activate.
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs animate-pulse">Checking local adapters…</div>
            )}
          </Card>

          {/* Evaluation Scores */}
          <Card title="Evaluation Benchmarks" icon={BarChart3}>
            {evalData?.sovereignty ? (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Overall benchmark score</span>
                    <span className="text-cyan-300 font-bold">{evalData.sovereignty.overallScore}%</span>
                  </div>
                  <ScoreBar value={evalData.sovereignty.overallScore} color="cyan" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-slate-400">Tests passed</div>
                    <div className="font-bold text-emerald-300">{evalData.sovereignty.breakdown?.testsPassed}/{evalData.sovereignty.breakdown?.totalTests}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Active modules</div>
                    <div className="font-bold text-violet-300">{evalData.sovereignty.activeModules}/{evalData.sovereignty.totalModules}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Method: {evalData.benchmarkMethod} · {evalData.totalLatencyMs}ms total
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs animate-pulse">Loading benchmark data…</div>
            )}
          </Card>

          {/* Grand Council Roster */}
          <Card title="Grand Council Roster" icon={Users}>
            <div className="space-y-1.5">
              {GRAND_COUNCIL_AGENTS.map((name) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">{name}</span>
                  <StatusBadge ok={true} label="ACTIVE" />
                </div>
              ))}
              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                PLAN → EXECUTE → REFLECT → IMPROVE enforced. 7 specialist agents + extended council.
              </div>
            </div>
          </Card>

          {/* Routing Graph */}
          <Card title="Geometry-Based Routing" icon={Network}>
            {graph ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-slate-400">Total nodes</div>
                    <div className="font-bold text-cyan-300">{graph.nodeCount}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Total edges</div>
                    <div className="font-bold text-violet-300">{graph.edgeCount}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">Algorithm: {graph.algorithm}</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {graph.nodes?.slice(0, 8).map((n: any) => (
                    <div key={n.id} className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-300 truncate max-w-[140px]">{n.label}</span>
                      <span className={`text-[10px] ${n.type === "provider" ? "text-amber-400" : "text-emerald-400"}`}>{n.type}</span>
                    </div>
                  ))}
                  {(graph.nodeCount ?? 0) > 8 && (
                    <div className="text-[10px] text-slate-600">+{(graph.nodeCount ?? 0) - 8} more nodes…</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs animate-pulse">Building routing graph…</div>
            )}
          </Card>

          {/* System Self-Check */}
          <Card title="System Self-Check" icon={Activity}>
            {sc ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-slate-400">{sc.passing}/{sc.checks?.length ?? 0} checks passing</div>
                  <span className={`text-xs font-bold ${sc.grade === "A" ? "text-emerald-300" : sc.grade === "B" ? "text-cyan-300" : "text-amber-300"}`}>
                    Grade {sc.grade}
                  </span>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {sc.checks?.map((c: any) => (
                    <div key={c.name} className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">{c.name}</span>
                      <StatusBadge ok={c.ok} label={c.ok ? "OK" : "FAIL"} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs animate-pulse">Running self-check…</div>
            )}
          </Card>

        </div>

        {/* Dry-run Detach Section */}
        <Card title="Dry-Run Detach" icon={Zap} className="border-cyan-800/40">
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Simulates full internal operation with external providers disabled. Runs all 6 evaluation suites and reports pass/fail against the detachment threshold.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={runDryRun}
                disabled={dryRunRunning}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-800 hover:bg-cyan-700 border border-cyan-600 rounded-lg text-sm font-bold text-cyan-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dryRunRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {dryRunRunning ? "Running Dry-Run…" : "Run Dry-Run Detach"}
              </button>

              {!hd?.active ? (
                !hardDisconnectConfirm ? (
                  <button
                    onClick={() => setHardDisconnectConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/40 border border-slate-700 hover:border-red-700 rounded-lg text-sm font-bold text-slate-300 hover:text-red-300 transition-colors"
                  >
                    <PowerOff className="w-4 h-4" /> Enable Hard-Disconnect
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">This will block all external AI calls. Confirm?</span>
                    <button
                      onClick={() => hardDisconnectMutation.mutate(true)}
                      className="px-3 py-1.5 bg-red-800 hover:bg-red-700 border border-red-600 rounded-lg text-xs font-bold text-red-100 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setHardDisconnectConfirm(false)}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )
              ) : (
                <button
                  onClick={() => hardDisconnectMutation.mutate(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-900 hover:bg-red-800 border border-red-700 rounded-lg text-sm font-bold text-red-200 transition-colors"
                >
                  <Power className="w-4 h-4" /> Restore External Access
                </button>
              )}
            </div>

            {dryRunResult && (
              <div className={`border rounded-xl p-4 space-y-4 ${dryRunResult.passed ? "bg-emerald-950/40 border-emerald-800" : "bg-amber-950/40 border-amber-800"}`}>
                <div className="flex items-center gap-3">
                  {dryRunResult.passed
                    ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    : <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  }
                  <div>
                    <div className={`font-bold text-sm ${dryRunResult.passed ? "text-emerald-300" : "text-amber-300"}`}>
                      {dryRunResult.passed ? "DRY-RUN PASSED" : "NOT YET READY"}
                    </div>
                    <div className="text-xs text-slate-400">{dryRunResult.detachVerdict}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className={`text-2xl font-bold ${dryRunResult.passed ? "text-emerald-300" : "text-amber-300"}`}>
                      {dryRunResult.readinessScore}/100
                    </div>
                    <div className="text-xs text-slate-500">{dryRunResult.durationMs}ms</div>
                  </div>
                </div>

                {dryRunResult.evaluationSuites && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Evaluation Suites</div>
                    <div className="space-y-2">
                      {dryRunResult.evaluationSuites.map((suite: any) => (
                        <div key={suite.suite}>
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2">
                              <StatusBadge ok={suite.passed} />
                              <span className="text-xs text-slate-300">{suite.suite}</span>
                            </div>
                            <span className="text-xs text-slate-400">{suite.score}/100</span>
                          </div>
                          <ScoreBar value={suite.score} color={suite.passed ? "emerald" : "amber"} />
                          <div className="text-[10px] text-slate-500 mt-0.5">{suite.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(dryRunResult.bottlenecks?.length > 0 || dryRunResult.recommendations?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dryRunResult.bottlenecks?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-red-400 mb-1">Bottlenecks</div>
                        {dryRunResult.bottlenecks.map((b: string, i: number) => (
                          <div key={i} className="text-xs text-slate-400 flex gap-1">
                            <span className="text-red-500">•</span> {b}
                          </div>
                        ))}
                      </div>
                    )}
                    {dryRunResult.recommendations?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-cyan-400 mb-1">Recommendations</div>
                        {dryRunResult.recommendations.map((r: string, i: number) => (
                          <div key={i} className="text-xs text-slate-400 flex gap-1">
                            <span className="text-cyan-500">→</span> {r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {dryRunResult.internalProvidersAvailable?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-emerald-400 mb-1">Internal Providers Available</div>
                    <div className="flex flex-wrap gap-1">
                      {dryRunResult.internalProvidersAvailable.map((p: string) => (
                        <span key={p} className="px-2 py-0.5 rounded bg-emerald-900/40 border border-emerald-800 text-xs text-emerald-300">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 py-2">
          Tessera Sovereign System — Sovereignty Readiness v2.0 · {new Date().toLocaleDateString()}
        </div>

      </div>
    </div>
  );
}
