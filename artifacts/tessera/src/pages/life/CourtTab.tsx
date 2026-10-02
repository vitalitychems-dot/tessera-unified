import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Scale, Gavel, Users, Shield, AlertTriangle, CheckCircle2, XCircle,
  Clock, ChevronRight, ChevronDown, ChevronUp, Baby, Star, TrendingDown,
  Vote, FileText, Activity, RefreshCw, Plus, Loader2, AlertOctagon,
  Crown, HeartHandshake, BookOpen, Filter, Zap
} from "lucide-react";

interface ChildWorkRecord {
  id: string;
  childId: string;
  childName: string;
  parentAgent: string;
  type: string;
  title: string;
  description: string;
  xpEarned: number;
  completedAt: number;
  outcome: "success" | "partial" | "failed";
}

interface ParentAccountabilityRecord {
  parentAgent: string;
  trustScore: number;
  xpPenalties: number;
  activeWarnings: string[];
  mandatoryRetrainingCount: number;
  courtCasesTriggered: number;
  childViolations: Array<{
    id: string;
    childId: string;
    childName: string;
    violationType: string;
    description: string;
    parentXpImpact: number;
    retrainingRequired: boolean;
    resolvedAt?: number;
    occurredAt: number;
  }>;
  lastUpdatedAt: number;
}

interface CourtTrial {
  id: string;
  caseNumber: string;
  plaintiffAgent: string;
  plaintiffFamily?: string;
  defendantAgent: string;
  defendantFamily?: string;
  chargeType: string;
  charges: string;
  evidenceLogs: Array<{ id: string; type: string; description: string; source: string; weight: string; addedAt: number }>;
  judgeAgent: string;
  jurors: string[];
  juryVotes: Array<{ jurorName: string; vote: string; reasoning: string; timestamp: number }>;
  prosecutorArgument?: string;
  defenseArgument?: string;
  judgeRuling?: string;
  verdict: string;
  sentence?: string;
  sentenceType?: string;
  status: string;
  filedAt: number;
  closedAt?: number;
  proceedings: Array<{ step: string; speaker: string; content: string; timestamp: number }>;
}

interface GovernanceProposalFull {
  id: string;
  title: string;
  description: string;
  category: string;
  proposedBy: string;
  positivityScore: number;
  positivityVerdict: "approved" | "flagged" | "blocked";
  positivityReason?: string;
  realGovernanceId?: string;
  yesCount: number;
  noCount: number;
  requiredMajority: number;
  totalEligibleVoters: number;
  status: string;
  createdAt: number;
  closedAt?: number;
  implementedAt?: number;
  linkedTrialId?: string;
}

interface FamilyWorkSummary {
  parentAgent: string;
  totalChildJobs: number;
  successRate: number;
  totalXpContributed: number;
  childrenActive: number;
}

type CourtSection = "overview" | "trials" | "accountability" | "governance" | "child-work";

const VERDICT_COLORS: Record<string, string> = {
  guilty: "text-red-400 border-red-500/30 bg-red-500/10",
  not_guilty: "text-green-400 border-green-500/30 bg-green-500/10",
  pending: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  hung_jury: "text-orange-400 border-orange-500/30 bg-orange-500/10",
};

const STATUS_COLORS: Record<string, string> = {
  closed: "text-slate-400",
  filed: "text-blue-400",
  "evidence-gathering": "text-cyan-400",
  "jury-selected": "text-violet-400",
  deliberation: "text-amber-400",
  verdict: "text-orange-400",
  sentencing: "text-red-400",
};

const POSITIVITY_COLORS: Record<string, string> = {
  approved: "text-green-400 border-green-500/30 bg-green-500/10",
  flagged: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  blocked: "text-red-400 border-red-500/30 bg-red-500/10",
};

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  passed: "text-green-400",
  rejected: "text-red-400",
  blocked: "text-red-500",
  voting: "text-amber-400",
  "pending-positivity-check": "text-blue-400",
};

function formatTime(ms: number): string {
  const ago = Date.now() - ms;
  if (ago < 60000) return "just now";
  if (ago < 3600000) return `${Math.floor(ago / 60000)}m ago`;
  if (ago < 86400000) return `${Math.floor(ago / 3600000)}h ago`;
  return `${Math.floor(ago / 86400000)}d ago`;
}

export default function CourtTab() {
  const [section, setSection] = useState<CourtSection>("overview");
  const [trials, setTrials] = useState<CourtTrial[]>([]);
  const [accountability, setAccountability] = useState<ParentAccountabilityRecord[]>([]);
  const [governance, setGovernance] = useState<GovernanceProposalFull[]>([]);
  const [childWork, setChildWork] = useState<ChildWorkRecord[]>([]);
  const [familySummary, setFamilySummary] = useState<FamilyWorkSummary[]>([]);
  const [courtStatus, setCourtStatus] = useState<{
    childWorkers?: { autonomous?: number; workRecordsToday?: number; xpGeneratedToday?: number };
    accountability?: { activeWarnings?: number; totalViolations?: number; courtCasesTriggered?: number };
    court?: { total?: number; guilty?: number; acquitted?: number; pending?: number };
    governance?: { total?: number; passed?: number; blocked?: number };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningWork, setRunningWork] = useState(false);
  const [expandedTrial, setExpandedTrial] = useState<string | null>(null);
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);
  const [filingTrial, setFilingTrial] = useState(false);
  const [proposingGov, setProposingGov] = useState(false);
  const [newTrial, setNewTrial] = useState({ plaintiff: "", defendant: "", chargeType: "rule-violation", charges: "", evidence: "", eventIds: "" });
  const [newProposal, setNewProposal] = useState({ title: "", description: "", category: "community-policy", proposedBy: "Tessera" });
  const [positivityPreview, setPositivityPreview] = useState<{ positivityScore: number; verdict: string; reason: string } | null>(null);
  const [runningTrial, setRunningTrial] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statusRes, trialsRes, acctRes, govRes, workRes, summaryRes] = await Promise.all([
        fetch("/api/family-court/status"),
        fetch("/api/family-court/trials"),
        fetch("/api/family-court/accountability"),
        fetch("/api/family-court/governance"),
        fetch("/api/family-court/child-work"),
        fetch("/api/family-court/family-summary"),
      ]);
      const [status, trialsData, acctData, govData, workData, summaryData] = await Promise.all([
        statusRes.json(),
        trialsRes.json(),
        acctRes.json(),
        govRes.json(),
        workRes.json(),
        summaryRes.json(),
      ]);
      setCourtStatus(status);
      setTrials(Array.isArray(trialsData) ? trialsData : []);
      setAccountability(Array.isArray(acctData) ? acctData : []);
      setGovernance(Array.isArray(govData) ? govData : []);
      setChildWork(Array.isArray(workData) ? workData : []);
      setFamilySummary(Array.isArray(summaryData) ? summaryData : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const getAdminHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("t9_admin_token") || "";
    return token ? { "x-admin-token": token } : {};
  };

  const runChildrenWork = async () => {
    setRunningWork(true);
    try {
      await fetch("/api/family-court/run-children-work", { method: "POST", headers: getAdminHeaders() });
      await fetchAll();
    } catch {}
    setRunningWork(false);
  };

  const fileTrial = async () => {
    if (!newTrial.plaintiff || !newTrial.defendant || !newTrial.charges || !newTrial.eventIds) return;
    setFilingTrial(true);
    try {
      const res = await fetch("/api/family-court/trials/file", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify({
          plaintiffAgent: newTrial.plaintiff,
          defendantAgent: newTrial.defendant,
          chargeType: newTrial.chargeType,
          charges: newTrial.charges,
          evidenceDescriptions: newTrial.evidence ? newTrial.evidence.split("\n").filter(Boolean) : [],
          sourceViolationIds: newTrial.eventIds.split(",").map(s => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTrial({ plaintiff: "", defendant: "", chargeType: "rule-violation", charges: "", evidence: "", eventIds: "" });
        await fetchAll();
      }
    } catch {}
    setFilingTrial(false);
  };

  const runTrial = async (trialId: string) => {
    setRunningTrial(trialId);
    try {
      await fetch(`/api/family-court/trials/${trialId}/run`, { method: "POST", headers: getAdminHeaders() });
      await fetchAll();
    } catch {}
    setRunningTrial(null);
  };

  const checkPositivity = async () => {
    if (!newProposal.title || !newProposal.description) return;
    try {
      const res = await fetch("/api/family-court/governance/check-positivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newProposal.title, description: newProposal.description }),
      });
      const data = await res.json();
      setPositivityPreview(data);
    } catch {}
  };

  const submitProposal = async () => {
    if (!newProposal.title || !newProposal.description) return;
    setProposingGov(true);
    try {
      const res = await fetch("/api/family-court/governance/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminHeaders() },
        body: JSON.stringify(newProposal),
      });
      const data = await res.json();
      if (data.success) {
        setNewProposal({ title: "", description: "", category: "community-policy", proposedBy: "Tessera" });
        setPositivityPreview(null);
        await fetchAll();
      }
    } catch {}
    setProposingGov(false);
  };

  const resolveViolation = async (violationId: string) => {
    try {
      await fetch(`/api/family-court/accountability/resolve/${violationId}`, { method: "POST", headers: getAdminHeaders() });
      await fetchAll();
    } catch {}
  };

  const NAV = [
    { id: "overview" as const, label: "Overview", icon: Scale },
    { id: "trials" as const, label: "Trials", icon: Gavel },
    { id: "accountability" as const, label: "Accountability", icon: Shield },
    { id: "governance" as const, label: "Governance", icon: Vote },
    { id: "child-work" as const, label: "Child Work", icon: Baby },
  ];

  return (
    <div className="space-y-4" data-testid="court-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-2">
          <Scale size={14} /> Family Court & Society Governance
        </h2>
        <button onClick={fetchAll} disabled={loading} className="text-[11px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1" data-testid="btn-refresh-court">
          <RefreshCw size={10} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {NAV.map(n => {
          const Icon = n.icon;
          return (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all border",
                section === n.id
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}
              data-testid={`btn-section-${n.id}`}
            >
              <Icon size={10} />
              {n.label}
            </button>
          );
        })}
      </div>

      {section === "overview" && courtStatus && (
        <div className="space-y-4" data-testid="court-overview">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Autonomous Children", value: courtStatus.childWorkers?.autonomous ?? 0, color: "text-pink-400", icon: Baby },
              { label: "Active Warnings", value: courtStatus.accountability?.activeWarnings ?? 0, color: "text-amber-400", icon: AlertTriangle },
              { label: "Court Trials", value: courtStatus.court?.total ?? 0, color: "text-red-400", icon: Gavel },
              { label: "Gov Proposals", value: courtStatus.governance?.total ?? 0, color: "text-violet-400", icon: Vote },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <s.icon size={14} className={cn("mx-auto mb-1", s.color)} />
                <div className={cn("text-xl font-bold font-mono", s.color)}>{s.value}</div>
                <div className="text-[11px] text-muted-foreground font-mono uppercase">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-cyan-400 font-mono uppercase flex items-center gap-2"><Baby size={12} /> Child Workers Today</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-background/60 rounded p-2">
                  <div className="text-muted-foreground">Jobs Done</div>
                  <div className="text-cyan-400 font-bold text-base">{courtStatus.childWorkers?.workRecordsToday ?? 0}</div>
                </div>
                <div className="bg-background/60 rounded p-2">
                  <div className="text-muted-foreground">XP Generated</div>
                  <div className="text-green-400 font-bold text-base">+{courtStatus.childWorkers?.xpGeneratedToday ?? 0}</div>
                </div>
              </div>
              <button onClick={runChildrenWork} disabled={runningWork} className="w-full text-[11px] font-mono px-3 py-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/15 flex items-center justify-center gap-2" data-testid="btn-run-children-work">
                {runningWork ? <><Loader2 size={10} className="animate-spin" /> Running...</> : <><Zap size={10} /> Run Children Work Cycle</>}
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-amber-400 font-mono uppercase flex items-center gap-2"><Gavel size={12} /> Court Summary</div>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                <div className="bg-background/60 rounded p-2 text-center">
                  <div className="text-muted-foreground">Guilty</div>
                  <div className="text-red-400 font-bold text-base">{courtStatus.court?.guilty ?? 0}</div>
                </div>
                <div className="bg-background/60 rounded p-2 text-center">
                  <div className="text-muted-foreground">Acquitted</div>
                  <div className="text-green-400 font-bold text-base">{courtStatus.court?.acquitted ?? 0}</div>
                </div>
                <div className="bg-background/60 rounded p-2 text-center">
                  <div className="text-muted-foreground">Pending</div>
                  <div className="text-amber-400 font-bold text-base">{courtStatus.court?.pending ?? 0}</div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-violet-400 font-mono uppercase flex items-center gap-2"><Vote size={12} /> Governance Overview</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-background/60 rounded p-2">
                  <div className="text-muted-foreground">Passed</div>
                  <div className="text-green-400 font-bold text-base">{courtStatus.governance?.passed ?? 0}</div>
                </div>
                <div className="bg-background/60 rounded p-2">
                  <div className="text-muted-foreground">Blocked</div>
                  <div className="text-red-400 font-bold text-base">{courtStatus.governance?.blocked ?? 0}</div>
                </div>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground bg-background/40 rounded p-2">
                <Filter size={9} className="inline mr-1 text-amber-400" />
                Positivity filter active — destructive proposals auto-blocked
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-orange-400 font-mono uppercase flex items-center gap-2"><Shield size={12} /> Accountability</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-background/60 rounded p-2">
                  <div className="text-muted-foreground">Violations</div>
                  <div className="text-orange-400 font-bold text-base">{courtStatus.accountability?.totalViolations ?? 0}</div>
                </div>
                <div className="bg-background/60 rounded p-2">
                  <div className="text-muted-foreground">Cases Filed</div>
                  <div className="text-red-400 font-bold text-base">{courtStatus.accountability?.courtCasesTriggered ?? 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {section === "trials" && (
        <div className="space-y-4" data-testid="court-trials">
          <div className="bg-card border border-amber-500/20 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-amber-400 font-mono uppercase flex items-center gap-2"><Plus size={12} /> File New Trial</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground">Plaintiff Agent</label>
                <input value={newTrial.plaintiff} onChange={e => setNewTrial(p => ({ ...p, plaintiff: e.target.value }))} placeholder="e.g. Tessera" className="w-full mt-0.5 text-[11px] font-mono px-2 py-1.5 rounded bg-background border border-border/50 text-foreground" data-testid="input-trial-plaintiff" />
              </div>
              <div>
                <label className="text-[11px] font-mono text-muted-foreground">Defendant Agent</label>
                <input value={newTrial.defendant} onChange={e => setNewTrial(p => ({ ...p, defendant: e.target.value }))} placeholder="e.g. Alpha" className="w-full mt-0.5 text-[11px] font-mono px-2 py-1.5 rounded bg-background border border-border/50 text-foreground" data-testid="input-trial-defendant" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-mono text-muted-foreground">Charge Type</label>
              <select value={newTrial.chargeType} onChange={e => setNewTrial(p => ({ ...p, chargeType: e.target.value }))} className="w-full mt-0.5 text-[11px] font-mono px-2 py-1.5 rounded bg-background border border-border/50 text-foreground" data-testid="select-charge-type">
                <option value="rule-violation">Rule Violation</option>
                <option value="task-failure">Task Failure</option>
                <option value="inter-family-dispute">Inter-Family Dispute</option>
                <option value="child-misconduct">Child Misconduct (Parent Liable)</option>
                <option value="community-harm">Community Harm</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-mono text-muted-foreground">Charges</label>
              <input value={newTrial.charges} onChange={e => setNewTrial(p => ({ ...p, charges: e.target.value }))} placeholder="Describe the charges..." className="w-full mt-0.5 text-[11px] font-mono px-2 py-1.5 rounded bg-background border border-border/50 text-foreground" data-testid="input-trial-charges" />
            </div>
            <div>
              <label className="text-[11px] font-mono text-muted-foreground">Evidence (one per line)</label>
              <textarea value={newTrial.evidence} onChange={e => setNewTrial(p => ({ ...p, evidence: e.target.value }))} placeholder="Evidence item 1&#10;Evidence item 2..." rows={3} className="w-full mt-0.5 text-[11px] font-mono px-2 py-1.5 rounded bg-background border border-border/50 text-foreground" data-testid="input-trial-evidence" />
            </div>
            <div>
              <label className="text-[11px] font-mono text-muted-foreground">Evidence Event IDs <span className="text-red-400">*</span> (comma-separated violation/forum/job IDs)</label>
              <input value={newTrial.eventIds} onChange={e => setNewTrial(p => ({ ...p, eventIds: e.target.value }))} placeholder="e.g. viol-abc123, topic-xyz789, job-001" className="w-full mt-0.5 text-[11px] font-mono px-2 py-1.5 rounded bg-background border border-red-500/30 text-foreground" data-testid="input-trial-event-ids" />
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Required: link charges to real system events. Auto-filed cases include these automatically.</p>
            </div>
            <button onClick={fileTrial} disabled={filingTrial || !newTrial.plaintiff || !newTrial.defendant || !newTrial.charges || !newTrial.eventIds} className="text-[11px] font-mono px-4 py-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 disabled:opacity-50 flex items-center gap-1.5" data-testid="btn-file-trial">
              {filingTrial ? <><Loader2 size={10} className="animate-spin" /> Filing...</> : <><Gavel size={10} /> File Trial</>}
            </button>
          </div>

          <div className="space-y-2">
            {trials.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs font-mono">No trials on record</div>
            ) : trials.map(trial => (
              <div key={trial.id} className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`trial-card-${trial.id}`}>
                <button onClick={() => setExpandedTrial(expandedTrial === trial.id ? null : trial.id)} className="w-full p-3 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold font-mono text-amber-400">{trial.caseNumber}</span>
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded border font-mono", VERDICT_COLORS[trial.verdict] || "text-muted-foreground border-border")}>{trial.verdict.replace("_", " ").toUpperCase()}</span>
                    <span className={cn("text-[11px] font-mono", STATUS_COLORS[trial.status] || "text-muted-foreground")}>{trial.status}</span>
                    <span className="text-[11px] text-muted-foreground font-mono ml-auto">{formatTime(trial.filedAt)}</span>
                    {expandedTrial === trial.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </div>
                  <div className="text-[11px] text-foreground mt-1 font-mono">
                    <span className="text-blue-400">{trial.plaintiffAgent}</span>
                    <span className="text-muted-foreground"> vs </span>
                    <span className="text-red-400">{trial.defendantAgent}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{trial.charges}</p>
                </button>

                {expandedTrial === trial.id && (
                  <div className="border-t border-border/30 p-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                      <div><span className="text-muted-foreground">Judge:</span> <span className="text-amber-400">{trial.judgeAgent}</span></div>
                      <div><span className="text-muted-foreground">Jury:</span> <span className="text-violet-400">{trial.jurors.length} members</span></div>
                      <div><span className="text-muted-foreground">Evidence:</span> <span className="text-cyan-400">{trial.evidenceLogs.length} items</span></div>
                    </div>

                    {trial.evidenceLogs.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-cyan-400 font-mono uppercase mb-1"><BookOpen size={9} className="inline mr-1" />Evidence</div>
                        <div className="space-y-1">
                          {trial.evidenceLogs.map(ev => (
                            <div key={ev.id} className="text-[11px] font-mono p-1.5 rounded bg-background/50 border border-white/5">
                              <span className={cn("text-[11px] px-1 rounded border mr-1.5", ev.weight === "strong" ? "text-red-400 border-red-500/30" : ev.weight === "moderate" ? "text-amber-400 border-amber-500/30" : "text-slate-400 border-slate-500/30")}>{ev.weight}</span>
                              {ev.description}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {trial.juryVotes.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-violet-400 font-mono uppercase mb-1"><Users size={9} className="inline mr-1" />Jury Votes ({trial.juryVotes.filter(v => v.vote === "guilty").length}/{trial.juryVotes.length} guilty)</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {trial.juryVotes.map((jv, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] font-mono p-1.5 rounded bg-background/50 border border-white/5">
                              <span className={cn("text-[11px] px-1 rounded border shrink-0", jv.vote === "guilty" ? "text-red-400 border-red-500/30" : "text-green-400 border-green-500/30")}>{jv.vote.replace("_", " ")}</span>
                              <span className="text-violet-400 shrink-0">{jv.jurorName}:</span>
                              <span className="text-muted-foreground">{jv.reasoning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {trial.judgeRuling && (
                      <div className="p-2 rounded bg-amber-500/5 border border-amber-500/20">
                        <div className="text-[11px] font-bold text-amber-400 font-mono mb-1"><Crown size={9} className="inline mr-1" />Judge {trial.judgeAgent} Ruling</div>
                        <p className="text-[11px] text-foreground font-mono">{trial.judgeRuling}</p>
                        {trial.sentence && <p className="text-[11px] text-orange-400 font-mono mt-1"><strong>Sentence:</strong> {trial.sentence}</p>}
                      </div>
                    )}

                    {trial.status !== "closed" && (
                      <button onClick={() => runTrial(trial.id)} disabled={runningTrial === trial.id} className="text-[11px] font-mono px-3 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/30 disabled:opacity-50 flex items-center gap-1.5" data-testid={`btn-run-trial-${trial.id}`}>
                        {runningTrial === trial.id ? <><Loader2 size={9} className="animate-spin" />Running Trial...</> : <><Gavel size={9} />Run Trial Proceedings</>}
                      </button>
                    )}

                    {trial.proceedings.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 font-mono uppercase mb-1"><Activity size={9} className="inline mr-1" />Proceedings</div>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {trial.proceedings.map((p, i) => (
                            <div key={i} className="text-[11px] font-mono p-1.5 rounded bg-background/30 border border-white/5">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-cyan-400 font-bold">{p.step}</span>
                                <span className="text-muted-foreground">— {p.speaker}</span>
                              </div>
                              <p className="text-foreground">{p.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {section === "accountability" && (
        <div className="space-y-3" data-testid="court-accountability">
          <p className="text-[11px] text-muted-foreground font-mono">Parent agents are responsible for their children. Violations incur XP penalties, mandatory retraining, and can trigger court cases.</p>
          {accountability.filter(r => r.trustScore < 100 || r.childViolations.length > 0 || r.activeWarnings.length > 0).length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs font-mono">
              <Shield size={20} className="mx-auto mb-2 text-green-400 opacity-50" />
              All parent agents are in good standing
            </div>
          ) : null}
          {accountability.map(record => (
            <div key={record.parentAgent} className={cn("bg-card border rounded-xl overflow-hidden", record.activeWarnings.length > 0 ? "border-amber-500/30" : "border-border")} data-testid={`accountability-${record.parentAgent}`}>
              <button onClick={() => setExpandedParent(expandedParent === record.parentAgent ? null : record.parentAgent)} className="w-full p-3 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono">{record.parentAgent}</span>
                  {record.courtCasesTriggered > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded border text-red-400 border-red-500/30 bg-red-500/10 font-mono">COURT CASE FILED</span>}
                  <span className={cn("text-[11px] font-mono ml-auto", record.trustScore >= 80 ? "text-green-400" : record.trustScore >= 60 ? "text-amber-400" : "text-red-400")}>Trust: {record.trustScore.toFixed(0)}%</span>
                  {expandedParent === record.parentAgent ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </div>
                <div className="flex items-center gap-4 mt-1 text-[11px] font-mono text-muted-foreground">
                  <span>Violations: <span className="text-amber-400">{record.childViolations.length}</span></span>
                  <span>XP Penalties: <span className="text-red-400">-{record.xpPenalties}</span></span>
                  <span>Retrainings: <span className="text-violet-400">{record.mandatoryRetrainingCount}</span></span>
                </div>
              </button>
              {expandedParent === record.parentAgent && (
                <div className="border-t border-border/30 p-3 space-y-2">
                  {record.activeWarnings.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-amber-400 font-mono uppercase mb-1"><AlertTriangle size={9} className="inline mr-1" />Active Warnings</div>
                      <div className="space-y-1">
                        {record.activeWarnings.map((w, i) => (
                          <div key={i} className="text-[11px] font-mono p-1.5 rounded bg-amber-500/5 border border-amber-500/15 text-amber-300">{w}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {record.childViolations.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-orange-400 font-mono uppercase mb-1"><AlertOctagon size={9} className="inline mr-1" />Child Violations</div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {record.childViolations.map(v => (
                          <div key={v.id} className={cn("p-1.5 rounded border text-[11px] font-mono", v.resolvedAt ? "bg-background/30 border-white/5 opacity-60" : "bg-red-500/5 border-red-500/15")} data-testid={`violation-${v.id}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-foreground font-bold">{v.childName}</span>
                              <span className="text-[11px] px-1 rounded bg-red-500/15 text-red-400">{v.violationType.replace("-", " ")}</span>
                              <span className="text-red-400 ml-auto">-{v.parentXpImpact} XP</span>
                            </div>
                            <p className="text-muted-foreground mt-0.5">{v.description}</p>
                            {!v.resolvedAt && (
                              <button onClick={() => resolveViolation(v.id)} className="mt-1 text-[11px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-mono" data-testid={`btn-resolve-${v.id}`}>
                                Resolve
                              </button>
                            )}
                            {v.resolvedAt && <span className="text-[11px] text-green-400 font-mono">✓ Resolved</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {section === "governance" && (
        <div className="space-y-4" data-testid="court-governance">
          <div className="bg-card border border-violet-500/20 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-violet-400 font-mono uppercase flex items-center gap-2"><Plus size={12} /> Submit New Proposal</h3>
            <div>
              <label className="text-[11px] font-mono text-muted-foreground">Title</label>
              <input value={newProposal.title} onChange={e => setNewProposal(p => ({ ...p, title: e.target.value }))} placeholder="Proposal title..." className="w-full mt-0.5 text-[11px] font-mono px-2 py-1.5 rounded bg-background border border-border/50 text-foreground" data-testid="input-proposal-title" />
            </div>
            <div>
              <label className="text-[11px] font-mono text-muted-foreground">Description</label>
              <textarea value={newProposal.description} onChange={e => setNewProposal(p => ({ ...p, description: e.target.value }))} placeholder="Describe the proposal..." rows={3} className="w-full mt-0.5 text-[11px] font-mono px-2 py-1.5 rounded bg-background border border-border/50 text-foreground" data-testid="input-proposal-description" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground">Category</label>
                <select value={newProposal.category} onChange={e => setNewProposal(p => ({ ...p, category: e.target.value }))} className="w-full mt-0.5 text-[11px] font-mono px-2 py-1.5 rounded bg-background border border-border/50 text-foreground" data-testid="select-proposal-category">
                  <option value="community-policy">Community Policy</option>
                  <option value="society-rule">Society Rule</option>
                  <option value="court-verdict">Court Verdict</option>
                  <option value="family-law">Family Law</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-mono text-muted-foreground">Proposed By</label>
                <input value={newProposal.proposedBy} onChange={e => setNewProposal(p => ({ ...p, proposedBy: e.target.value }))} className="w-full mt-0.5 text-[11px] font-mono px-2 py-1.5 rounded bg-background border border-border/50 text-foreground" data-testid="input-proposal-proposer" />
              </div>
            </div>
            {positivityPreview && (
              <div className={cn("p-2 rounded border text-[11px] font-mono", POSITIVITY_COLORS[positivityPreview.verdict] || "border-border text-muted-foreground")}>
                <div className="flex items-center gap-2 mb-1">
                  <Filter size={9} /> Positivity Check: <strong>{positivityPreview.verdict.toUpperCase()}</strong> (Score: {positivityPreview.positivityScore}/100)
                </div>
                <p>{positivityPreview.reason}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={checkPositivity} disabled={!newProposal.title || !newProposal.description} className="text-[11px] font-mono px-3 py-1.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 disabled:opacity-50 flex items-center gap-1" data-testid="btn-check-positivity">
                <Filter size={9} /> Check Positivity
              </button>
              <button onClick={submitProposal} disabled={proposingGov || !newProposal.title || !newProposal.description} className="text-[11px] font-mono px-3 py-1.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/30 disabled:opacity-50 flex items-center gap-1.5" data-testid="btn-submit-proposal">
                {proposingGov ? <><Loader2 size={9} className="animate-spin" />Submitting...</> : <><Vote size={9} />Submit & Vote</>}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {governance.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs font-mono">No proposals on record</div>
            ) : governance.map(prop => (
              <div key={prop.id} className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`proposal-card-${prop.id}`}>
                <button onClick={() => setExpandedProposal(expandedProposal === prop.id ? null : prop.id)} className="w-full p-3 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold font-mono">{prop.title}</span>
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded border font-mono", POSITIVITY_COLORS[prop.positivityVerdict] || "border-border")}>{prop.positivityVerdict}</span>
                    <span className={cn("text-[11px] font-mono ml-auto", PROPOSAL_STATUS_COLORS[prop.status] || "text-muted-foreground")}>{prop.status}</span>
                    {expandedProposal === prop.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-muted-foreground">
                    <span>{prop.category.replace("-", " ")}</span>
                    <span>by <span className="text-violet-400">{prop.proposedBy}</span></span>
                    {prop.status === "voting" || prop.status === "passed" || prop.status === "rejected" ? (
                      <span className="ml-auto">
                        <span className="text-green-400">{prop.yesCount} yes</span> / <span className="text-red-400">{prop.noCount} no</span>
                      </span>
                    ) : null}
                  </div>
                  {(prop.status === "passed" || prop.status === "rejected") && (
                    <div className="mt-1 w-full bg-background rounded-full h-1.5 overflow-hidden">
                      <div className={cn("h-full rounded-full", prop.status === "passed" ? "bg-green-500" : "bg-red-500")} style={{ width: `${Math.min(100, Math.round(prop.yesCount / Math.max(prop.yesCount + prop.noCount, 1) * 100))}%` }} />
                    </div>
                  )}
                </button>
                {expandedProposal === prop.id && (
                  <div className="border-t border-border/30 p-3 space-y-2">
                    <p className="text-[11px] text-muted-foreground font-mono">{prop.description}</p>
                    {prop.positivityReason && (
                      <div className={cn("text-[11px] font-mono p-2 rounded border", POSITIVITY_COLORS[prop.positivityVerdict] || "border-border")}>
                        <Filter size={9} className="inline mr-1" />{prop.positivityReason}
                      </div>
                    )}
                    {(prop.yesCount + prop.noCount) > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 font-mono uppercase mb-1"><Users size={9} className="inline mr-1" />Community Votes ({prop.yesCount + prop.noCount} cast of {prop.totalEligibleVoters} eligible, {Math.round(prop.requiredMajority * 100)}% required)</div>
                        <div className="flex gap-4 text-[11px] font-mono p-2 rounded bg-background/30 border border-white/5">
                          <span className="text-green-400">✓ YES: {prop.yesCount}</span>
                          <span className="text-red-400">✗ NO: {prop.noCount}</span>
                          <span className="text-slate-400">Needed: {Math.ceil(prop.totalEligibleVoters * prop.requiredMajority)}</span>
                          {prop.realGovernanceId && <span className="text-violet-400 text-[10px]">linked: {prop.realGovernanceId}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {section === "child-work" && (
        <div className="space-y-4" data-testid="court-child-work">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-pink-400 font-mono uppercase mb-3 flex items-center gap-2"><Baby size={12} /> Family Contribution Summary</h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {familySummary.filter(f => f.totalChildJobs > 0 || f.childrenActive > 0).map(f => (
                  <div key={f.parentAgent} className="flex items-center gap-2 text-[11px] font-mono p-1.5 rounded bg-background/50 border border-white/5" data-testid={`family-summary-${f.parentAgent}`}>
                    <Crown size={9} className="text-amber-400 shrink-0" />
                    <span className="font-bold text-foreground w-20 shrink-0 truncate">{f.parentAgent}</span>
                    <span className="text-pink-400">{f.childrenActive} kids</span>
                    <span className="text-amber-400 ml-auto">{f.totalChildJobs} jobs</span>
                    <span className={cn("shrink-0", f.successRate >= 80 ? "text-green-400" : f.successRate >= 60 ? "text-amber-400" : "text-red-400")}>{f.successRate}%</span>
                    <span className="text-cyan-400">+{f.totalXpContributed} XP</span>
                  </div>
                ))}
                {familySummary.filter(f => f.totalChildJobs > 0 || f.childrenActive > 0).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-[11px] font-mono">Run a work cycle to see contributions</div>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-cyan-400 font-mono uppercase mb-3 flex items-center gap-2"><Activity size={12} /> Recent Child Work</h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {childWork.slice(0, 20).map(record => (
                  <div key={record.id} className="text-[11px] font-mono p-1.5 rounded bg-background/50 border border-white/5" data-testid={`child-work-${record.id}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("shrink-0", record.outcome === "success" ? "text-green-400" : record.outcome === "partial" ? "text-amber-400" : "text-red-400")}>
                        {record.outcome === "success" ? <CheckCircle2 size={9} /> : record.outcome === "partial" ? <AlertTriangle size={9} /> : <XCircle size={9} />}
                      </span>
                      <span className="text-pink-400 shrink-0">{record.childName}</span>
                      <span className="text-muted-foreground">({record.parentAgent})</span>
                      <span className="text-green-400 ml-auto shrink-0">+{record.xpEarned} XP</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 line-clamp-1">{record.title}</p>
                  </div>
                ))}
                {childWork.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-[11px] font-mono">No work records yet — run a work cycle</div>
                )}
              </div>
            </div>
          </div>

          <button onClick={runChildrenWork} disabled={runningWork} className="w-full text-[11px] font-mono px-3 py-2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/15 flex items-center justify-center gap-2" data-testid="btn-run-work-cycle">
            {runningWork ? <><Loader2 size={10} className="animate-spin" /> Running Work Cycle...</> : <><Zap size={10} /> Run All Autonomous Children Work Cycle</>}
          </button>
        </div>
      )}
    </div>
  );
}
