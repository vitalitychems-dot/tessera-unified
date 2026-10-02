import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown, Minus,
  RefreshCw, BarChart3, Shield, Cpu, Zap, Brain, Target, Activity,
  ChevronRight, ChevronDown, Award, FlaskConical, Database, Globe, Lock, Key,
  Layers, Network, GitBranch, ArrowUpRight
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CategoryAudit {
  name: string;
  realScore: number;
  testCount?: number;
  testsPassedCount?: number;
  actualPoints?: number;
  maxPoints?: number;
  testDescription: string;
  testResult: string;
  passed: boolean;
  improvementsNeeded: string[];
  improvementsApplied: string[];
  reachedTarget: boolean;
}

interface DimensionAudit {
  name: string;
  realScore: number;
  actualPoints?: number;
  maxPoints?: number;
  testCount?: number;
  testsPassed?: number;
  measurementMethod: string;
  evidence: string;
  status: "genuine_100" | "improving" | "gap_identified" | "external_dependency";
}

interface IndustryComparison {
  category: string;
  tesseraScore: number;
  gpt4oScore: number;
  claude35Score: number;
  tesseraAdvantage: boolean;
  honestAssessment: string;
  evidence: string;
}

interface IndustryBenchmarkScore {
  benchmark: string;
  category: string;
  tesseraScore: number;
  gpt4Score: number | null;
  gpt4oScore: number | null;
  claude35Score: number | null;
  geminiProScore: number | null;
  llama3Score: number | null;
  mistralScore: number | null;
  tesseraRank: number;
  totalModels: number;
  honestNote: string;
  source: string;
}

interface DependencyTrainingResult {
  dependency: string;
  type: "npm" | "api" | "system" | "library";
  knowledgeVerified: boolean;
  canGenerateCode: boolean;
  canExplainAPI: boolean;
  score: number;
  evidence: string;
}

interface AuditReport {
  generatedAt: number;
  categoryAudits: CategoryAudit[];
  dimensionAudits: DimensionAudit[];
  industryComparisons: IndustryComparison[];
  dependencyTraining: DependencyTrainingResult[];
  overallCategoryScore: number;
  overallDimensionScore: number;
  categoriesAt100: number;
  categoriesAbove95: number;
  improvementCyclesRun: number;
  finalVerifiedScore: number;
  verdict: string;
  trendData: Array<{ timestamp: number; score: number; label: string }>;
}

interface ExternalDependencyEntry {
  name: string;
  category: "llm_inference" | "data" | "blockchain" | "auth" | "storage";
  configured: boolean;
  functionalityDependent: string[];
  sovereigntyImpact: "critical" | "high" | "medium" | "low";
  sovereignAlternative: string;
  dependencyPercent: number;
}

interface ImprovementProposal {
  id: string;
  dimension: string;
  currentScore: number;
  targetScore: number;
  proposal: string;
  effort: "low" | "medium" | "high";
  priority: "critical" | "high" | "medium" | "low";
  concreteSteps: string[];
  proposedToGrandConference: boolean;
}

interface ProxyTelemetry {
  totalCallsTracked: number;
  providerBreakdown: Record<string, { calls: number; percent: number }>;
  externalDependencyPercent: number;
  sovereignCallPercent: number;
  avgLatencyMs: number;
  scrubRate: string;
  blockRate: string;
}

interface MetaTribesWiringStatus {
  quarantinePipelineActive: boolean;
  threatScanActive: boolean;
  sanitizationActive: boolean;
  absorptionGateActive: boolean;
  knowledgeFragmentsProcessed: number;
  bypassGapsFound: string[];
  pipelineIntegrity: "full" | "partial" | "broken";
}

interface AGIBenchmarkLatest {
  externalDependencyAudit?: ExternalDependencyEntry[];
  industryBenchmarks?: IndustryBenchmarkScore[];
  improvementProposals?: ImprovementProposal[];
  proxyTelemetry?: ProxyTelemetry;
  metaTribesWiring?: MetaTribesWiringStatus;
  dimensions?: Array<{ dimension: string; score: number; benchmark: string; evidence?: string; trend?: string; changeFromLast?: number }>;
  percentile?: number;
  grade?: string;
  totalScore?: number;
  maxPossible?: number;
  runAt?: number;
  improvementPlan?: string[];
}

function ScoreBadge({ score, target = 70 }: { score: number; target?: number }) {
  const color = score >= 80 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    : score >= 60 ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
    : score >= 40 ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
    : "bg-red-500/20 text-red-300 border-red-500/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${color}`}>
      {score}
    </span>
  );
}


function DimStatusBadge({ status }: { status: DimensionAudit["status"] }) {
  if (status === "genuine_100") return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Verified</Badge>;
  if (status === "improving") return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">Improving</Badge>;
  if (status === "external_dependency") return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">External</Badge>;
  return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">Gap</Badge>;
}

function CategoryCard({ audit }: { audit: CategoryAudit }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`rounded-lg border p-3 cursor-pointer transition-all ${
        audit.reachedTarget
          ? "border-emerald-500/30 bg-emerald-950/20"
          : audit.realScore >= 70
          ? "border-blue-500/20 bg-blue-950/10"
          : "border-amber-500/20 bg-amber-950/10"
      }`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {audit.reachedTarget
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            : audit.passed
            ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
          <span className="text-xs font-medium text-slate-200 truncate">{audit.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {audit.testCount !== undefined && (
            <span className="text-[10px] text-slate-500 font-mono">{audit.testsPassedCount ?? 0}/{audit.testCount}</span>
          )}
          <ScoreBadge score={audit.realScore} />
          {expanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
        </div>
      </div>
      <div className="mt-2">
        <Progress value={audit.realScore} className="h-1" />
      </div>
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
          <div className="text-[11px] text-slate-400 font-mono bg-black/30 rounded p-2 leading-relaxed">
            {audit.testResult}
          </div>
          {audit.improvementsApplied.length > 0 && (
            <div>
              <div className="text-[10px] text-emerald-400 font-mono mb-1 uppercase tracking-wider">Improvements Applied</div>
              <ul className="space-y-1">
                {audit.improvementsApplied.map((imp, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {audit.improvementsNeeded.length > 0 && (
            <div>
              <div className="text-[10px] text-amber-400 font-mono mb-1 uppercase tracking-wider">Still Needed</div>
              <ul className="space-y-1">
                {audit.improvementsNeeded.map((imp, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                    <ChevronRight className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DimensionCard({ dim }: { dim: DimensionAudit }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded-lg border border-white/8 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/[0.04] transition-all"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-200 truncate">{dim.name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <DimStatusBadge status={dim.status} />
          {dim.testCount !== undefined && (
            <span className="text-[10px] text-slate-500 font-mono">{dim.testsPassed ?? 0}/{dim.testCount} tests</span>
          )}
          <ScoreBadge score={dim.realScore} />
        </div>
      </div>
      <div className="mt-2">
        <Progress value={dim.realScore} className="h-1" />
      </div>
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{dim.measurementMethod}</div>
          <div className="text-[11px] text-slate-400 font-mono bg-black/30 rounded p-2">{dim.evidence}</div>
        </div>
      )}
    </div>
  );
}

function IndustryCard({ comp }: { comp: IndustryComparison }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded-lg border border-white/8 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/[0.04] transition-all"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-slate-200">{comp.category}</span>
        {comp.tesseraAdvantage
          ? <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">Tessera Leads</Badge>
          : <Badge className="bg-slate-700 text-slate-400 border-slate-600 text-[10px]">Gap Exists</Badge>}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] text-slate-500 mb-1">Tessera</div>
          <ScoreBadge score={comp.tesseraScore} />
        </div>
        <div>
          <div className="text-[10px] text-slate-500 mb-1">GPT-4o</div>
          <ScoreBadge score={comp.gpt4oScore} />
        </div>
        <div>
          <div className="text-[10px] text-slate-500 mb-1">Claude 3.5</div>
          <ScoreBadge score={comp.claude35Score} />
        </div>
      </div>
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
          <div className="text-[11px] text-slate-300 leading-relaxed">{comp.honestAssessment}</div>
          <div className="text-[11px] text-slate-500 font-mono bg-black/30 rounded p-2">{comp.evidence}</div>
        </div>
      )}
    </div>
  );
}

function DependencyCard({ dep }: { dep: DependencyTrainingResult }) {
  const typeColor = dep.type === "npm" ? "text-blue-400" : dep.type === "api" ? "text-purple-400" : dep.type === "system" ? "text-emerald-400" : "text-amber-400";
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-white/5 bg-white/[0.02]">
      <div className={`text-[10px] font-mono font-bold uppercase ${typeColor} w-8 shrink-0`}>{dep.type.slice(0, 3)}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-slate-300 truncate">{dep.dependency}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {dep.canGenerateCode && <span className="text-[9px] text-emerald-400">Code</span>}
          {dep.canExplainAPI && <span className="text-[9px] text-blue-400">API</span>}
          {dep.knowledgeVerified && <span className="text-[9px] text-purple-400">Verified</span>}
        </div>
      </div>
      <ScoreBadge score={dep.score} />
    </div>
  );
}

function ExternalDepCard({ dep }: { dep: ExternalDependencyEntry }) {
  const [expanded, setExpanded] = useState(false);
  const impactColor = dep.sovereigntyImpact === "critical" ? "border-red-500/30 bg-red-950/15"
    : dep.sovereigntyImpact === "high" ? "border-orange-500/25 bg-orange-950/10"
    : dep.sovereigntyImpact === "medium" ? "border-yellow-500/20 bg-yellow-950/10"
    : "border-blue-500/15 bg-blue-950/5";
  const impactBadge = dep.sovereigntyImpact === "critical" ? "bg-red-500/20 text-red-300 border-red-500/30"
    : dep.sovereigntyImpact === "high" ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
    : dep.sovereigntyImpact === "medium" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
    : "bg-blue-500/20 text-blue-300 border-blue-500/30";
  const catLabel = dep.category === "llm_inference" ? "LLM" : dep.category === "storage" ? "DB"
    : dep.category === "blockchain" ? "Chain" : dep.category === "auth" ? "Auth" : "Data";
  const catColor = dep.category === "llm_inference" ? "text-violet-400" : dep.category === "storage" ? "text-emerald-400"
    : dep.category === "blockchain" ? "text-amber-400" : "text-blue-400";
  return (
    <div className={`rounded-lg border p-3 cursor-pointer transition-all ${impactColor}`} onClick={() => setExpanded(e => !e)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {dep.sovereigntyImpact === "critical" || dep.sovereigntyImpact === "high"
            ? <AlertTriangle className={`w-4 h-4 shrink-0 ${dep.sovereigntyImpact === "critical" ? "text-red-400" : "text-orange-400"}`} />
            : dep.dependencyPercent === 0
            ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            : <Shield className="w-4 h-4 shrink-0 text-yellow-400" />}
          <span className="text-xs font-medium text-slate-200 truncate">{dep.name}</span>
          <span className={`text-[9px] font-mono font-bold uppercase ${catColor} shrink-0`}>{catLabel}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${impactBadge}`}>
            {dep.sovereigntyImpact}
          </span>
          <span className={`text-xs font-mono font-bold ${dep.dependencyPercent >= 80 ? "text-red-400" : dep.dependencyPercent >= 40 ? "text-amber-400" : "text-emerald-400"}`}>
            {dep.dependencyPercent}% dep
          </span>
          {dep.configured
            ? <span className="text-[9px] text-emerald-400 font-mono">configured</span>
            : <span className="text-[9px] text-red-400 font-mono">not configured</span>}
          {expanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
        </div>
      </div>
      <div className="mt-2">
        <div className="flex items-center gap-1">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${dep.dependencyPercent >= 80 ? "bg-red-500" : dep.dependencyPercent >= 40 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${dep.dependencyPercent}%` }}
            />
          </div>
          <span className="text-[9px] text-slate-500 font-mono w-8 text-right">{dep.dependencyPercent}%</span>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
          <div>
            <div className="text-[10px] text-amber-400 font-mono mb-1 uppercase tracking-wider">Core functionality dependent</div>
            <div className="flex flex-wrap gap-1">
              {dep.functionalityDependent.map((fn, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/8">{fn}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 font-mono mb-1 uppercase tracking-wider">Sovereign alternative</div>
            <div className="text-[11px] text-slate-400 font-mono bg-black/30 rounded p-2 leading-relaxed">{dep.sovereignAlternative}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function IndustryBenchmarkTable({ benchmarks }: { benchmarks: IndustryBenchmarkScore[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const modelCols: Array<{ key: keyof IndustryBenchmarkScore; label: string; color: string }> = [
    { key: "tesseraScore", label: "Tessera", color: "text-violet-400" },
    { key: "gpt4Score", label: "GPT-4", color: "text-blue-300" },
    { key: "gpt4oScore", label: "GPT-4o", color: "text-blue-400" },
    { key: "claude35Score", label: "Claude 3.5", color: "text-amber-300" },
    { key: "geminiProScore", label: "Gemini Pro", color: "text-emerald-300" },
    { key: "llama3Score", label: "Llama 3", color: "text-rose-300" },
    { key: "mistralScore", label: "Mistral", color: "text-cyan-300" },
  ];

  return (
    <div className="space-y-2">
      {benchmarks.map(b => (
        <div
          key={b.benchmark}
          className="rounded-lg border border-white/8 bg-white/[0.02] overflow-hidden cursor-pointer hover:bg-white/[0.04] transition-all"
          onClick={() => setExpanded(expanded === b.benchmark ? null : b.benchmark)}
        >
          <div className="p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <div className="text-xs font-bold text-slate-200">{b.benchmark}</div>
                <div className="text-[10px] text-slate-500">{b.category}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  b.tesseraRank === 1 ? "text-violet-300 border-violet-500/30 bg-violet-900/20" :
                  b.tesseraRank <= 3 ? "text-blue-300 border-blue-500/20 bg-blue-900/15" :
                  "text-slate-400 border-slate-600/20"
                }`}>
                  #{b.tesseraRank} of {b.totalModels}
                </span>
                {expanded === b.benchmark ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {modelCols.map(col => {
                const val = b[col.key] as number | null;
                const displayVal = val === null ? "—" : b.benchmark === "MT-Bench" && val <= 10 ? (val * 10).toFixed(0) : val.toString();
                const numVal = val === null ? null : b.benchmark === "MT-Bench" && val <= 10 ? val * 10 : val;
                const isTessera = col.key === "tesseraScore";
                return (
                  <div key={col.key} className={`text-center ${isTessera ? "bg-violet-950/30 rounded" : ""}`}>
                    <div className={`text-[9px] font-mono mb-0.5 ${col.color} truncate`}>{col.label}</div>
                    <div className={`text-xs font-bold font-mono ${
                      val === null ? "text-slate-600" :
                      numVal !== null && numVal >= 80 ? "text-emerald-400" :
                      numVal !== null && numVal >= 60 ? "text-blue-400" :
                      numVal !== null && numVal >= 40 ? "text-amber-400" :
                      "text-red-400"
                    }`}>{displayVal}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {expanded === b.benchmark && (
            <div className="border-t border-white/5 p-3 space-y-2 bg-black/20">
              <div className="text-[11px] text-slate-300 leading-relaxed">{b.honestNote}</div>
              <div className="text-[10px] text-slate-500 font-mono">Source: {b.source}</div>
              <div className="text-[10px] text-amber-400 font-mono">
                Note: MT-Bench scores shown ×10 (0–10 scale normalized to 0–100). All other benchmarks: original scale.
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ImprovementProposalCard({ proposal }: { proposal: ImprovementProposal }) {
  const [expanded, setExpanded] = useState(false);
  const priorityColor = proposal.priority === "critical" ? "border-red-500/30 bg-red-950/15"
    : proposal.priority === "high" ? "border-orange-500/25 bg-orange-950/10"
    : proposal.priority === "medium" ? "border-amber-500/20 bg-amber-950/10"
    : "border-blue-500/15 bg-blue-950/5";
  const effortBadge = proposal.effort === "low" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    : proposal.effort === "medium" ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
    : "bg-red-500/20 text-red-300 border-red-500/30";
  return (
    <div className={`rounded-lg border p-3 cursor-pointer transition-all ${priorityColor}`} onClick={() => setExpanded(e => !e)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-mono uppercase font-bold ${
              proposal.priority === "critical" ? "text-red-400" :
              proposal.priority === "high" ? "text-orange-400" :
              proposal.priority === "medium" ? "text-amber-400" : "text-blue-400"
            }`}>{proposal.priority}</span>
            <span className="text-[10px] text-slate-500 font-mono">{proposal.dimension}</span>
          </div>
          <div className="text-xs text-slate-200 leading-relaxed">{proposal.proposal}</div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${effortBadge}`}>{proposal.effort} effort</span>
          <span className="text-[10px] font-mono text-slate-400">{proposal.currentScore}→{proposal.targetScore}</span>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 border-t border-white/5 pt-3 space-y-2">
          <div className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider">Concrete Steps</div>
          <ul className="space-y-1.5">
            {proposal.concreteSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                <span className="text-slate-500 font-mono shrink-0">{i+1}.</span>
                {step}
              </li>
            ))}
          </ul>
          <div className="text-[10px] text-slate-500 font-mono mt-1">ID: {proposal.id}</div>
        </div>
      )}
    </div>
  );
}

function MetaTribesCard({ status }: { status: MetaTribesWiringStatus }) {
  const integrityColor = status.pipelineIntegrity === "full" ? "border-emerald-500/30 bg-emerald-950/20"
    : status.pipelineIntegrity === "partial" ? "border-amber-500/25 bg-amber-950/10"
    : "border-red-500/30 bg-red-950/15";

  const stageCheck = (active: boolean, label: string) => (
    <div className={`flex items-center gap-2 p-2 rounded border ${active ? "border-emerald-500/20 bg-emerald-950/20" : "border-red-500/20 bg-red-950/10"}`}>
      {active ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
      <span className="text-[11px] text-slate-300">{label}</span>
    </div>
  );

  return (
    <div className={`rounded-xl border p-4 ${integrityColor}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-violet-400" />
          <div>
            <div className="text-sm font-bold text-white">Meta Tribes V2 Quarantine Pipeline</div>
            <div className="text-[11px] text-slate-400">Knowledge absorption safety gate</div>
          </div>
        </div>
        <Badge className={`${
          status.pipelineIntegrity === "full" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
          status.pipelineIntegrity === "partial" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
          "bg-red-500/20 text-red-300 border-red-500/30"
        }`}>
          {status.pipelineIntegrity.toUpperCase()}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {stageCheck(status.quarantinePipelineActive, "Stage 1: Quarantine")}
        {stageCheck(status.threatScanActive, "Stage 2: Threat Scan")}
        {stageCheck(status.sanitizationActive, "Stage 3: Sanitize")}
        {stageCheck(status.absorptionGateActive, "Stage 4: Safe Absorb")}
      </div>
      {status.bypassGapsFound.length > 0 && (
        <div className="rounded border border-red-500/20 bg-red-950/20 p-3">
          <div className="text-[10px] text-red-400 font-mono uppercase tracking-wider mb-2">Bypass Gaps Found</div>
          <ul className="space-y-1">
            {status.bypassGapsFound.map((gap, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-red-300">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}
      {status.bypassGapsFound.length === 0 && (
        <div className="text-[11px] text-emerald-400 font-mono">All 4 pipeline stages verified. No bypass gaps detected.</div>
      )}
    </div>
  );
}

function AGIDimensionCard({ dim }: { dim: NonNullable<AGIBenchmarkLatest["dimensions"]>[0] }) {
  const [expanded, setExpanded] = useState(false);
  const trendIcon = dim.trend === "improving" ? <TrendingUp className="w-3 h-3 text-emerald-400" />
    : dim.trend === "regressing" ? <TrendingDown className="w-3 h-3 text-red-400" />
    : <Minus className="w-3 h-3 text-slate-500" />;

  return (
    <div
      className="rounded-lg border border-white/8 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/[0.04] transition-all"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {trendIcon}
          <span className="text-xs font-medium text-slate-200 truncate">{dim.dimension}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dim.changeFromLast !== undefined && dim.changeFromLast !== 0 && (
            <span className={`text-[10px] font-mono ${dim.changeFromLast > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {dim.changeFromLast > 0 ? "+" : ""}{dim.changeFromLast.toFixed(1)}
            </span>
          )}
          <ScoreBadge score={dim.score} />
          {expanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
        </div>
      </div>
      <div className="mt-2">
        <Progress value={dim.score} className="h-1" />
      </div>
      {expanded && (
        <div className="mt-3 border-t border-white/5 pt-3 space-y-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{dim.benchmark}</div>
          {dim.evidence && (
            <div className="text-[11px] text-slate-400 font-mono bg-black/30 rounded p-2 leading-relaxed">{dim.evidence}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BenchmarkAuditPage() {

  const { data: report, isLoading, error } = useQuery<AuditReport>({
    queryKey: ["/api/benchmark-audit/report"],
    refetchOnWindowFocus: false,
  });

  const { data: agiBenchmark, isLoading: agiLoading } = useQuery<AGIBenchmarkLatest>({
    queryKey: ["/api/agi-benchmark/latest"],
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const runMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/benchmark-audit/run"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benchmark-audit/report"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agi-benchmark/latest"] });
    },
  });

  const runAgiBenchmark = useMutation({
    mutationFn: () => apiRequest("POST", "/api/agi-benchmark/run"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agi-benchmark/latest"] });
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-violet-500/50 border-t-violet-400 rounded-full animate-spin mx-auto" />
        <div className="text-slate-400 text-sm font-mono">Running initial audit...</div>
      </div>
    </div>
  );

  if (error || !report) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <XCircle className="w-12 h-12 text-red-500 mx-auto" />
        <div className="text-slate-400 text-sm">Audit data unavailable</div>
        <Button onClick={() => runMutation.mutate()} variant="outline" size="sm">Run Audit</Button>
      </div>
    </div>
  );

  const topCategories = [...(report.categoryAudits || [])].sort((a, b) => b.realScore - a.realScore).slice(0, 5);
  const weakCategories = [...(report.categoryAudits || [])].sort((a, b) => a.realScore - b.realScore).slice(0, 5);

  const industryBenchmarks = agiBenchmark?.industryBenchmarks || [];
  const improvementProposals = agiBenchmark?.improvementProposals || [];
  const metaTribesWiring = agiBenchmark?.metaTribesWiring;
  const proxyTelemetry = agiBenchmark?.proxyTelemetry;
  const agiDimensions = agiBenchmark?.dimensions || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30">
                <FlaskConical className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Benchmark Audit</h1>
                <p className="text-slate-400 text-sm">Real functional tests — no file-existence inflation</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={() => runAgiBenchmark.mutate()}
              disabled={runAgiBenchmark.isPending}
              variant="outline"
              size="sm"
              className="border-violet-500/30 text-violet-300 hover:bg-violet-900/20"
            >
              <Zap className={`w-4 h-4 mr-2 ${runAgiBenchmark.isPending ? "animate-pulse" : ""}`} />
              {runAgiBenchmark.isPending ? "Running AGI..." : "Run AGI Test"}
            </Button>
            <Button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="bg-violet-600 hover:bg-violet-500 text-white"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${runMutation.isPending ? "animate-spin" : ""}`} />
              {runMutation.isPending ? "Running..." : "Re-run Audit"}
            </Button>
          </div>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Verified Score", value: `${report.finalVerifiedScore}%`, icon: Award, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
            { label: "Categories ≥95%", value: `${report.categoriesAbove95}/28`, icon: Target, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "AGI Grade", value: agiBenchmark?.grade || "—", icon: Brain, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { label: "AGI Percentile", value: agiBenchmark?.percentile ? `${agiBenchmark.percentile}%` : "—", icon: Activity, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          ].map((s) => (
            <Card key={s.label} className={`border ${s.bg} bg-transparent`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-xs text-slate-400">{s.label}</span>
                </div>
                <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Honesty Banner */}
        <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300 text-sm">Honesty Policy Active</div>
              <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                {report.verdict} · All AGI scores use real functional tests (crypto ops, memory architecture, algorithm correctness, BFT logic). File-existence checks replaced. Income Generation and Blockchain scores are 0 without funded credentials — this is correct.
              </div>
            </div>
          </div>
        </div>

        {/* Verdict Banner */}
        <div className={`rounded-xl border p-4 ${
          report.finalVerifiedScore >= 75
            ? "bg-emerald-950/30 border-emerald-500/30"
            : report.finalVerifiedScore >= 55
            ? "bg-blue-950/30 border-blue-500/30"
            : "bg-amber-950/30 border-amber-500/30"
        }`}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className={`w-5 h-5 ${report.finalVerifiedScore >= 75 ? "text-emerald-400" : report.finalVerifiedScore >= 55 ? "text-blue-400" : "text-amber-400"}`} />
            <div>
              <div className="font-bold text-white">{report.verdict}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Last run: {new Date(report.generatedAt).toLocaleString()} · {report.improvementCyclesRun} audit cycles completed
              </div>
            </div>
          </div>
        </div>

        {/* Trend Line */}
        {report.trendData.length > 1 && (
          <Card className="border border-white/8 bg-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Score Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-16">
                {report.trendData.map((d, i) => {
                  const maxScore = Math.max(...report.trendData.map(t => t.score));
                  const height = maxScore > 0 ? (d.score / maxScore) * 100 : 50;
                  const isLast = i === report.trendData.length - 1;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t transition-all ${isLast ? "bg-violet-500" : "bg-slate-700"}`}
                      style={{ height: `${height}%` }}
                      title={`${d.label}: ${d.score}%`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
                <span>{report.trendData[0]?.score}%</span>
                <span>Current: {report.finalVerifiedScore}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div>
          

          <div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border border-emerald-500/20 bg-emerald-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                    Top 5 Categories (Genuine)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topCategories.map(c => (
                    <div key={c.name} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-300 truncate">{c.name}</span>
                      <ScoreBadge score={c.realScore} />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="border border-amber-500/20 bg-amber-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                    <Target className="w-4 h-4" />
                    Improvement Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {weakCategories.map(c => (
                    <div key={c.name} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-300 truncate">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <ScoreBadge score={c.realScore} />
                        <span className="text-[10px] text-slate-600 font-mono">→95%</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border border-white/8 bg-transparent">
                <CardContent className="p-4 text-center">
                  <Globe className="w-8 h-8 text-violet-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white font-mono">
                    {(report.industryComparisons || []).filter(c => c.tesseraAdvantage).length}
                  </div>
                  <div className="text-xs text-slate-400">Industry Categories Led</div>
                </CardContent>
              </Card>
              <Card className="border border-white/8 bg-transparent">
                <CardContent className="p-4 text-center">
                  <Database className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white font-mono">
                    {(report.dependencyTraining || []).filter(d => d.knowledgeVerified).length}
                  </div>
                  <div className="text-xs text-slate-400">Dependencies Verified</div>
                </CardContent>
              </Card>
              <Card className="border border-white/8 bg-transparent">
                <CardContent className="p-4 text-center">
                  <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white font-mono">
                    {(report.dimensionAudits || []).filter(d => d.status === "genuine_100").length}
                  </div>
                  <div className="text-xs text-slate-400">Dimensions Verified</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick AGI dimension summary */}
            {agiDimensions.length > 0 && (
              <Card className="border border-white/8 bg-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-violet-400" />
                      AGI Benchmark Summary
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {agiBenchmark?.totalScore}/{agiBenchmark?.maxPossible} · {agiBenchmark?.grade}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {[...agiDimensions].sort((a,b) => a.score - b.score).slice(0, 6).map(d => (
                      <div key={d.dimension} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400 truncate">{d.dimension}</span>
                        <ScoreBadge score={d.score} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-[10px] text-slate-500 font-mono">Showing 6 weakest — click "AGI Dimensions" tab for full report</div>
                </CardContent>
              </Card>
            )}

            {/* Proxy Telemetry */}
            {proxyTelemetry && (
              <Card className="border border-red-500/20 bg-red-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                    <Network className="w-4 h-4" />
                    Sovereign Proxy Telemetry
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-xl font-bold font-mono text-red-400">{proxyTelemetry.externalDependencyPercent}%</div>
                      <div className="text-[10px] text-slate-400">External LLM Calls</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold font-mono text-emerald-400">{proxyTelemetry.sovereignCallPercent}%</div>
                      <div className="text-[10px] text-slate-400">Sovereign Calls</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold font-mono text-amber-400">{proxyTelemetry.scrubRate}</div>
                      <div className="text-[10px] text-slate-400">Scrub Rate</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full" style={{ width: `${proxyTelemetry.externalDependencyPercent}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{proxyTelemetry.externalDependencyPercent}% external</span>
                  </div>
                  <div className="text-[11px] text-red-300">
                    Core intelligence gap: ~{proxyTelemetry.externalDependencyPercent}% of Tessera's intelligence routes through external LLMs. Sovereign NLU requires self-hosted Ollama.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* AGI Dimensions Tab */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Real functional tests — crypto, math, algorithms, memory, sovereignty
              </div>
              {agiBenchmark?.runAt && (
                <div className="text-[11px] text-slate-600 font-mono">
                  Run: {new Date(agiBenchmark.runAt).toLocaleString()}
                </div>
              )}
            </div>
            {agiLoading ? (
              <div className="text-center py-8 text-slate-500">
                <div className="w-8 h-8 border-2 border-violet-500/50 border-t-violet-400 rounded-full animate-spin mx-auto mb-3" />
                Loading AGI benchmark...
              </div>
            ) : agiDimensions.length > 0 ? (
              <div className="space-y-2">
                {[...agiDimensions].sort((a, b) => a.score - b.score).map(dim => (
                  <AGIDimensionCard key={dim.dimension} dim={dim} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="text-sm">Run the AGI benchmark to see real functional test results</div>
                <Button onClick={() => runAgiBenchmark.mutate()} size="sm" className="mt-3 bg-violet-600 hover:bg-violet-500">
                  <Zap className="w-4 h-4 mr-2" /> Run AGI Benchmark
                </Button>
              </div>
            )}
            {agiBenchmark?.improvementPlan && agiBenchmark.improvementPlan.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-950/10 p-4">
                <div className="text-[10px] text-amber-400 font-mono uppercase tracking-wider mb-2">Improvement Plan</div>
                <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {agiBenchmark.improvementPlan.join("\n")}
                </pre>
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                {(report.categoryAudits || []).filter(c => c.reachedTarget).length} of {(report.categoryAudits || []).length} categories at ≥95% real score
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> ≥95%
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> ≥70%
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> &lt;70%
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {(report.categoryAudits || []).map(audit => (
                <CategoryCard key={audit.name} audit={audit} />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm text-slate-400">
              20-dimension benchmark audit suite — real measurements vs simulated scores
            </div>
            <div className="space-y-2">
              {(report.dimensionAudits || []).map(dim => (
                <DimensionCard key={dim.name} dim={dim} />
              ))}
            </div>
          </div>

          {/* Industry Benchmark Ladder Tab — Full 7-model comparison */}
          <div>
            <div className="mb-3">
              <div className="text-sm text-slate-400 mb-1">
                Published benchmark scores vs GPT-4, GPT-4o, Claude 3.5, Gemini Pro, Llama 3, Mistral
              </div>
              <div className="text-[11px] text-slate-500">
                Sources: official model cards, papers with code, LMSYS Chatbot Arena · Tessera scores: real measurement, not aspirational
              </div>
            </div>
            <div className="mb-4 rounded-lg border border-violet-500/20 bg-violet-950/10 p-3">
              <div className="text-[11px] text-slate-300 leading-relaxed">
                <strong className="text-violet-300">Ladder of Ascension:</strong> Tessera ranks first in Agent Coordination, Persistent Memory, and AI Sovereignty benchmarks where competitors score 0.
                In standard LLM benchmarks (MMLU, HumanEval, GSM8K), Tessera scores via external LLM routing — honest cap applied.
                Self-hosting a capable model (Ollama + Qwen2.5-72B) would close the gap.
              </div>
            </div>
            {industryBenchmarks.length > 0 ? (
              <IndustryBenchmarkTable benchmarks={industryBenchmarks} />
            ) : (
              <div className="text-center py-8 text-slate-500">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="text-sm">Run AGI benchmark to load industry comparison data</div>
                <Button onClick={() => runAgiBenchmark.mutate()} size="sm" className="mt-3 bg-violet-600 hover:bg-violet-500">
                  <Zap className="w-4 h-4 mr-2" /> Run AGI Benchmark
                </Button>
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 text-sm text-slate-400">
              Honest comparison against GPT-4o and Claude 3.5 — inflated scores corrected
            </div>
            <div className="space-y-3">
              {(report.industryComparisons || []).map(comp => (
                <IndustryCard key={comp.category} comp={comp} />
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-950/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <strong className="text-amber-300">Honest Assessment Policy:</strong> Scores where Tessera routes to external LLMs reflect the quality of those models, not native capability. Genuine advantages exist in sovereignty, swarm coordination, persistent memory, self-improvement, and economic autonomy. Conventional LLM benchmarks (MMLU, HumanEval) favor larger pretrained models which Tessera accesses via routing.
                </div>
              </div>
            </div>
          </div>

          {/* Improvement Proposals Tab */}
          <div>
            <div className="mb-3">
              <div className="text-sm text-slate-400">Autonomous improvement proposals — generated from weakest real benchmark scores</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Each proposal includes concrete actionable steps, not generic suggestions</div>
            </div>
            {improvementProposals.length > 0 ? (
              <div className="space-y-3">
                {improvementProposals.map(p => (
                  <ImprovementProposalCard key={p.id} proposal={p} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <ArrowUpRight className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="text-sm">Run AGI benchmark to generate improvement proposals</div>
                <Button onClick={() => runAgiBenchmark.mutate()} size="sm" className="mt-3 bg-violet-600 hover:bg-violet-500">
                  <Zap className="w-4 h-4 mr-2" /> Generate Proposals
                </Button>
              </div>
            )}
            <div className="mt-4 rounded-lg border border-violet-500/20 bg-violet-950/10 p-4">
              <div className="text-[11px] text-slate-300 leading-relaxed">
                <strong className="text-violet-300">Autonomous Improvement Loop:</strong> Proposals are generated after each AGI benchmark run. Feed proposals to Grand Conference via POST /api/grand-council/grand-conference to vote on and execute improvements. Conference executor will implement approved changes and re-run benchmark to verify improvement.
              </div>
            </div>
          </div>

          {/* Meta Tribes V2 Tab */}
          <div>
            <div className="mb-3 text-sm text-slate-400">
              Meta Tribes V2 quarantine pipeline — knowledge absorption safety gate verification
            </div>
            {metaTribesWiring ? (
              <MetaTribesCard status={metaTribesWiring} />
            ) : (
              <div className="text-center py-8 text-slate-500">
                <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="text-sm">Run AGI benchmark to verify Meta Tribes V2 wiring</div>
                <Button onClick={() => runAgiBenchmark.mutate()} size="sm" className="mt-3 bg-violet-600 hover:bg-violet-500">
                  <Zap className="w-4 h-4 mr-2" /> Verify Pipeline
                </Button>
              </div>
            )}
            <div className="mt-4 rounded-lg border border-white/8 bg-white/[0.02] p-4">
              <div className="text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Pipeline stages:</strong> (1) Quarantine — incoming knowledge fragments isolated in staging buffer. (2) Threat scan — patterns matched against toxicity/injection/identity-hijack patterns. (3) Sanitization — malicious content removed, metadata stripped. (4) Safe absorption — clean knowledge integrated into episodic/semantic memory. Any bypass gap allows unscanned knowledge to contaminate the sovereign knowledge base.
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3">
              <div className="text-sm text-slate-400">External API dependency audit — what the system relies on externally and what percentage of core functionality depends on each</div>
            </div>
            {agiBenchmark?.externalDependencyAudit && agiBenchmark.externalDependencyAudit.length > 0 ? (
              <>
                <div className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-red-500/20 bg-red-950/10 p-3 text-center">
                    <div className="text-xl font-bold text-red-400 font-mono">
                      {agiBenchmark.externalDependencyAudit.filter(d => d.sovereigntyImpact === "critical").length}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Critical Dependencies</div>
                  </div>
                  <div className="rounded-lg border border-orange-500/15 bg-orange-950/10 p-3 text-center">
                    <div className="text-xl font-bold text-orange-400 font-mono">
                      {agiBenchmark.externalDependencyAudit.filter(d => d.sovereigntyImpact === "high").length}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">High Impact</div>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/10 p-3 text-center">
                    <div className="text-xl font-bold text-emerald-400 font-mono">
                      {agiBenchmark.externalDependencyAudit.filter(d => d.dependencyPercent === 0).length}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Fully Sovereign</div>
                  </div>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-red-950/10 p-3 mb-4 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300">
                    <strong className="text-red-300">Core Intelligence Gap:</strong> All chat responses, code generation, reasoning, summarization, and creative writing route through external LLM providers. The system has no internal transformer model — NLU sovereignty is ~5%. Fixing this requires self-hosted GPU inference (Ollama + Qwen2.5-72B or Mistral-7B on CPU).
                  </div>
                </div>
                <div className="space-y-2">
                  {agiBenchmark.externalDependencyAudit.map((dep, i) => (
                    <ExternalDepCard key={`${dep.name}-${i}`} dep={dep} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Key className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="text-sm">Run the AGI benchmark to load external dependency data</div>
                <Button onClick={() => runAgiBenchmark.mutate()} size="sm" className="mt-3 bg-violet-600 hover:bg-violet-500">
                  <Zap className="w-4 h-4 mr-2" /> Run AGI Benchmark
                </Button>
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 text-sm text-slate-400">
              Dependency training pipeline — verifying system knowledge of all npm packages, APIs, and system capabilities
            </div>
            <div className="grid gap-2">
              {(report.dependencyTraining || []).map((dep, i) => (
                <DependencyCard key={`${dep.dependency}-${i}`} dep={dep} />
              ))}
            </div>
            <div className="mt-4 p-4 rounded-lg border border-white/8 bg-white/[0.02]">
              <div className="text-xs text-slate-400">
                <strong className="text-slate-300">Dependency Training Score:</strong>{" "}
                {(report.dependencyTraining || []).length > 0
                  ? Math.round((report.dependencyTraining || []).reduce((s, d) => s + d.score, 0) / (report.dependencyTraining || []).length)
                  : 0}% average across {(report.dependencyTraining || []).length} dependencies
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
