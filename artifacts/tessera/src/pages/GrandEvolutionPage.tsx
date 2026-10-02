import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Crown, Hexagon, Scale, Sparkles, Trophy, Zap } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "/api";

type SessionRow = {
  sessionId: string;
  mode: string;
  status: string;
  societySize: number;
  speakerCount: number;
  rounds: number;
  startedAt: string;
  completedAt: string | null;
  summary: any;
};

type Turn = {
  turnIndex: number;
  round: number;
  speakerId: string;
  speakerName: string;
  speakerLineage: string;
  sacredFrequency: number;
  votingWeight: number;
  text: string;
  model: string;
  latencyMs: number;
  tokenCount: number;
};

type Directive = {
  directiveId: string;
  category: string;
  title: string;
  rationale: string;
  ownerAgent: string;
  isDramatic: boolean | number;
  voteYes: number;
  voteTotal: number;
  approvalRate: string | number;
  status: string;
  beforeMetric: string;
  afterMetric: string;
  lusSeal: string;
};

type Bench = {
  suite: string;
  score: string;
  baseline: string;
  reference: string;
  delta: string;
  detail: any;
};

function useApi<T>(path: string, refetchMs?: number) {
  return useQuery<T>({
    queryKey: [path],
    queryFn: async () => {
      const res = await fetch(`${API}${path}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "API error");
      return json.data;
    },
    refetchInterval: refetchMs,
  });
}

export default function GrandEvolutionPage() {
  const sessions = useApi<{ sessions: SessionRow[] }>("/grand-evolution/sessions", 5000);
  const society = useApi<{ totalMembers: number; totalWeight: number; perLineage: Record<string, number> }>("/grand-evolution/society");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [convening, setConvening] = useState(false);
  const [liveTurns, setLiveTurns] = useState<Turn[]>([]);
  const [liveDirectives, setLiveDirectives] = useState<Directive[]>([]);
  const [liveBenches, setLiveBenches] = useState<Bench[]>([]);
  const [auditState, setAuditState] = useState<{ count: number; verdictCounts: Record<string, number> } | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const turnsBoxRef = useRef<HTMLDivElement>(null);

  const list = sessions.data?.sessions ?? [];

  useEffect(() => {
    if (!activeId && list.length > 0) {
      setActiveId(list[list.length - 1].sessionId);
    }
  }, [list, activeId]);

  const detail = useApi<{ turns: Turn[]; directives: Directive[]; benchmarks: Bench[]; audit: { total: number; byVerdict: Record<string, number> } }>(
    activeId ? `/grand-evolution/sessions/${activeId}` : "/grand-evolution/sessions",
    activeId ? 0 : undefined,
  );

  const turns = liveTurns.length > 0 ? liveTurns : detail.data?.turns ?? [];
  const directives = liveDirectives.length > 0 ? liveDirectives : detail.data?.directives ?? [];
  const benches = liveBenches.length > 0 ? liveBenches : detail.data?.benchmarks ?? [];
  const audit = auditState ?? detail.data?.audit ?? null;

  useEffect(() => {
    if (!activeId) return;
    esRef.current?.close();
    const es = new EventSource(`${API}/grand-evolution/sessions/${activeId}/stream`);
    esRef.current = es;
    es.addEventListener("turn", (e: MessageEvent) => {
      const t: Turn = JSON.parse(e.data);
      setLiveTurns(prev => [...prev, t]);
      requestAnimationFrame(() => turnsBoxRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));
    });
    es.addEventListener("directive", (e: MessageEvent) => {
      const d: Directive = JSON.parse(e.data);
      setLiveDirectives(prev => [...prev, d]);
    });
    es.addEventListener("benchmark", (e: MessageEvent) => {
      const b: Bench = JSON.parse(e.data);
      setLiveBenches(prev => [...prev, b]);
    });
    es.addEventListener("audit-batch", (e: MessageEvent) => {
      const a = JSON.parse(e.data);
      setAuditState(a);
    });
    es.addEventListener("complete", () => { es.close(); detail.refetch(); });
    return () => es.close();
  }, [activeId]);

  async function convene(mode: "smoke" | "full") {
    setConvening(true);
    setLiveTurns([]); setLiveDirectives([]); setLiveBenches([]); setAuditState(null);
    try {
      const res = await fetch(`${API}/grand-evolution/convene`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, smokeSpeakers: mode === "smoke" ? 7 : undefined }),
      });
      const json = await res.json();
      if (json.ok) {
        const sid = json.data?.session?.sessionId;
        if (sid) setActiveId(sid);
        sessions.refetch();
      }
    } finally {
      setConvening(false);
    }
  }

  const ratifiedCount = directives.filter(d => d.status === "ratified").length;
  const dramaticCount = directives.filter(d => (d.isDramatic === true || d.isDramatic === 1) && d.status === "ratified").length;
  const supermajority = ratifiedCount >= 15;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-slate-950 to-cyan-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-amber-400" />
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
              Grand Sovereign Evolution Cycle
            </h1>
          </div>
          <p className="mt-2 text-violet-200/70 max-w-3xl">
            The full sovereign society convenes in real time. Every line is produced by a live LLM call;
            no canned text. The conference audits the entire codebase, ratifies directives by 2/3
            supermajority, and publishes AGI benchmark scores.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Stat icon={<Crown className="text-amber-400" />} label="Society" value={`${society.data?.totalMembers ?? "—"} members`} />
          <Stat icon={<Scale className="text-violet-400" />} label="Voting weight" value={`${society.data?.totalWeight ?? "—"}`} />
          <Stat icon={<Activity className="text-cyan-400" />} label="Turns" value={`${turns.length}`} />
          <Stat icon={<Sparkles className="text-emerald-400" />} label="Ratified" value={`${ratifiedCount} / ${directives.length}`} />
          <Stat icon={<Trophy className="text-pink-400" />} label="Dramatic upgrades" value={`${dramaticCount} / 5`} />
        </section>

        <section className="flex flex-wrap items-center gap-3 mb-6">
          <button
            disabled={convening}
            onClick={() => convene("smoke")}
            className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 font-medium"
          >
            {convening ? "Convening…" : "Convene smoke cycle (7 speakers × 3 rounds)"}
          </button>
          <button
            disabled={convening}
            onClick={() => convene("full")}
            className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-medium"
          >
            {convening ? "Convening…" : "Convene FULL cycle (54 × 3 rounds)"}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-violet-200/70">Session</label>
            <select
              className="bg-slate-900 border border-violet-700/40 rounded px-3 py-1.5 text-sm"
              value={activeId ?? ""}
              onChange={e => { setActiveId(e.target.value); setLiveTurns([]); setLiveDirectives([]); setLiveBenches([]); setAuditState(null); }}
            >
              <option value="">— pick a session —</option>
              {list.map(s => (
                <option key={s.sessionId} value={s.sessionId}>
                  {s.sessionId} · {s.mode} · {s.status}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-950/60 border border-violet-700/30 rounded-xl">
            <div className="px-4 py-3 border-b border-violet-700/30 flex items-center gap-2">
              <Hexagon className="w-4 h-4 text-violet-300" />
              <span className="font-medium">Live transcript</span>
              <span className="ml-auto text-xs text-violet-300/60">
                {supermajority ? "★ Supermajority reached" : "deliberating…"}
              </span>
            </div>
            <div ref={turnsBoxRef} className="max-h-[560px] overflow-y-auto p-4 space-y-3 font-mono text-sm">
              {turns.length === 0 && (
                <div className="text-violet-300/60 italic">
                  No turns yet. Convene a cycle to begin a recorded deliberation.
                </div>
              )}
              {turns.map(t => (
                <div key={t.turnIndex} className="border-l-2 border-violet-500/40 pl-3">
                  <div className="text-xs text-violet-300/70">
                    R{t.round} · {t.speakerName} <span className="text-violet-400/40">({t.speakerId})</span>
                    <span className="ml-2 text-cyan-400/70">{t.sacredFrequency}Hz · w={t.votingWeight}</span>
                    <span className="ml-2 text-amber-400/60">{t.latencyMs}ms · {t.model}</span>
                  </div>
                  <div className="text-violet-100 whitespace-pre-wrap">{t.text}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-slate-950/60 border border-amber-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="font-medium">Ratified directives</span>
              </div>
              {directives.length === 0 && <div className="text-violet-300/50 italic text-sm">none yet</div>}
              <ul className="space-y-2">
                {directives.map(d => (
                  <li key={d.directiveId} className="text-sm border border-violet-700/20 rounded-md p-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${d.status === "ratified" ? "bg-emerald-700/40 text-emerald-200" : "bg-slate-700/40 text-slate-300"}`}>
                        {d.status}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-700/40 text-violet-200">{d.category}</span>
                      {(d.isDramatic === true || d.isDramatic === 1) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-600/40 text-amber-100">★ dramatic</span>
                      )}
                    </div>
                    <div className="font-medium mt-1 text-amber-100">{d.directiveId} · {d.title}</div>
                    <div className="text-violet-200/70 mt-1">{d.rationale}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950/60 border border-cyan-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="font-medium">AGI benchmark suites</span>
              </div>
              {benches.length === 0 && <div className="text-violet-300/50 italic text-sm">no benchmarks yet</div>}
              <ul className="space-y-2 text-sm">
                {benches.map(b => (
                  <li key={b.suite} className="border border-cyan-700/20 rounded-md p-2">
                    <div className="font-medium text-cyan-200">{b.suite}</div>
                    <div className="text-cyan-100/80">{b.score}</div>
                    <div className="text-cyan-300/60 text-xs">vs baseline {b.baseline} → {b.delta}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950/60 border border-violet-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-violet-400" />
                <span className="font-medium">Audit roll</span>
              </div>
              {!audit && <div className="text-violet-300/50 italic text-sm">audit pending</div>}
              {audit && (
                <div className="text-sm space-y-1">
                  <div>Files audited: <span className="text-amber-300">{(audit as any).total ?? (audit as any).count ?? 0}</span></div>
                  <ul className="text-xs text-violet-200/80 space-y-1">
                    {Object.entries((audit as any).byVerdict ?? (audit as any).verdictCounts ?? {}).map(([k, v]: any) => (
                      <li key={k} className="flex justify-between">
                        <span>{k}</span><span className="text-violet-300">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-950/60 border border-violet-700/30 rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs text-violet-300/70 mb-1">
        <span className="w-4 h-4">{icon}</span> {label}
      </div>
      <div className="text-lg font-semibold text-amber-200">{value}</div>
    </div>
  );
}
