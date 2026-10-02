import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  Brain, Zap, Play, Loader2, CheckCircle2, XCircle, MessageSquare,
  BookOpen, GraduationCap, Search, ChevronDown, ChevronUp, FileText,
  Activity, AlertTriangle, Database, Target, Shield, TrendingUp, Code
} from "lucide-react";

type Tab = "conference" | "training" | "research" | "results" | "code" | "status";

function ConferencePanel() {
  const [topic, setTopic] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: history, refetch: refetchHistory } = useQuery<any>({
    queryKey: ["/api/real-conference/history"],
    refetchInterval: 10000,
  });

  async function runQuickVote() {
    if (!topic.trim() || isRunning) return;
    setIsRunning(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/real-conference/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      setLastResult(data);
      refetchHistory();
    } catch (err: any) {
      setLastResult({ error: err?.message || "Failed" });
    } finally {
      setIsRunning(false);
    }
  }

  const presetTopics = [
    "Should Tessera build a real-time trading bot for TSRT?",
    "Should we implement neural network training in JavaScript?",
    "Should Tessera learn to generate and deploy new web applications?",
    "Should we add voice conversation capabilities using Whisper + TTS?",
    "Should we implement a recommendation engine for knowledge synthesis?",
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={12} className="text-violet-400" />
          <span className="text-[10px] font-bold text-violet-300">REAL AI CONFERENCE — ACTUAL LLM CALLS</span>
        </div>
        <p className="text-[8px] text-slate-500 mb-2">Every debate and vote uses a real LLM call. Agents have unique personalities. Results are recorded as transcripts. Nothing is simulated.</p>

        <div className="flex gap-1.5 mb-2">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runQuickVote()}
            placeholder="Enter a real proposal for agents to debate and vote on..."
            className="flex-1 bg-black/40 border border-white/8 rounded-lg px-2.5 py-2 text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40"
            data-testid="input-conference-topic"
          />
          <button
            onClick={runQuickVote}
            disabled={isRunning || !topic.trim()}
            className={cn(
              "px-3 py-2 rounded-lg text-[9px] font-bold transition-all flex items-center gap-1.5",
              isRunning ? "bg-violet-500/10 border border-violet-500/20 text-violet-400" : "bg-violet-600 border border-violet-500 text-white hover:bg-violet-500 active:scale-95"
            )}
            data-testid="button-run-conference"
          >
            {isRunning ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
            {isRunning ? "Agents Debating..." : "Run Real Vote"}
          </button>
        </div>

        <div className="flex gap-1 flex-wrap">
          {presetTopics.map((t, i) => (
            <button
              key={i}
              onClick={() => setTopic(t)}
              className="text-[7px] px-1.5 py-0.5 rounded-full border border-white/5 bg-white/[0.02] text-slate-500 hover:text-white hover:border-violet-500/30 transition-all"
              data-testid={`preset-topic-${i}`}
            >
              {t.slice(0, 50)}...
            </button>
          ))}
        </div>
      </div>

      {isRunning && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3">
          <div className="flex items-center gap-2">
            <Loader2 size={12} className="animate-spin text-amber-400" />
            <span className="text-[10px] font-bold text-amber-300">LIVE — Agents are using real AI to debate and vote</span>
          </div>
          <p className="text-[8px] text-slate-500 mt-1">Each agent calls the LLM with their unique personality prompt. This takes 10-30 seconds depending on the complexity.</p>
        </div>
      )}

      {lastResult && !lastResult.error && (
        <div className={cn("rounded-xl border p-3", lastResult.passed ? "border-emerald-500/20 bg-emerald-950/10" : "border-red-500/20 bg-red-950/10")}>
          <div className="flex items-center gap-2 mb-2">
            {lastResult.passed ? <CheckCircle2 size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-red-400" />}
            <span className={cn("text-[10px] font-bold", lastResult.passed ? "text-emerald-300" : "text-red-300")}>
              {lastResult.passed ? "PASSED" : "FAILED"} — {lastResult.approvalPct}% approval
            </span>
            <span className="text-[8px] text-slate-600 ml-auto">{lastResult.llmCalls} real LLM calls</span>
          </div>

          {lastResult.debate?.length > 0 && (
            <div className="mb-2">
              <p className="text-[8px] font-bold text-slate-400 mb-1">REAL DEBATE:</p>
              {lastResult.debate.map((d: any, i: number) => (
                <div key={i} className="flex gap-2 mb-1" data-testid={`debate-entry-${i}`}>
                  <span className="text-[8px] font-bold text-violet-400 shrink-0 w-16">[{d.agent}]</span>
                  <span className="text-[8px] text-slate-400">{d.argument}</span>
                </div>
              ))}
            </div>
          )}

          {lastResult.votes?.length > 0 && (
            <div>
              <p className="text-[8px] font-bold text-slate-400 mb-1">VOTES:</p>
              <div className="grid grid-cols-2 gap-1">
                {lastResult.votes.map((v: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-[8px]" data-testid={`vote-entry-${i}`}>
                    <span className={cn("font-bold", v.vote === "YES" ? "text-emerald-400" : v.vote === "NO" ? "text-red-400" : "text-slate-500")}>{v.vote}</span>
                    <span className="text-slate-500">{v.agent}</span>
                    <span className="text-slate-600 text-[7px]">({v.confidence}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lastResult.transcript && (
            <details className="mt-2">
              <summary className="text-[8px] text-slate-500 cursor-pointer hover:text-slate-300">View full transcript</summary>
              <pre className="text-[7px] text-slate-600 mt-1 whitespace-pre-wrap max-h-60 overflow-y-auto bg-black/30 rounded-lg p-2 font-mono">{lastResult.transcript}</pre>
            </details>
          )}
        </div>
      )}

      {lastResult?.error && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={12} className="text-red-400" />
            <span className="text-[10px] text-red-300">{lastResult.error}</span>
          </div>
        </div>
      )}

      {(history?.conferences?.length || 0) > 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[9px] font-bold text-slate-400 mb-2">CONFERENCE HISTORY ({history.totalConferences} total, {history.totalLLMCalls} LLM calls)</p>
          {history.conferences.map((c: any) => (
            <div key={c.id} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0 text-[8px]" data-testid={`conf-history-${c.id}`}>
              <span className="text-white font-bold truncate flex-1">{c.title}</span>
              <span className="text-emerald-400">{c.passedCount}P</span>
              <span className="text-red-400">{c.failedCount}F</span>
              <span className="text-slate-600">{c.totalLLMCalls} calls</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrainingPanel() {
  const [selectedCurriculum, setSelectedCurriculum] = useState("app-development");
  const [customQuestion, setCustomQuestion] = useState("");
  const [isTraining, setIsTraining] = useState(false);

  const { data: history, refetch } = useQuery<any>({ queryKey: ["/api/training/history"], refetchInterval: 10000 });
  const [viewSession, setViewSession] = useState<any>(null);

  async function startTraining(topic: string, questions?: string[]) {
    setIsTraining(true);
    try {
      await fetch("/api/training/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, questions }),
      });
      setTimeout(() => { refetch(); setIsTraining(false); }, 30000);
    } catch {
      setIsTraining(false);
    }
  }

  async function loadSession(id: string) {
    try {
      const res = await fetch(`/api/training/${id}`);
      const data = await res.json();
      setViewSession(data);
    } catch {}
  }

  const curricula = [
    { key: "app-development", label: "App Development", icon: Code, color: "text-emerald-400" },
    { key: "machine-learning", label: "Machine Learning", icon: Brain, color: "text-violet-400" },
    { key: "self-improvement", label: "Self-Improvement", icon: Target, color: "text-amber-400" },
    { key: "sovereign-capabilities", label: "Sovereign Platform", icon: Database, color: "text-cyan-400" },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap size={12} className="text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-300">ML TRAINING ENGINE — REAL LLM LEARNING</span>
        </div>
        <p className="text-[8px] text-slate-500 mb-2">Each training session calls the LLM with structured curriculum questions. Tessera learns real concepts, extracts takeaways, and builds a knowledge base.</p>

        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {curricula.map(c => (
            <button
              key={c.key}
              onClick={() => setSelectedCurriculum(c.key)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[9px] font-bold border transition-all",
                selectedCurriculum === c.key ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/5 bg-white/[0.02] text-slate-500 hover:text-white"
              )}
              data-testid={`curriculum-${c.key}`}
            >
              <c.icon size={10} className={c.color} />
              {c.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => startTraining(selectedCurriculum)}
          disabled={isTraining}
          className={cn(
            "w-full py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-2",
            isTraining ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 active:scale-[0.98]"
          )}
          data-testid="button-start-training"
        >
          {isTraining ? <><Loader2 size={12} className="animate-spin" /> Training in progress (real LLM calls)...</> : <><Play size={12} /> Start Training: {selectedCurriculum}</>}
        </button>

        <div className="mt-2">
          <div className="flex gap-1.5">
            <input
              value={customQuestion}
              onChange={e => setCustomQuestion(e.target.value)}
              placeholder="Ask Tessera to learn anything specific..."
              className="flex-1 bg-black/40 border border-white/8 rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40"
              data-testid="input-custom-question"
            />
            <button
              onClick={() => { if (customQuestion.trim()) startTraining("custom", [customQuestion]); }}
              disabled={isTraining || !customQuestion.trim()}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold"
              data-testid="button-custom-train"
            >
              Learn
            </button>
          </div>
        </div>
      </div>

      {(history?.sessions?.length || 0) > 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[9px] font-bold text-slate-400 mb-2">TRAINING HISTORY ({history.totalSessions} sessions, {history.totalKnowledge} knowledge entries)</p>
          {history.sessions.map((s: any) => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              className="w-full flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0 text-[8px] text-left hover:bg-white/[0.02] transition-all"
              data-testid={`training-session-${s.id}`}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.status === "complete" ? "bg-emerald-400" : "bg-amber-400 animate-pulse")} />
              <span className="text-white font-bold truncate flex-1">{s.topic}</span>
              <span className="text-slate-600">{s.lessonCount} lessons</span>
              <span className="text-violet-400">{s.avgConfidence}% conf</span>
              <span className="text-slate-600">{s.totalLLMCalls} calls</span>
            </button>
          ))}
        </div>
      )}

      {viewSession && (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-950/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-bold text-emerald-300">Session: {viewSession.topic}</p>
            <button onClick={() => setViewSession(null)} className="text-[8px] text-slate-500 hover:text-white">close</button>
          </div>
          {viewSession.lessons?.map((lesson: any, i: number) => (
            <details key={i} className="mb-2 rounded-lg bg-black/30 border border-white/5" data-testid={`lesson-${i}`}>
              <summary className="px-2.5 py-2 text-[9px] text-white font-bold cursor-pointer hover:bg-white/[0.02]">
                Lesson {i + 1}: {lesson.question.slice(0, 80)}... ({lesson.confidence}% confidence)
              </summary>
              <div className="px-2.5 pb-2 space-y-1.5">
                <p className="text-[8px] text-slate-400 whitespace-pre-wrap">{lesson.answer}</p>
                {lesson.keyTakeaways?.length > 0 && (
                  <div>
                    <p className="text-[7px] font-bold text-emerald-400 mb-0.5">KEY TAKEAWAYS:</p>
                    {lesson.keyTakeaways.map((t: string, j: number) => (
                      <p key={j} className="text-[8px] text-emerald-300/80 pl-2">• {t}</p>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function ResearchPanel() {
  const [topic, setTopic] = useState("");
  const [query, setQuery] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [lastFinding, setLastFinding] = useState<any>(null);

  const { data: findings } = useQuery<any>({ queryKey: ["/api/real-research/findings"], refetchInterval: 15000 });

  async function conductResearch() {
    if (!topic.trim() || !query.trim()) return;
    setIsResearching(true);
    try {
      const res = await fetch("/api/real-research/conduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, query }),
      });
      const data = await res.json();
      setLastFinding(data);
      queryClient.invalidateQueries({ queryKey: ["/api/real-research/findings"] });
    } finally {
      setIsResearching(false);
    }
  }

  const presets = [
    { topic: "AGI Architecture", query: "What are the most promising architectures for building AGI systems in 2024-2025?" },
    { topic: "Solana DeFi", query: "What are the best strategies for building automated trading systems on Solana?" },
    { topic: "Self-Improving AI", query: "How can an AI system implement recursive self-improvement safely?" },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Search size={12} className="text-cyan-400" />
          <span className="text-[10px] font-bold text-cyan-300">REAL AI RESEARCH — ACTUAL ANALYSIS</span>
        </div>
        <p className="text-[8px] text-slate-500 mb-2">Each research query calls the LLM for genuine analysis. No hardcoded findings. Real reasoning on real topics.</p>

        <div className="space-y-1.5 mb-2">
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Research topic..." className="w-full bg-black/40 border border-white/8 rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40" data-testid="input-research-topic" />
          <div className="flex gap-1.5">
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && conductResearch()} placeholder="Specific research question..." className="flex-1 bg-black/40 border border-white/8 rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40" data-testid="input-research-query" />
            <button onClick={conductResearch} disabled={isResearching} className="px-3 py-1.5 rounded-lg bg-cyan-600 border border-cyan-500 text-white text-[9px] font-bold active:scale-95 transition-all" data-testid="button-research">
              {isResearching ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
            </button>
          </div>
        </div>

        <div className="flex gap-1 flex-wrap">
          {presets.map((p, i) => (
            <button key={i} onClick={() => { setTopic(p.topic); setQuery(p.query); }} className="text-[7px] px-1.5 py-0.5 rounded-full border border-white/5 bg-white/[0.02] text-slate-500 hover:text-white transition-all" data-testid={`research-preset-${i}`}>
              {p.topic}
            </button>
          ))}
        </div>
      </div>

      {lastFinding && (
        <div className="rounded-xl border border-cyan-500/15 bg-cyan-950/10 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[8px] font-bold text-cyan-300">{lastFinding.agent}</span>
            <span className="text-[8px] text-slate-600">{lastFinding.topic}</span>
            <span className={cn("text-[7px] px-1 rounded-full ml-auto", lastFinding.llmUsed ? "text-emerald-300 bg-emerald-500/10" : "text-red-300 bg-red-500/10")}>
              {lastFinding.llmUsed ? "REAL LLM" : "CACHED"}
            </span>
          </div>
          <p className="text-[9px] text-slate-300 whitespace-pre-wrap mb-2">{lastFinding.analysis}</p>
          {lastFinding.keyInsights?.length > 0 && (
            <div>
              <p className="text-[7px] font-bold text-cyan-400">KEY INSIGHTS:</p>
              {lastFinding.keyInsights.map((ins: string, i: number) => (
                <p key={i} className="text-[8px] text-cyan-300/70 pl-2">• {ins}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {(findings?.findings?.length || 0) > 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <p className="text-[9px] font-bold text-slate-400 mb-2">ALL RESEARCH ({findings.total} findings, all real LLM: {findings.allUsedLLM ? "YES" : "NO"})</p>
          {findings.findings.slice(0, 10).map((f: any, i: number) => (
            <div key={i} className="py-1.5 border-b border-white/5 last:border-0" data-testid={`finding-${i}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[8px] font-bold text-cyan-300">{f.agent}</span>
                <span className="text-[7px] text-slate-600">{f.topic}</span>
                <span className="text-[7px] text-slate-600 ml-auto">{f.confidence}%</span>
              </div>
              <p className="text-[8px] text-slate-400 line-clamp-2">{f.analysis?.slice(0, 150)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPanel() {
  const { data } = useQuery<any>({ queryKey: ["/api/real-ai/status"], refetchInterval: 10000 });
  if (!data) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-600" /></div>;

  return (
    <div className="space-y-3">
      <div className={cn("rounded-xl border p-3", data.realAIEngine ? "border-emerald-500/20 bg-emerald-950/10" : "border-red-500/20 bg-red-950/10")}>
        <div className="flex items-center gap-2 mb-2">
          <Activity size={12} className={data.realAIEngine ? "text-emerald-400" : "text-red-400"} />
          <span className={cn("text-[10px] font-bold", data.realAIEngine ? "text-emerald-300" : "text-red-300")}>
            {data.realAIEngine ? "REAL AI ENGINE ACTIVE" : "ENGINE OFFLINE"}
          </span>
        </div>
        <p className="text-[8px] text-slate-500 mb-3">{data.note}</p>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Total LLM Calls", value: data.totalLLMCalls, color: "text-violet-300" },
            { label: "Conferences", value: data.conferences?.total || 0, color: "text-amber-300" },
            { label: "Training Sessions", value: data.training?.sessions || 0, color: "text-emerald-300" },
            { label: "Knowledge Entries", value: data.training?.knowledge || 0, color: "text-cyan-300" },
            { label: "Research Findings", value: data.research?.findings || 0, color: "text-indigo-300" },
            { label: "Active Agents", value: data.agents?.length || 0, color: "text-rose-300" },
          ].map((s, i) => (
            <div key={i} className="bg-black/20 rounded-lg p-2 text-center" data-testid={`status-stat-${i}`}>
              <p className={cn("text-sm font-bold font-mono", s.color)}>{s.value}</p>
              <p className="text-[7px] text-slate-600">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <p className="text-[9px] font-bold text-slate-400 mb-2">AGENT ROSTER</p>
        <div className="grid grid-cols-2 gap-1">
          {data.agents?.map((a: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5 text-[8px]" data-testid={`agent-roster-${i}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-white font-bold">{a.name}</span>
              <span className="text-slate-600">{a.role}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <p className="text-[9px] font-bold text-slate-400 mb-2">AVAILABLE TRAINING CURRICULA</p>
        {data.training?.curricula?.map((c: string, i: number) => (
          <div key={i} className="text-[8px] text-slate-400 py-0.5">• {c}</div>
        ))}
      </div>
    </div>
  );
}

function MassConferenceResultsPanel() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/conference-results"], refetchInterval: 15000 });
  const [expandedConf, setExpandedConf] = useState<string | null>(null);
  const [expandedProp, setExpandedProp] = useState<string | null>(null);

  if (isLoading) return <div className="text-center py-8 text-slate-500 text-xs">Loading results...</div>;
  if (!data?.conferences?.length) return <div className="text-center py-8 text-slate-500 text-xs">No mass conference results yet. Conferences run in background...</div>;

  return (
    <div className="space-y-3">
      {data.conferences.map((conf: any) => (
        <div key={conf.id} className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-3">
          <button onClick={() => setExpandedConf(expandedConf === conf.id ? null : conf.id)} className="w-full text-left" data-testid={`conf-result-${conf.id}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-violet-300">{conf.title}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">{conf.passed} PASSED</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">{conf.failed} FAILED</span>
                  <span className="text-[8px] text-slate-500">{conf.totalLLMCalls} LLM calls</span>
                </div>
              </div>
              {expandedConf === conf.id ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
            </div>
          </button>

          {expandedConf === conf.id && (
            <div className="mt-2 space-y-1.5 border-t border-white/5 pt-2">
              {conf.results?.map((r: any, i: number) => (
                <div key={i} className={cn("rounded-lg border p-2", r.passed ? "border-emerald-500/20 bg-emerald-950/10" : "border-red-500/20 bg-red-950/10")}>
                  <button onClick={() => setExpandedProp(expandedProp === `${conf.id}-${i}` ? null : `${conf.id}-${i}`)} className="w-full text-left">
                    <div className="flex items-center gap-2">
                      {r.passed ? <CheckCircle2 size={10} className="text-emerald-400 shrink-0" /> : <XCircle size={10} className="text-red-400 shrink-0" />}
                      <span className="text-[9px] text-white flex-1">{r.title}</span>
                      <span className="text-[8px] font-mono text-slate-400">{r.approvalPct}%</span>
                    </div>
                  </button>
                  {expandedProp === `${conf.id}-${i}` && (
                    <div className="mt-1.5 pl-4 space-y-1 border-t border-white/5 pt-1.5">
                      {r.votes?.map((v: any, vi: number) => (
                        <div key={vi} className="flex items-center gap-1.5 text-[7px]">
                          <span className={cn("font-bold", v.vote === "YES" ? "text-emerald-400" : v.vote === "NO" ? "text-red-400" : "text-slate-500")}>{v.vote}</span>
                          <span className="text-white font-medium">{v.agent}</span>
                          <span className="text-slate-600">{v.confidence}%</span>
                          <span className="text-slate-500 truncate">{v.reasoning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CodeImprovementsPanel() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/code-improvements"], refetchInterval: 10000 });

  if (isLoading) return <div className="text-center py-8 text-slate-500 text-xs">Loading...</div>;
  if (!data?.improvements?.length) return (
    <div className="text-center py-8 space-y-2">
      <Code size={24} className="text-slate-600 mx-auto" />
      <p className="text-slate-500 text-xs">No code improvements yet.</p>
      <p className="text-slate-600 text-[8px]">Run a training session to generate code improvements from learned knowledge.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Code size={12} className="text-amber-400" />
          <span className="text-[10px] font-bold text-amber-300">KNOWLEDGE → CODE PIPELINE</span>
          <span className="text-[8px] text-slate-500">{data.total} improvements generated</span>
        </div>
        {data.byTopic && Object.entries(data.byTopic).map(([topic, count]: any) => (
          <div key={topic} className="text-[8px] text-slate-400 py-0.5">
            <span className="text-amber-300">{topic}</span>: {count} improvements
          </div>
        ))}
      </div>

      {data.improvements.map((imp: any) => (
        <div key={imp.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3" data-testid={`code-improvement-${imp.id}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", imp.status === "applied" ? "bg-emerald-400" : imp.status === "approved" ? "bg-amber-400" : "bg-slate-500")} />
            <span className="text-[9px] font-bold text-white flex-1">{imp.improvement}</span>
            <span className="text-[7px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">{imp.status}</span>
          </div>
          <div className="text-[7px] text-slate-500 mb-1">From: {imp.topic} | Target: {imp.targetFile} | {imp.confidence}% confidence</div>
          {imp.codeSnippet && (
            <pre className="text-[7px] text-emerald-300/80 bg-black/40 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap font-mono">{imp.codeSnippet}</pre>
          )}
        </div>
      ))}
    </div>
  );
}

export default function RealAIConferencePage() {
  useEffect(() => { document.title = "Real AI Engine | Tessera"; }, []);
  const [tab, setTab] = useState<Tab>("conference");

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "conference", label: "Vote", icon: MessageSquare },
    { key: "results", label: "Results", icon: FileText },
    { key: "training", label: "Train", icon: GraduationCap },
    { key: "code", label: "Code", icon: Code },
    { key: "research", label: "Research", icon: Search },
    { key: "status", label: "Status", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-background text-white p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold bg-gradient-to-r from-violet-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent" data-testid="text-real-ai-title">
            REAL AI ENGINE
          </h1>
          <p className="text-[9px] text-slate-500">Every output uses actual LLM calls — no simulation, no hardcoded data</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[7px] font-bold text-emerald-300">REAL AI</span>
        </div>
      </div>

      <div className="flex gap-1 mb-3 overflow-x-auto">
        {false && TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-[9px] font-bold transition-all border whitespace-nowrap",
              tab === t.key ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "border-white/5 bg-white/[0.02] text-slate-500 hover:text-white"
            )}
            data-testid={`tab-${t.key}`}
          >
            <t.icon size={10} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "conference" && <ConferencePanel />}
      {tab === "results" && <MassConferenceResultsPanel />}
      {tab === "training" && <TrainingPanel />}
      {tab === "code" && <CodeImprovementsPanel />}
      {tab === "research" && <ResearchPanel />}
      {tab === "status" && <StatusPanel />}
    </div>
  );
}
