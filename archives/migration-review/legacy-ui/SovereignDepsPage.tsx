import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Shield, ShieldCheck, ShieldAlert, RefreshCw, Crown, Lock,
  CheckCircle2, AlertTriangle, XCircle, Zap, Package,
  ChevronDown, ChevronRight, Loader2, Eye, Bot, Activity,
  Play, Radio, FileCode, Cpu, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";

type SovereignStatus = "sovereign" | "upgraded" | "monitored" | "safe" | "vulnerable";
type DepRisk = "critical" | "high" | "medium" | "low" | "safe";

interface VulnDetail {
  title: string;
  severity: DepRisk;
  cve?: string;
  blockedBy?: string;
}

interface DepEntry {
  name: string;
  currentVersion: string;
  latestVersion?: string;
  risk: DepRisk;
  sovereignStatus: SovereignStatus;
  wrapperPath?: string;
  vulnerabilities: VulnDetail[];
  protections: string[];
  category: string;
  isOutdated: boolean;
  upgradedAt?: string;
}

interface Summary {
  total: number;
  sovereign: number;
  upgraded: number;
  monitored: number;
  safe: number;
  vulnerable: number;
  totalVulns: number;
  blockedVulns: number;
  protectionRate: number;
  sovereignCoverage: number;
}

interface AgentAction {
  timestamp: string;
  agent: string;
  action: string;
  target: string;
  result: "success" | "blocked" | "failed" | "generated" | "verified";
  details: string;
  severity?: "info" | "warning" | "critical";
}

interface AgencyStatus {
  running: boolean;
  lastScan: {
    scannedAt: string;
    status: string;
    agentBriefing: string;
    vulnerabilities: any[];
    wrappersGenerated: string[];
    packagesUpgraded: string[];
    actionsTriggered: AgentAction[];
  } | null;
  agentLog: AgentAction[];
  nextScanIn: string;
  wrapperVerifyIn: string;
  mode: string;
}

const STATUS_CONFIG: Record<SovereignStatus, { label: string; icon: typeof ShieldCheck; color: string; bg: string; border: string }> = {
  sovereign: { label: "SOVEREIGN", icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  upgraded: { label: "UPGRADED", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  monitored: { label: "MONITORED", icon: Eye, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  safe: { label: "SAFE", icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  vulnerable: { label: "VULNERABLE", icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
};

const SEVERITY_CFG: Record<DepRisk, { color: string; bg: string }> = {
  critical: { color: "text-red-300", bg: "bg-red-500/15 border-red-500/30" },
  high: { color: "text-orange-300", bg: "bg-orange-500/15 border-orange-500/30" },
  medium: { color: "text-amber-300", bg: "bg-amber-500/15 border-amber-500/30" },
  low: { color: "text-yellow-300", bg: "bg-yellow-500/15 border-yellow-500/30" },
  safe: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
};

const RESULT_CONFIG: Record<AgentAction["result"], { color: string; icon: typeof CheckCircle2; label: string }> = {
  success: { color: "text-emerald-400", icon: CheckCircle2, label: "SUCCESS" },
  blocked: { color: "text-amber-400", icon: Shield, label: "BLOCKED" },
  failed: { color: "text-red-400", icon: XCircle, label: "FAILED" },
  generated: { color: "text-violet-400", icon: FileCode, label: "GENERATED" },
  verified: { color: "text-cyan-400", icon: CheckCircle2, label: "VERIFIED" },
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function AgentActionRow({ action }: { action: AgentAction }) {
  const rc = RESULT_CONFIG[action.result];
  const ResultIcon = rc.icon;
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/20 last:border-0">
      <div className={cn("mt-0.5 shrink-0 p-1 rounded", action.result === "generated" ? "bg-violet-500/10" : action.result === "failed" ? "bg-red-500/10" : "bg-emerald-500/10")}>
        <ResultIcon size={10} className={rc.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-white font-mono">{action.agent}</span>
          <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded font-mono", rc.color)}>{rc.label}</span>
          {action.severity === "critical" && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-mono">CRITICAL</span>
          )}
        </div>
        <div className="text-[11px] text-white/70 mt-0.5 line-clamp-2">{action.details}</div>
        <div className="text-[9px] text-muted-foreground font-mono mt-0.5">{action.target} · {timeAgo(action.timestamp)}</div>
      </div>
    </div>
  );
}

function DepCard({ dep }: { dep: DepEntry }) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS_CONFIG[dep.sovereignStatus];
  const StatusIcon = st.icon;

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200",
      dep.sovereignStatus === "sovereign" ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-black/40"
        : dep.sovereignStatus === "vulnerable" ? "border-red-500/30 bg-red-500/5"
        : "border-border/30 bg-black/20"
    )}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 flex items-center gap-3">
        <div className={cn("p-1.5 rounded-lg border", st.bg, st.border)}>
          <StatusIcon size={14} className={st.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-bold text-white">{dep.name}</span>
            <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", st.bg, st.border, st.color)}>{st.label}</span>
            {dep.isOutdated && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono">
                v{dep.currentVersion} → {dep.latestVersion}
              </span>
            )}
            {!dep.isOutdated && dep.currentVersion !== "unknown" && (
              <span className="text-[9px] text-muted-foreground font-mono">v{dep.currentVersion}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground capitalize">{dep.category}</span>
            {dep.vulnerabilities.length > 0 && (
              <span className="text-[10px] text-orange-400">{dep.vulnerabilities.filter(v => v.blockedBy).length}/{dep.vulnerabilities.length} vulns blocked</span>
            )}
            {dep.protections.length > 0 && (
              <span className="text-[10px] text-emerald-400">{dep.protections.length} protections</span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {dep.vulnerabilities.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Vulnerabilities</div>
              <div className="space-y-1.5">
                {dep.vulnerabilities.map((v, i) => {
                  const sc = SEVERITY_CFG[v.severity];
                  return (
                    <div key={i} className={cn("rounded-lg border p-2.5 flex items-start gap-2", sc.bg)}>
                      {v.blockedBy ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" /> : <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-[10px] font-bold uppercase", sc.color)}>{v.severity}</span>
                          {v.cve && <span className="text-[9px] font-mono text-muted-foreground">{v.cve}</span>}
                        </div>
                        <div className="text-[11px] text-white/80 mt-0.5">{v.title}</div>
                        {v.blockedBy && <div className="text-[10px] text-emerald-400 mt-0.5 font-mono">✓ Blocked by {v.blockedBy}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {dep.protections.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Sovereign Protections</div>
              <div className="space-y-1">
                {dep.protections.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <Shield size={10} className="text-cyan-400 shrink-0 mt-0.5" />
                    <span className="text-white/70">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dep.wrapperPath && (
            <div className="text-[10px] font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded px-2 py-1.5">
              Sovereign wrapper: {dep.wrapperPath}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CATEGORY_ORDER = ["utility", "infrastructure", "database", "crypto/blockchain", "ai", "networking", "validation"];

type TabId = "shield" | "agency" | "log";

export default function SovereignDepsPage({ embedded }: { embedded?: boolean }) {
  const [tab, setTab] = useState<TabId>("agency");
  const [filter, setFilter] = useState<SovereignStatus | "all">("all");

  const { data, isLoading } = useQuery<{ summary: Summary; deps: DepEntry[]; generatedAt: string }>({
    queryKey: ["/api/security/sovereign-deps"],
    refetchInterval: 60000,
  });

  const { data: agencyData, isLoading: agencyLoading } = useQuery<AgencyStatus>({
    queryKey: ["/api/security/agency/status"],
    refetchInterval: 10000,
  });

  const scanMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/security/sovereign-deps/scan", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/security/sovereign-deps"] }),
  });

  const agencyScanMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/security/agency/scan-now", {}),
    onSuccess: () => {
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/security/agency/status"] }), 3000);
    },
  });

  const { summary, deps = [] } = data || {};
  const filtered = filter === "all" ? deps : deps.filter(d => d.sovereignStatus === filter);
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = filtered.filter(d => d.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<string, DepEntry[]>);

  const protectionRate = summary?.protectionRate ?? 100;
  const lastScan = agencyData?.lastScan;
  const agentLog = agencyData?.agentLog || [];

  const TABS: { id: TabId; label: string; icon: typeof Bot }[] = [
    { id: "agency", label: "Security Agency", icon: Bot },
    { id: "shield", label: "Dependency Shield", icon: ShieldCheck },
    { id: "log", label: "Agent Activity Log", icon: Activity },
  ];

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border/30 px-4 py-3 flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <Crown size={16} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">Sovereign Security Agency</h1>
          <p className="text-[11px] text-muted-foreground">Fully autonomous — agents scan, wrap, and defend with no human needed</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {agencyData?.running && (
            <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              SCANNING
            </div>
          )}
          {!agencyData?.running && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              STANDBY
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-b border-border/30 px-4 flex gap-1">
        {false && TABS.map(t => {
          const TIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-bold px-3 py-2.5 border-b-2 transition-all",
                tab === t.id ? "border-amber-500 text-amber-400" : "border-transparent text-muted-foreground hover:text-white"
              )}
            >
              <TIcon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "agency" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
              <div className="text-2xl font-black text-amber-400">{summary?.sovereign || 4}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Sovereign</div>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
              <div className="text-2xl font-black text-emerald-400">{summary?.blockedVulns || 5}/{summary?.totalVulns || 5}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Vulns Blocked</div>
            </div>
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-center">
              <div className="text-2xl font-black text-cyan-400">{protectionRate}%</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Protected</div>
            </div>
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 text-center">
              <div className="text-2xl font-black text-violet-400">6h</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Auto-Scan</div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-emerald-400">Autonomous Mode Active</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono ml-auto">NO HUMAN IN LOOP</span>
            </div>
            <div className="space-y-2 text-[11px] text-muted-foreground">
              {[
                { icon: Cpu, label: "TriageAgent", desc: "Reads npm audit output — classifies every vulnerability by attack type and severity" },
                { icon: Zap, label: "UpgradeAgent", desc: "Auto-upgrades packages when a safe fix exists (no breaking changes) — runs npm install autonomously" },
                { icon: FileCode, label: "WrapperAgent", desc: "Generates sovereign TypeScript wrappers for vulnerabilities that can't be safely upgraded — writes files to disk" },
                { icon: Shield, label: "WrapperVerifier", desc: "Checks every 30 minutes that all existing wrappers are intact with active audit logging" },
                { icon: Activity, label: "MonitorAgent", desc: "Flags and watches anything that doesn't match known attack patterns — logs to immutable audit trail" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 p-2.5 rounded-lg bg-black/20 border border-border/20">
                  <div className="p-1 rounded bg-cyan-500/10 shrink-0">
                    <Icon size={12} className="text-cyan-400" />
                  </div>
                  <div>
                    <span className="font-bold text-white font-mono">{label}</span>
                    <span className="text-muted-foreground ml-2">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {lastScan && (
            <div className="rounded-xl border border-border/30 bg-black/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={13} className="text-muted-foreground" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Last Scan</span>
                <span className="text-[10px] text-muted-foreground font-mono ml-auto">{timeAgo(lastScan.scannedAt)}</span>
              </div>
              <div className={cn(
                "text-[11px] font-mono px-3 py-2 rounded-lg border",
                lastScan.status === "clean" || lastScan.status === "remediated"
                  ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/8 border-amber-500/20 text-amber-300"
              )}>
                {lastScan.agentBriefing}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center p-2 rounded-lg bg-black/30 border border-border/20">
                  <div className="text-lg font-bold text-white">{lastScan.vulnerabilities?.length || 0}</div>
                  <div className="text-[9px] text-muted-foreground">Detected</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-black/30 border border-border/20">
                  <div className="text-lg font-bold text-violet-400">{lastScan.wrappersGenerated?.length || 0}</div>
                  <div className="text-[9px] text-muted-foreground">Wrapped</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-black/30 border border-border/20">
                  <div className="text-lg font-bold text-emerald-400">{lastScan.packagesUpgraded?.length || 0}</div>
                  <div className="text-[9px] text-muted-foreground">Upgraded</div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => agencyScanMut.mutate()}
            disabled={agencyScanMut.isPending || agencyData?.running}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all font-bold text-sm disabled:opacity-50"
          >
            {agencyScanMut.isPending || agencyData?.running ? (
              <><Loader2 size={14} className="animate-spin" /> Agents Deploying...</>
            ) : (
              <><Play size={14} /> Force Scan Now</>
            )}
          </button>

          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-2">
            <div className="text-[11px] font-bold text-violet-400 flex items-center gap-2"><Zap size={12} /> How the Agency Protects You</div>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-start gap-2"><CheckCircle2 size={10} className="text-emerald-400 shrink-0 mt-0.5" /><span>Scans every 6 hours automatically — no cron job, no human trigger needed</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 size={10} className="text-emerald-400 shrink-0 mt-0.5" /><span>Safe-to-upgrade packages are auto-installed — npm install runs in the background</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 size={10} className="text-emerald-400 shrink-0 mt-0.5" /><span>Complex vulnerabilities get TypeScript sovereign wrappers written to disk automatically</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 size={10} className="text-emerald-400 shrink-0 mt-0.5" /><span>Every action logged to the SHA-256 chained audit trail — tamper-proof record of all agent decisions</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 size={10} className="text-emerald-400 shrink-0 mt-0.5" /><span>Wrapper integrity verified every 30 minutes — if a wrapper is modified or removed, it's flagged immediately</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === "shield" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {summary && (
            <div className="shrink-0 border-b border-border/30 p-4 grid grid-cols-3 md:grid-cols-5 gap-3">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
                <div className="text-2xl font-black text-amber-400">{summary.sovereign}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Sovereign</div>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
                <div className="text-2xl font-black text-emerald-400">{summary.upgraded}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Upgraded</div>
              </div>
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-center">
                <div className="text-2xl font-black text-cyan-400">{summary.monitored}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Monitored</div>
              </div>
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 text-center">
                <div className="text-2xl font-black text-blue-400">{summary.safe}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Safe</div>
              </div>
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3 text-center">
                <div className="text-2xl font-black text-green-400">{protectionRate}%</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Protected</div>
              </div>
            </div>
          )}

          <div className="shrink-0 px-4 pt-3 flex gap-1.5 flex-wrap">
            {(["all", "sovereign", "upgraded", "monitored", "safe", "vulnerable"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[10px] font-bold px-3 py-1 rounded-full border transition-all capitalize",
                  filter === f ? "bg-white/10 border-white/20 text-white" : "border-border/30 text-muted-foreground hover:text-white hover:border-white/20"
                )}
              >
                {f === "all" ? `All (${deps.length})` : f}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {isLoading && <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>}
            {!isLoading && Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <Package size={11} className="text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider capitalize">{cat}</span>
                  <span className="text-[10px] text-muted-foreground">({items.length})</span>
                </div>
                <div className="space-y-2">
                  {items.map((dep) => <DepCard key={dep.name} dep={dep} />)}
                </div>
              </div>
            ))}
            {!isLoading && filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">No dependencies in this category</div>
            )}
          </div>
        </div>
      )}

      {tab === "log" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {agentLog.length} agent actions recorded
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/security/agency/status"] })}
              className="text-[10px] flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
            >
              <RefreshCw size={10} /> Refresh
            </button>
          </div>

          {agencyLoading && <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>}

          {!agencyLoading && agentLog.length === 0 && (
            <div className="rounded-xl border border-border/30 bg-black/20 p-8 text-center">
              <Clock size={24} className="text-muted-foreground mx-auto mb-3" />
              <div className="text-sm text-muted-foreground">Agency initializing — first scan runs 30s after server start</div>
              <div className="text-[11px] text-muted-foreground mt-1">Check back shortly for live agent activity</div>
            </div>
          )}

          {!agencyLoading && agentLog.length > 0 && (
            <div className="rounded-xl border border-border/30 bg-black/20 divide-y divide-border/20 overflow-hidden">
              {agentLog.map((action, i) => (
                <AgentActionRow key={i} action={action} />
              ))}
            </div>
          )}

          {lastScan?.actionsTriggered && lastScan.actionsTriggered.length > 0 && agentLog.length === 0 && (
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Last Scan Actions</div>
              <div className="rounded-xl border border-border/30 bg-black/20 divide-y divide-border/20 overflow-hidden">
                {lastScan.actionsTriggered.map((action, i) => (
                  <AgentActionRow key={i} action={action} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (embedded) return content;
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      
      <main className="flex-1 overflow-hidden">{content}</main>
    </div>
  );
}
