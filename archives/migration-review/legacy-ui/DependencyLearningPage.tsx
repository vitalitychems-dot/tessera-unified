import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Brain, Activity, Zap, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, TrendingUp, Server, Globe, Lock,
  Target, Eye, BarChart3, Network, Play, ArrowRight,
  ChevronDown, ChevronRight, Clock, Database
} from "lucide-react";

interface ProviderConfig {
  id: string;
  name: string;
  isExternal: boolean;
  type: string;
  tier: number;
  models: string[];
  capabilities: string[];
  endpoint?: string;
}

interface ProviderProfile {
  id: number;
  providerId: string;
  providerName: string;
  isExternal: boolean;
  isActive: boolean;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  errorRate: number;
  capabilities: string[];
  strengths: string[];
  weaknesses: string[];
  capabilityScore: number;
  reliabilityScore: number;
  speedScore: number;
  lastAnalyzedAt: string | null;
}

interface ProviderEntry {
  id: string;
  name: string;
  isExternal: boolean;
  type: string;
  tier: number;
  models: string[];
  capabilities: string[];
  profile: ProviderProfile | null;
}

interface SovereigntyStatus {
  ok: boolean;
  sovereigntyScore: number;
  internalRatio: number;
  externalRatio: number;
  detachmentReadiness: number;
  performanceParityScore: number;
  totalCalls: number;
  externalCalls: number;
  internalCalls: number;
  avgExternalLatencyMs: number | null;
  avgInternalLatencyMs: number | null;
  activeProviders: number;
  externalProviders: number;
  internalProviders: number;
  grade: "SOVEREIGN" | "APPROACHING" | "DEPENDENT" | "CRITICAL";
  summary: string;
  computedAt: string;
}

interface DryRunResult {
  simulated: boolean;
  internalProvidersAvailable: string[];
  externalProvidersDisabled: string[];
  estimatedSuccessRate: number;
  bottlenecks: string[];
  readinessScore: number;
  recommendations: string[];
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function GaugeMini({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="24" fill="none" stroke="#1a1a2e" strokeWidth="5" />
          <circle cx="30" cy="30" r="24" fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${value * 1.508} ${150.8 - value * 1.508}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color }}>{Math.round(value)}</span>
        </div>
      </div>
      <span className="text-[10px] text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
}

function TierBadge({ tier }: { tier: number }) {
  const configs: Record<number, { label: string; color: string }> = {
    0: { label: "Tier 0 · Self-hosted", color: "text-green-400 bg-green-900/30 border-green-500/30" },
    1: { label: "Tier 1 · Own keys", color: "text-cyan-400 bg-cyan-900/30 border-cyan-500/30" },
    2: { label: "Tier 2 · External", color: "text-orange-400 bg-orange-900/30 border-orange-500/30" },
  };
  const cfg = configs[tier] ?? configs[2];
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    SOVEREIGN: "bg-green-900/50 text-green-300 border-green-500/40",
    APPROACHING: "bg-cyan-900/50 text-cyan-300 border-cyan-500/40",
    DEPENDENT: "bg-orange-900/50 text-orange-300 border-orange-500/40",
    CRITICAL: "bg-red-900/50 text-red-300 border-red-500/40",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded border font-medium ${colors[grade] ?? "bg-gray-700 text-gray-300 border-gray-600"}`}>
      {grade}
    </span>
  );
}

function ProviderCard({ entry }: { entry: ProviderEntry }) {
  const [expanded, setExpanded] = useState(false);
  const p = entry.profile;
  const isLocal = !entry.isExternal;

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      isLocal
        ? "border-green-500/30 bg-green-950/10"
        : "border-gray-700/50 bg-gray-900/30"
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-white/[0.02] rounded-xl transition-all"
      >
        <div className={`mt-0.5 p-1.5 rounded-lg ${isLocal ? "bg-green-900/40" : "bg-gray-800"}`}>
          {isLocal ? <Server className="w-4 h-4 text-green-400" /> : <Globe className="w-4 h-4 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-200">{entry.name}</span>
            <TierBadge tier={entry.tier} />
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            {p ? (
              <>
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <Activity className="w-3 h-3" />
                  {p.totalCalls} calls
                </div>
                {p.avgLatencyMs !== null && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Clock className="w-3 h-3" />
                    {Math.round(p.avgLatencyMs)}ms avg
                  </div>
                )}
                {p.errorRate > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-orange-400">
                    <AlertTriangle className="w-3 h-3" />
                    {Math.round(p.errorRate * 100)}% errors
                  </div>
                )}
              </>
            ) : (
              <span className="text-[10px] text-gray-600">No calls logged yet</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {p && (
            <div className="text-right mr-1">
              <div className="text-sm font-bold text-gray-300">{p.capabilityScore}%</div>
              <div className="text-[9px] text-gray-600">capability</div>
            </div>
          )}
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {p && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <GaugeMini value={p.capabilityScore} label="Capability" color="#22d3ee" />
                <GaugeMini value={p.reliabilityScore} label="Reliability" color="#a78bfa" />
                <GaugeMini value={p.speedScore} label="Speed" color="#34d399" />
              </div>

              {p.strengths.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Strengths</div>
                  <div className="flex flex-wrap gap-1">
                    {p.strengths.map(s => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/20 border border-green-500/20 text-green-400">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {p.weaknesses.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Weaknesses</div>
                  <div className="flex flex-wrap gap-1">
                    {p.weaknesses.map(w => (
                      <span key={w} className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/20 border border-red-500/20 text-red-400">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Models</div>
            <div className="flex flex-wrap gap-1">
              {entry.models.slice(0, 6).map(m => (
                <span key={m} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                  {m.length > 30 ? m.slice(0, 30) + "…" : m}
                </span>
              ))}
              {entry.models.length > 6 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">+{entry.models.length - 6}</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Capabilities</div>
            <div className="flex flex-wrap gap-1">
              {entry.capabilities.map(c => (
                <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/20 border border-cyan-500/20 text-cyan-400">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DryRunPanel({ result }: { result: DryRunResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/60 border border-purple-500/30 rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Dry-Run Simulation Results
        </h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-300">{result.readinessScore}%</div>
          <div className="text-[10px] text-gray-500">Detachment Readiness</div>
        </div>
      </div>

      <div className="w-full bg-gray-800 rounded-full h-2">
        <div className="h-2 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 transition-all"
          style={{ width: `${result.readinessScore}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-bold text-green-400 uppercase mb-1.5">Internal Providers Available</div>
          {result.internalProvidersAvailable.map(p => (
            <div key={p} className="flex items-center gap-1.5 text-xs text-green-300 mb-1">
              <CheckCircle className="w-3 h-3 flex-shrink-0" />
              {p}
            </div>
          ))}
          {result.internalProvidersAvailable.length === 0 && (
            <div className="text-xs text-gray-500">None configured</div>
          )}
        </div>
        <div>
          <div className="text-[10px] font-bold text-red-400 uppercase mb-1.5">External Providers Disabled</div>
          {result.externalProvidersDisabled.slice(0, 5).map(p => (
            <div key={p} className="flex items-center gap-1.5 text-xs text-red-300 mb-1">
              <XCircle className="w-3 h-3 flex-shrink-0" />
              {p}
            </div>
          ))}
          {result.externalProvidersDisabled.length > 5 && (
            <div className="text-xs text-gray-500">+{result.externalProvidersDisabled.length - 5} more</div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Estimated Success Rate</span>
          <span className="text-sm font-bold text-cyan-300">{Math.round(result.estimatedSuccessRate * 100)}%</span>
        </div>
        <ScoreBar value={result.estimatedSuccessRate * 100} color="bg-cyan-500" />
      </div>

      {result.bottlenecks.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-orange-400 uppercase mb-1.5">Bottlenecks</div>
          {result.bottlenecks.map(b => (
            <div key={b} className="flex items-start gap-2 text-xs text-orange-300 mb-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              {b}
            </div>
          ))}
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-cyan-400 uppercase mb-1.5">Recommendations</div>
          {result.recommendations.map(r => (
            <div key={r} className="flex items-start gap-2 text-xs text-cyan-300 mb-1">
              <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
              {r}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

type Tab = "overview" | "providers" | "analysis" | "diff" | "dryrun";

export default function DependencyLearningPage({ embedded }: { embedded?: boolean }) {
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [filterExternal, setFilterExternal] = useState<"all" | "external" | "internal">("all");
  const qc = useQueryClient();

  const { data: providersData, isLoading: providersLoading } = useQuery<{ ok: boolean; providers: ProviderEntry[] }>({
    queryKey: ["/api/provider-sovereignty/providers"],
    refetchInterval: 30000,
  });

  const { data: sovereignty, isLoading: sovLoading } = useQuery<SovereigntyStatus>({
    queryKey: ["/api/provider-sovereignty/sovereignty"],
    refetchInterval: 30000,
  });

  const { data: callsData } = useQuery<{ ok: boolean; calls: any[] }>({
    queryKey: ["/api/provider-sovereignty/calls?limit=20"],
    refetchInterval: 20000,
    enabled: true,
  });

  const { data: diffsData } = useQuery<{ ok: boolean; diffs: any[] }>({
    queryKey: ["/api/provider-sovereignty/diffs?limit=10"],
    refetchInterval: 30000,
    enabled: true,
  });

  const initMut = useMutation({
    mutationFn: () => fetch("/api/provider-sovereignty/initialize", { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/provider-sovereignty/providers"] });
      qc.invalidateQueries({ queryKey: ["/api/provider-sovereignty/sovereignty"] });
    },
  });

  const analyzeMut = useMutation({
    mutationFn: () => fetch("/api/provider-sovereignty/analyze", { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/provider-sovereignty/providers"] });
      qc.invalidateQueries({ queryKey: ["/api/provider-sovereignty/sovereignty"] });
    },
  });

  const dryRunMut = useMutation({
    mutationFn: () => fetch("/api/provider-sovereignty/dry-run", { method: "POST" }).then(r => r.json()),
    onSuccess: (data) => {
      setDryRunResult(data);
    },
  });

  const providers = providersData?.providers ?? [];
  const filtered = providers.filter(p => {
    if (filterExternal === "external") return p.isExternal;
    if (filterExternal === "internal") return !p.isExternal;
    return true;
  });

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: "overview", label: "Sovereignty Overview", icon: Shield },
    { id: "providers", label: "Provider Registry", icon: Network },
    { id: "analysis", label: "Call Analysis", icon: BarChart3 },
    { id: "diff", label: "Provider Diffs", icon: Eye },
    { id: "dryrun", label: "Dry Run", icon: Play },
  ];

  return (
    <div className={`${embedded ? "" : "p-6"} space-y-6 max-w-7xl mx-auto`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cyan-300 flex items-center gap-2">
            <Brain className="w-6 h-6" />
            Dependency Learning
          </h1>
          <p className="text-sm text-gray-500 mt-1">Reverse-engineer AI providers · track sovereignty · simulate detachment</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => analyzeMut.mutate()}
            disabled={analyzeMut.isPending}
            className="px-3 py-1.5 text-sm bg-purple-900/30 text-purple-300 rounded hover:bg-purple-800/40 border border-purple-500/20 disabled:opacity-50 flex items-center gap-1"
          >
            <Brain className={`w-3 h-3 ${analyzeMut.isPending ? "animate-pulse" : ""}`} />
            {analyzeMut.isPending ? "Analyzing..." : "Analyze"}
          </button>
          <button
            onClick={() => initMut.mutate()}
            disabled={initMut.isPending}
            className="px-3 py-1.5 text-sm bg-cyan-900/30 text-cyan-300 rounded hover:bg-cyan-800/40 border border-cyan-500/20 disabled:opacity-50 flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${initMut.isPending ? "animate-spin" : ""}`} />
            {initMut.isPending ? "Initializing..." : "Initialize"}
          </button>
        </div>
      </div>

      

      {true && (
        <div className="space-y-6">
          {sovereignty && sovereignty.ok !== false ? (
            <>
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-cyan-400" />
                      Sovereignty Status
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">{sovereignty.summary}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-cyan-300">{sovereignty.sovereigntyScore}%</div>
                    <GradeBadge grade={sovereignty.grade} />
                  </div>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3 mb-4">
                  <div className="h-3 rounded-full bg-gradient-to-r from-cyan-600 to-purple-500 transition-all"
                    style={{ width: `${sovereignty.sovereigntyScore}%` }} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-gray-800/60 rounded-lg p-3">
                    <div className="text-xl font-bold text-cyan-300">{sovereignty.totalCalls}</div>
                    <div className="text-[10px] text-gray-500">Total Calls</div>
                  </div>
                  <div className="bg-gray-800/60 rounded-lg p-3">
                    <div className="text-xl font-bold text-green-300">{sovereignty.internalCalls}</div>
                    <div className="text-[10px] text-gray-500">Internal</div>
                  </div>
                  <div className="bg-gray-800/60 rounded-lg p-3">
                    <div className="text-xl font-bold text-orange-300">{sovereignty.externalCalls}</div>
                    <div className="text-[10px] text-gray-500">External</div>
                  </div>
                  <div className="bg-gray-800/60 rounded-lg p-3">
                    <div className="text-xl font-bold text-purple-300">{Math.round(sovereignty.internalRatio * 100)}%</div>
                    <div className="text-[10px] text-gray-500">Internal Ratio</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-green-400" />
                    Detachment Readiness
                  </h3>
                  <div className="text-2xl font-bold text-green-300 mb-2">{sovereignty.detachmentReadiness}%</div>
                  <ScoreBar value={sovereignty.detachmentReadiness} color="bg-green-500" />
                  <p className="text-[10px] text-gray-600 mt-2">Score of readiness to fully detach from external providers</p>
                </div>

                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Performance Parity
                  </h3>
                  <div className="text-2xl font-bold text-yellow-300 mb-2">{sovereignty.performanceParityScore}%</div>
                  <ScoreBar value={sovereignty.performanceParityScore} color="bg-yellow-500" />
                  <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
                    <div>
                      <div className="text-gray-500">Ext. avg latency</div>
                      <div className="text-gray-300">{sovereignty.avgExternalLatencyMs !== null ? `${Math.round(sovereignty.avgExternalLatencyMs)}ms` : "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Int. avg latency</div>
                      <div className="text-gray-300">{sovereignty.avgInternalLatencyMs !== null ? `${Math.round(sovereignty.avgInternalLatencyMs)}ms` : "N/A"}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                    <Network className="w-4 h-4 text-purple-400" />
                    Provider Distribution
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Internal</span>
                      <span className="text-green-300">{sovereignty.internalProviders}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">External</span>
                      <span className="text-orange-300">{sovereignty.externalProviders}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Active</span>
                      <span className="text-cyan-300">{sovereignty.activeProviders}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-600 text-center">
                Computed at: {new Date(sovereignty.computedAt).toLocaleString()}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              {sovLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="mx-auto w-8 h-8 mb-3">
                  <Shield className="w-8 h-8 text-cyan-400" />
                </motion.div>
              ) : (
                <>
                  <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-gray-400 mb-3">No sovereignty data yet</p>
                  <button onClick={() => initMut.mutate()} className="px-4 py-2 bg-cyan-900/50 text-cyan-300 rounded hover:bg-cyan-800/50">
                    Initialize Providers
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {true && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["all", "external", "internal"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterExternal(f)}
                className={`text-xs px-3 py-1 rounded-full border transition-all capitalize ${
                  filterExternal === f
                    ? "bg-white/10 border-white/20 text-white"
                    : "border-gray-700 text-gray-500 hover:text-gray-300"
                }`}
              >
                {f} ({f === "all" ? providers.length : f === "external" ? providers.filter(p => p.isExternal).length : providers.filter(p => !p.isExternal).length})
              </button>
            ))}
          </div>

          {providersLoading ? (
            <div className="flex items-center justify-center py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                <Network className="w-8 h-8 text-purple-400" />
              </motion.div>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(entry => (
                <ProviderCard key={entry.id} entry={entry} />
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No providers found. Click Initialize to set up providers.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {true && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Recent Provider Calls</h3>
            <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/provider-sovereignty/calls?limit=20"] })}
              className="p-1.5 text-gray-500 hover:text-gray-300 transition-all">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {callsData?.calls.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No provider calls logged yet. Use the Log Call API to start tracking.</p>
            </div>
          )}

          <div className="space-y-2">
            {(callsData?.calls ?? []).map((call: any) => (
              <div key={call.id} className={`p-3 rounded-lg border text-xs ${
                call.isExternal
                  ? "border-orange-500/20 bg-orange-950/10"
                  : "border-green-500/20 bg-green-950/10"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold ${call.isExternal ? "text-orange-300" : "text-green-300"}`}>
                      {call.providerName}
                    </span>
                    <span className="text-gray-500 font-mono">{call.model.length > 25 ? call.model.slice(0, 25) + "…" : call.model}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {call.latencyMs && (
                      <span className="text-gray-500">{call.latencyMs}ms</span>
                    )}
                    <span className={call.status === "success" ? "text-green-400" : "text-red-400"}>
                      {call.status}
                    </span>
                  </div>
                </div>
                <div className="text-gray-600">{new Date(call.calledAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {true && (
        <div className="space-y-4">
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-5">
            <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" />
              Cross-Provider Diffing
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              When multiple providers respond to the same prompt, their responses are logged and compared here.
              Use the Log Call API with a shared prompt to populate this panel.
            </p>
          </div>

          {(diffsData?.diffs ?? []).map((diff: any) => (
            <div key={diff.id} className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-300 truncate flex-1 mr-4">
                  Prompt: <span className="text-gray-400">{diff.prompt.slice(0, 120)}...</span>
                </p>
                {diff.winnerProviderId && (
                  <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 border border-green-500/30 text-green-400 whitespace-nowrap">
                    Winner: {diff.winnerProviderId}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-600">{new Date(diff.diffedAt).toLocaleString()}</div>
            </div>
          ))}

          {(diffsData?.diffs ?? []).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No diffs yet. Submit multiple provider responses to the same prompt via the diff API.</p>
            </div>
          )}
        </div>
      )}

      {true && (
        <div className="space-y-4">
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-5">
            <h3 className="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
              <Play className="w-4 h-4 text-purple-400" />
              Dry-Run Detachment Simulation
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Simulate what would happen if all external AI providers became unavailable.
              Measures current internal capacity, bottlenecks, and estimated success rate.
            </p>
            <button
              onClick={() => dryRunMut.mutate()}
              disabled={dryRunMut.isPending}
              className="w-full py-3 rounded-xl border border-purple-500/40 bg-purple-900/20 text-purple-300 hover:bg-purple-900/30 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {dryRunMut.isPending ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Running Simulation...</>
              ) : (
                <><Play className="w-4 h-4" /> Run Dry-Run Simulation</>
              )}
            </button>
          </div>

          <AnimatePresence>
            {dryRunResult && <DryRunPanel result={dryRunResult} />}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
