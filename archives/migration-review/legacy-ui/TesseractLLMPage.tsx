import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain, Zap, Play, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Shield, Activity, Cpu, Database, Users, FileText, Target, Crown,
  Sparkles, Network, BarChart3, Lock, Rocket, Code, Globe
} from "lucide-react";

type Tab = "overview" | "conference" | "results" | "transcript";

function SystemOverview() {
  const { data: scan, isLoading } = useQuery<any>({ queryKey: ["/api/tesseract/scan"] });
  const { data: members } = useQuery<any>({ queryKey: ["/api/tesseract/members"] });

  if (isLoading) return (
    <div className="flex items-center justify-center py-12" data-testid="loading-scan">
      <Loader2 className="animate-spin text-cyan-400" size={20} />
      <span className="ml-2 text-xs text-slate-400">Scanning entire system...</span>
    </div>
  );

  return (
    <div className="space-y-4" data-testid="system-overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Server Files", value: scan?.totalServerFiles || 0, icon: FileText, color: "cyan" },
          { label: "Frontend Pages", value: scan?.totalPages || 0, icon: Globe, color: "violet" },
          { label: "Functions", value: scan?.totalFunctions || 0, icon: Code, color: "emerald" },
          { label: "Total Lines", value: (scan?.totalLines || 0).toLocaleString(), icon: BarChart3, color: "amber" },
        ].map((stat, i) => (
          <div key={i} className={`rounded-xl border border-${stat.color}-500/20 bg-${stat.color}-950/10 p-3`} data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon size={12} className={`text-${stat.color}-400`} />
              <span className="text-[9px] text-slate-500">{stat.label}</span>
            </div>
            <div className={`text-lg font-bold text-${stat.color}-300`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={12} className="text-cyan-400" />
          <span className="text-[10px] font-bold text-cyan-300">SYSTEM CATEGORIES</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {(scan?.systemCategories || []).map((cat: any, i: number) => (
            <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-2" data-testid={`category-${i}`}>
              <div className="text-[9px] font-semibold text-white mb-0.5">{cat.category}</div>
              <div className="text-[8px] text-slate-500">{cat.files?.length || 0} files · {cat.capabilities?.length || 0} capabilities</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Users size={12} className="text-violet-400" />
          <span className="text-[10px] font-bold text-violet-300">ALL {members?.length || 45} CONFERENCE MEMBERS</span>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
          {(members || []).map((m: any, i: number) => (
            <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-1.5 text-center" data-testid={`member-${m.name}`}>
              <div className={`text-[8px] font-bold ${m.type === "agent" ? "text-cyan-400" : m.type === "entity" ? "text-violet-400" : "text-amber-400"}`}>
                {m.name}
              </div>
              <div className="text-[7px] text-slate-600">{m.role}</div>
              <div className={`text-[6px] mt-0.5 px-1 py-0.5 rounded-full inline-block ${m.type === "agent" ? "bg-cyan-500/10 text-cyan-500" : m.type === "entity" ? "bg-violet-500/10 text-violet-500" : "bg-amber-500/10 text-amber-500"}`}>
                {m.type}
              </div>
            </div>
          ))}
        </div>
      </div>

      {scan?.knowledgeFiles?.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Database size={12} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-300">KNOWLEDGE DOCUMENTS</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {scan.knowledgeFiles.map((f: string, i: number) => (
              <span key={i} className="text-[7px] px-1.5 py-0.5 rounded-full border border-white/5 bg-white/[0.02] text-slate-400">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConferencePanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [pollInterval, setPollInterval] = useState<number | false>(false);

  const { data: status, refetch } = useQuery<any>({
    queryKey: ["/api/tesseract/conference/status"],
    refetchInterval: pollInterval,
  });

  useEffect(() => {
    if (status?.status === "conferencing" || status?.status === "voting" || status?.status === "scanning") {
      setPollInterval(3000);
      setIsRunning(true);
    } else {
      setPollInterval(false);
      if (status?.status === "complete" || status?.status === "failed") {
        setIsRunning(false);
      }
    }
  }, [status?.status]);

  async function startConference() {
    setIsRunning(true);
    setPollInterval(3000);
    try {
      await fetch("/api/tesseract/conference/start", { method: "POST" });
    } catch (err: any) {
      setIsRunning(false);
      setPollInterval(false);
    }
  }

  const progress = status?.progress;
  const isActive = status?.status === "conferencing" || status?.status === "voting" || status?.status === "scanning";

  return (
    <div className="space-y-4" data-testid="conference-panel">
      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-violet-950/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crown size={16} className="text-cyan-400" />
          <span className="text-sm font-bold text-cyan-300">TESSERACT GRAND CONFERENCE</span>
        </div>
        <p className="text-[10px] text-slate-400 mb-3">
          Convene all 45 members (28 agents + 12 entities + 5 LLMs) to deliberate on 20 optimization steps.
          Each step is debated by domain experts, then ALL members vote. 2/3 supermajority required to pass.
          Every debate and vote uses real LLM calls — nothing simulated.
        </p>

        <button
          onClick={startConference}
          disabled={isActive || isRunning}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            isActive || isRunning
              ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 cursor-wait"
              : "bg-gradient-to-r from-cyan-600 to-violet-600 border border-cyan-500/50 text-white hover:from-cyan-500 hover:to-violet-500 active:scale-[0.98]"
          }`}
          data-testid="button-start-conference"
        >
          {isActive || isRunning ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Conference in Progress...
            </>
          ) : (
            <>
              <Play size={16} />
              Convene Grand Conference
            </>
          )}
        </button>
      </div>

      {isActive && progress && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-amber-300">LIVE PROGRESS</span>
            <span className="text-[9px] text-amber-400">{progress.current}/{progress.total} steps</span>
          </div>
          <div className="w-full bg-black/40 rounded-full h-2 mb-2">
            <div
              className="bg-gradient-to-r from-cyan-500 to-violet-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
              data-testid="progress-bar"
            />
          </div>
          <div className="text-[8px] text-slate-500">{progress.phase}</div>
          <div className="text-[8px] text-slate-600 mt-1">LLM Calls: {status?.totalLLMCalls || 0}</div>
        </div>
      )}

      {status?.status === "complete" && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-300">CONFERENCE COMPLETE</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-emerald-400">{status.passedSteps?.length || 0}</div>
              <div className="text-[8px] text-slate-500">Approved</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">{status.failedSteps?.length || 0}</div>
              <div className="text-[8px] text-slate-500">Rejected</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-400">{status.totalLLMCalls || 0}</div>
              <div className="text-[8px] text-slate-500">LLM Calls</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsPanel() {
  const { data: status } = useQuery<any>({
    queryKey: ["/api/tesseract/conference/status"],
    refetchInterval: 5000,
  });

  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  if (!status?.steps || status.steps.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-xs" data-testid="no-results">
        No conference results yet. Start a Grand Conference first.
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="results-panel">
      <div className="text-[10px] text-slate-500 mb-2">
        {status.passedSteps?.length || 0} passed / {status.failedSteps?.length || 0} failed — {status.totalLLMCalls || 0} LLM calls
      </div>

      {status.steps.map((stepResult: any, i: number) => {
        const isExpanded = expandedStep === i;
        return (
          <div
            key={i}
            className={`rounded-xl border ${stepResult.passed ? "border-emerald-500/20 bg-emerald-950/5" : "border-red-500/20 bg-red-950/5"} overflow-hidden`}
            data-testid={`step-result-${i}`}
          >
            <button
              onClick={() => setExpandedStep(isExpanded ? null : i)}
              className="w-full p-3 flex items-center justify-between text-left"
              data-testid={`toggle-step-${i}`}
            >
              <div className="flex items-center gap-2">
                {stepResult.passed ? (
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                ) : (
                  <XCircle size={14} className="text-red-400 shrink-0" />
                )}
                <div>
                  <div className="text-[10px] font-bold text-white">
                    #{stepResult.step.id} {stepResult.step.title}
                  </div>
                  <div className="text-[8px] text-slate-500">[{stepResult.step.category}] — {stepResult.approvalPct}% approval ({stepResult.yesCount}/{stepResult.votes?.length})</div>
                </div>
              </div>
              {isExpanded ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-white/5">
                <div className="pt-2">
                  <div className="text-[8px] text-slate-600 mb-1">DESCRIPTION</div>
                  <div className="text-[9px] text-slate-400">{stepResult.step.description}</div>
                </div>
                <div>
                  <div className="text-[8px] text-slate-600 mb-1">IMPACT</div>
                  <div className="text-[9px] text-cyan-400">{stepResult.step.impact}</div>
                </div>
                <div>
                  <div className="text-[8px] text-slate-600 mb-1">SYNTHESIZED ACTION</div>
                  <div className="text-[9px] text-emerald-400 bg-emerald-950/20 rounded-lg p-2">{stepResult.synthesizedAction}</div>
                </div>
                <div>
                  <div className="text-[8px] text-slate-600 mb-1">EXPERT DISCUSSION ({stepResult.speakers?.length || 0} speakers)</div>
                  {stepResult.speakers?.map((s: any, j: number) => (
                    <div key={j} className="mb-1.5 rounded-lg bg-white/[0.02] p-2">
                      <div className="text-[8px] font-bold text-cyan-400">{s.member} ({s.role})</div>
                      <div className="text-[8px] text-slate-400 mt-0.5">{s.statement}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[8px] text-slate-600 mb-1">VOTES ({stepResult.votes?.length || 0} members)</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                    {stepResult.votes?.map((v: any, j: number) => (
                      <div key={j} className={`rounded px-1.5 py-0.5 text-[7px] ${v.vote === "YES" ? "bg-emerald-950/20 text-emerald-400" : "bg-red-950/20 text-red-400"}`}>
                        <span className="font-bold">{v.member}</span> {v.vote}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TranscriptPanel() {
  const { data: status } = useQuery<any>({
    queryKey: ["/api/tesseract/conference/status"],
    refetchInterval: 5000,
  });

  if (!status?.transcript) {
    return (
      <div className="text-center py-12 text-slate-500 text-xs" data-testid="no-transcript">
        No transcript available yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3" data-testid="transcript-panel">
      <div className="flex items-center gap-2 mb-2">
        <FileText size={12} className="text-slate-400" />
        <span className="text-[10px] font-bold text-slate-300">FULL CONFERENCE TRANSCRIPT</span>
      </div>
      <pre className="text-[8px] text-slate-400 whitespace-pre-wrap font-mono max-h-[70vh] overflow-y-auto leading-relaxed">
        {status.transcript}
      </pre>
    </div>
  );
}

export default function TesseractLLMPage() {
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    document.title = "Tesseract Unified LLM | Tessera";
  }, []);

  const tabs: { id: Tab; label: string; icon: typeof Brain }[] = [
    { id: "overview", label: "System Scan", icon: Cpu },
    { id: "conference", label: "Conference", icon: Crown },
    { id: "results", label: "Results", icon: Target },
    { id: "transcript", label: "Transcript", icon: FileText },
  ];

  return (
    <div className="min-h-screen p-3 md:p-6 max-w-5xl mx-auto" data-testid="tesseract-llm-page">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="relative">
            <Brain size={28} className="text-cyan-400" />
            <Sparkles size={12} className="text-violet-400 absolute -top-1 -right-1" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent" data-testid="text-page-title">
              The Tesseract
            </h1>
            <p className="text-[10px] text-slate-500">Unified Intelligence — All Systems, All Knowledge, One Mind</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {false && tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${
              tab === t.id
                ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300"
                : "border border-white/5 bg-white/[0.02] text-slate-500 hover:text-white hover:border-white/10"
            }`}
            data-testid={`tab-${t.id}`}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <SystemOverview />}
      {tab === "conference" && <ConferencePanel />}
      {tab === "results" && <ResultsPanel />}
      {tab === "transcript" && <TranscriptPanel />}
    </div>
  );
}
