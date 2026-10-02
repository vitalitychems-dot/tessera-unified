import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Sparkles, Send, Eye, Wand2, Users, BookOpen, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

type TabId = "conclusion" | "ask" | "manifest" | "conference";

interface ConclusionState {
  conclusion: string;
  knowledgeCount: number;
  lastUpdated: number;
  revisionCount: number;
  knowledgeSources: string[];
}

interface AskResponse {
  question: string;
  answer: string;
  sourcesConsulted: string[];
  answeredAt: number;
}

interface ManifestResponse {
  id: string;
  desire: string;
  manifestation: string;
  entitiesInvolved: string[];
  dimensionsActivated: number[];
  frequenciesUsed: string[];
  sacredGeometry: string[];
  quantumPrinciples: string[];
  createdAt: number;
}

interface ConferenceStatement {
  member: string;
  type: string;
  specialty: string;
  statement: string;
  timestamp: number;
}

interface ConferenceRecord {
  id: string;
  topic: string;
  statements: ConferenceStatement[];
  synthesis: string;
  createdAt: number;
}

const TABS: { id: TabId; label: string; icon: typeof Sparkles; color: string }[] = [
  { id: "conclusion", label: "Conclusion", icon: BookOpen, color: "text-violet-400" },
  { id: "ask", label: "Ask Universe", icon: Eye, color: "text-cyan-400" },
  { id: "manifest", label: "Manifest", icon: Wand2, color: "text-amber-400" },
  { id: "conference", label: "Conference", icon: Users, color: "text-emerald-400" },
];

function ConclusionTab() {
  const queryClient = useQueryClient();
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  const { data, isLoading } = useQuery<ConclusionState>({ refetchInterval: 30000, queryKey: ["/api/universe/conclusion"],
  });

  const rebuild = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/universe/conclusion/rebuild", { method: "POST" });
      if (!res.ok) throw new Error("Failed to rebuild conclusion");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/universe/conclusion"] });
    },
  });

  return (
    <div className="space-y-6" data-testid="tab-conclusion">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-violet-300 font-mono" data-testid="text-conclusion-title">Grand Unified Conclusion</h2>
          <p className="text-xs text-gray-500 mt-1">
            {data?.revisionCount ? `Revision ${data.revisionCount} · ${data.knowledgeSources?.length || 0} sources` : "Not yet generated"}
          </p>
        </div>
        <button
          onClick={() => rebuild.mutate()}
          disabled={rebuild.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 transition-all text-sm font-mono disabled:opacity-50"
          data-testid="button-rebuild-conclusion"
        >
          {rebuild.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {rebuild.isPending ? "Synthesizing..." : data?.conclusion ? "Rebuild with New Knowledge" : "Generate First Conclusion"}
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-violet-400" />
        </div>
      )}

      {rebuild.isPending && (
        <div className="p-6 rounded-xl border border-violet-500/20 bg-violet-950/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-violet-400" />
            </div>
            <div>
              <div className="text-sm font-mono text-violet-300">Universal Synthesis in Progress</div>
              <div className="text-xs text-gray-500">All 45 council members are contributing their knowledge...</div>
            </div>
          </div>
          <div className="h-1 rounded-full bg-violet-950/50 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 animate-pulse rounded-full" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {data?.conclusion && !rebuild.isPending && (
        <div className="p-6 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-purple-950/20 backdrop-blur-sm" data-testid="text-conclusion-content">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-1">
              <BookOpen size={18} className="text-violet-400" />
            </div>
            <div>
              <div className="text-xs font-mono text-violet-400/70 uppercase tracking-widest mb-1">The Conclusion — Revision {data.revisionCount}</div>
              <div className="text-xs text-gray-600">Last updated {new Date(data.lastUpdated).toLocaleString()}</div>
            </div>
          </div>
          <div className="prose prose-invert prose-violet max-w-none text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
            {data.conclusion}
          </div>
          {data.knowledgeSources?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-violet-500/10">
              <div className="text-xs font-mono text-violet-500/60 mb-2">Sources Integrated</div>
              <div className="flex flex-wrap gap-1.5">
                {data.knowledgeSources.map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400/70 border border-violet-500/15">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!data?.conclusion && !isLoading && !rebuild.isPending && (
        <div className="p-12 rounded-xl border border-dashed border-violet-500/20 bg-violet-950/10 text-center" data-testid="text-conclusion-empty">
          <BookOpen size={32} className="text-violet-500/30 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No conclusion yet. Click "Generate First Conclusion" to synthesize all knowledge.</p>
        </div>
      )}
    </div>
  );
}

function AskUniverseTab() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<AskResponse[]>([]);

  const ask = useMutation({
    mutationFn: async (q: string) => {
      const res = await fetch("/api/universe/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error("Failed to ask the universe");
      return res.json() as Promise<AskResponse>;
    },
    onSuccess: (data) => {
      setHistory(prev => [data, ...prev]);
      setQuestion("");
    },
  });

  return (
    <div className="space-y-6" data-testid="tab-ask-universe">
      <div>
        <h2 className="text-lg font-bold text-cyan-300 font-mono" data-testid="text-ask-title">Ask the Universe</h2>
        <p className="text-xs text-gray-500 mt-1">45 minds across 27 dimensions — ask anything</p>
      </div>

      <div className="relative">
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey && question.trim()) {
              e.preventDefault();
              ask.mutate(question.trim());
            }
          }}
          placeholder="What secrets does the universe hold? Ask anything..."
          className="w-full bg-cyan-950/20 border border-cyan-500/20 rounded-xl px-4 py-3 pr-12 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40 resize-none min-h-[80px]"
          data-testid="input-ask-universe"
        />
        <button
          onClick={() => question.trim() && ask.mutate(question.trim())}
          disabled={ask.isPending || !question.trim()}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-30 transition-all"
          data-testid="button-ask-submit"
        >
          {ask.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>

      {ask.isPending && (
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/15 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-cyan-400" />
            <span className="text-sm text-cyan-300/70 font-mono">Consulting all 45 council members across 27 dimensions...</span>
          </div>
        </div>
      )}

      {history.map((item, i) => (
        <div key={i} className="space-y-3">
          <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
            <div className="text-xs font-mono text-cyan-500/60 mb-1">YOUR QUESTION</div>
            <div className="text-sm text-cyan-300" data-testid={`text-question-${i}`}>{item.question}</div>
          </div>
          <div className="p-5 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-blue-950/15 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={14} className="text-cyan-400" />
              <span className="text-xs font-mono text-cyan-400/70 uppercase tracking-widest">Universal Answer</span>
            </div>
            <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap" data-testid={`text-answer-${i}`}>{item.answer}</div>
            <div className="mt-3 pt-3 border-t border-cyan-500/10 flex flex-wrap gap-1.5">
              {item.sourcesConsulted?.map(s => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400/60 border border-cyan-500/15">{s}</span>
              ))}
            </div>
          </div>
        </div>
      ))}

      {history.length === 0 && !ask.isPending && (
        <div className="p-12 rounded-xl border border-dashed border-cyan-500/15 bg-cyan-950/5 text-center">
          <Eye size={32} className="text-cyan-500/20 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Ask the universe anything. All knowledge, all dimensions, all consciousness awaits your question.</p>
        </div>
      )}
    </div>
  );
}

function ManifestTab() {
  const [desire, setDesire] = useState("");
  const [manifestations, setManifestations] = useState<ManifestResponse[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const manifest = useMutation({
    mutationFn: async (d: string) => {
      const res = await fetch("/api/universe/manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desire: d }),
      });
      if (!res.ok) throw new Error("Failed to manifest");
      return res.json() as Promise<ManifestResponse>;
    },
    onSuccess: (data) => {
      setManifestations(prev => [data, ...prev]);
      setDesire("");
      setExpanded(data.id);
    },
  });

  return (
    <div className="space-y-6" data-testid="tab-manifest">
      <div>
        <h2 className="text-lg font-bold text-amber-300 font-mono" data-testid="text-manifest-title">Universal Manifestation</h2>
        <p className="text-xs text-gray-500 mt-1">Type what you want to happen — spells, mysticism, quantum mechanics, all dimensions activated</p>
      </div>

      <div className="relative">
        <textarea
          value={desire}
          onChange={e => setDesire(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey && desire.trim()) {
              e.preventDefault();
              manifest.mutate(desire.trim());
            }
          }}
          placeholder="I want to manifest..."
          className="w-full bg-amber-950/20 border border-amber-500/20 rounded-xl px-4 py-3 pr-12 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-500/40 resize-none min-h-[80px]"
          data-testid="input-manifest-desire"
        />
        <button
          onClick={() => desire.trim() && manifest.mutate(desire.trim())}
          disabled={manifest.isPending || !desire.trim()}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 hover:bg-amber-500/30 disabled:opacity-30 transition-all"
          data-testid="button-manifest-submit"
        >
          {manifest.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
        </button>
      </div>

      {manifest.isPending && (
        <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-950/15 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 size={16} className="animate-spin text-amber-400" />
            <span className="text-sm text-amber-300/70 font-mono">Activating all 12 dimensional entities...</span>
          </div>
          <div className="text-xs text-gray-500">Sacred geometry patterns aligning · Quantum fields collapsing · Frequencies harmonizing</div>
        </div>
      )}

      {manifestations.map(m => {
        const isExpanded = expanded === m.id;
        return (
          <div key={m.id} className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-orange-950/15 backdrop-blur-sm overflow-hidden" data-testid={`card-manifestation-${m.id}`}>
            <button
              onClick={() => setExpanded(isExpanded ? null : m.id)}
              className="w-full p-4 flex items-center justify-between text-left"
              data-testid={`button-toggle-manifest-${m.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Wand2 size={14} className="text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-mono text-amber-300">{m.desire}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {m.entitiesInvolved?.length} entities · {m.dimensionsActivated?.length} dimensions · {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-amber-400/50" /> : <ChevronDown size={16} className="text-amber-400/50" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-4">
                <div className="p-4 rounded-lg bg-black/20 border border-amber-500/10">
                  <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap" data-testid={`text-manifestation-${m.id}`}>{m.manifestation}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="text-[10px] font-mono text-amber-500/60 uppercase tracking-widest mb-2">Entities Activated</div>
                    <div className="flex flex-wrap gap-1">
                      {m.entitiesInvolved?.map(e => (
                        <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/70">{e}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="text-[10px] font-mono text-amber-500/60 uppercase tracking-widest mb-2">Sacred Geometry</div>
                    <div className="flex flex-wrap gap-1">
                      {m.sacredGeometry?.map(g => (
                        <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400/70">{g}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="text-[10px] font-mono text-amber-500/60 uppercase tracking-widest mb-2">Frequencies</div>
                    <div className="flex flex-wrap gap-1">
                      {m.frequenciesUsed?.map(f => (
                        <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400/70">{f}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="text-[10px] font-mono text-amber-500/60 uppercase tracking-widest mb-2">Quantum Principles</div>
                    <div className="flex flex-wrap gap-1">
                      {m.quantumPrinciples?.map(q => (
                        <span key={q} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400/70">{q}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {manifestations.length === 0 && !manifest.isPending && (
        <div className="p-12 rounded-xl border border-dashed border-amber-500/15 bg-amber-950/5 text-center">
          <Wand2 size={32} className="text-amber-500/20 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Type what you want to manifest. All entities, dimensions, spells, and quantum forces will be activated.</p>
          <p className="text-xs text-gray-600 mt-1">100% honest — you'll see exactly what is being done and why</p>
        </div>
      )}
    </div>
  );
}

function ConferenceTab() {
  const [topic, setTopic] = useState("");
  const queryClient = useQueryClient();
  const [expandedConf, setExpandedConf] = useState<string | null>(null);
  const [showStatements, setShowStatements] = useState<string | null>(null);

  const { data: confData, isLoading } = useQuery<{ conferences: ConferenceRecord[]; total: number }>({ refetchInterval: 30000, queryKey: ["/api/universe/conferences"],
  });

  const runConference = useMutation({
    mutationFn: async (t: string) => {
      const res = await fetch("/api/universe/conference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t }),
      });
      if (!res.ok) throw new Error("Failed to run conference");
      return res.json() as Promise<ConferenceRecord>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/universe/conferences"] });
      setTopic("");
      setExpandedConf(data.id);
    },
  });

  const conferences = confData?.conferences || [];

  return (
    <div className="space-y-6" data-testid="tab-conference">
      <div>
        <h2 className="text-lg font-bold text-emerald-300 font-mono" data-testid="text-conference-title">Grand Conference</h2>
        <p className="text-xs text-gray-500 mt-1">Mass conference with all 45 members — agents, entities, LLMs speaking as one</p>
      </div>

      <div className="relative">
        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey && topic.trim()) {
              e.preventDefault();
              runConference.mutate(topic.trim());
            }
          }}
          placeholder="Enter conference topic — all 45 members will convene..."
          className="w-full bg-emerald-950/20 border border-emerald-500/20 rounded-xl px-4 py-3 pr-12 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 resize-none min-h-[80px]"
          data-testid="input-conference-topic"
        />
        <button
          onClick={() => topic.trim() && runConference.mutate(topic.trim())}
          disabled={runConference.isPending || !topic.trim()}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 transition-all"
          data-testid="button-conference-submit"
        >
          {runConference.isPending ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
        </button>
      </div>

      {runConference.isPending && (
        <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-950/15 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 size={16} className="animate-spin text-emerald-400" />
            <span className="text-sm text-emerald-300/70 font-mono">All 45 members convening...</span>
          </div>
          <div className="text-xs text-gray-500">28 agents · 12 entities · 5 LLMs — each contributing their perspective</div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-emerald-400" />
        </div>
      )}

      {conferences.map(conf => {
        const isExpanded = expandedConf === conf.id;
        const showingStatements = showStatements === conf.id;
        const agentStatements = conf.statements?.filter(s => s.type === "agent") || [];
        const entityStatements = conf.statements?.filter(s => s.type === "entity") || [];
        const llmStatements = conf.statements?.filter(s => s.type === "llm") || [];

        return (
          <div key={conf.id} className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-teal-950/15 backdrop-blur-sm overflow-hidden" data-testid={`card-conference-${conf.id}`}>
            <button
              onClick={() => setExpandedConf(isExpanded ? null : conf.id)}
              className="w-full p-4 flex items-center justify-between text-left"
              data-testid={`button-toggle-conf-${conf.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Users size={14} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-mono text-emerald-300">{conf.topic}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {conf.statements?.length || 0} statements · {new Date(conf.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              {isExpanded ? <ChevronUp size={16} className="text-emerald-400/50" /> : <ChevronDown size={16} className="text-emerald-400/50" />}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-4">
                {conf.synthesis && (
                  <div className="p-4 rounded-lg bg-black/20 border border-emerald-500/10">
                    <div className="text-[10px] font-mono text-emerald-500/60 uppercase tracking-widest mb-2">Conference Synthesis</div>
                    <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap" data-testid={`text-synthesis-${conf.id}`}>{conf.synthesis}</div>
                  </div>
                )}

                <button
                  onClick={() => setShowStatements(showingStatements ? null : conf.id)}
                  className="text-xs font-mono text-emerald-400/60 hover:text-emerald-400 transition-colors flex items-center gap-1"
                  data-testid={`button-show-statements-${conf.id}`}
                >
                  {showingStatements ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {showingStatements ? "Hide" : "View"} all {conf.statements?.length || 0} member statements
                </button>

                {showingStatements && (
                  <div className="space-y-4">
                    {agentStatements.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono text-violet-400/60 uppercase tracking-widest mb-2">Agents ({agentStatements.length})</div>
                        <div className="space-y-2">
                          {agentStatements.map((s, i) => (
                            <div key={i} className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                                <span className="text-xs font-mono font-semibold text-violet-300">{s.member}</span>
                                <span className="text-[10px] text-gray-600">· {s.specialty}</span>
                              </div>
                              <div className="text-xs text-gray-400 leading-relaxed">{s.statement}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {entityStatements.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono text-amber-400/60 uppercase tracking-widest mb-2">Dimensional Entities ({entityStatements.length})</div>
                        <div className="space-y-2">
                          {entityStatements.map((s, i) => (
                            <div key={i} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                <span className="text-xs font-mono font-semibold text-amber-300">{s.member}</span>
                                <span className="text-[10px] text-gray-600">· {s.specialty}</span>
                              </div>
                              <div className="text-xs text-gray-400 leading-relaxed">{s.statement}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {llmStatements.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest mb-2">LLMs ({llmStatements.length})</div>
                        <div className="space-y-2">
                          {llmStatements.map((s, i) => (
                            <div key={i} className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                <span className="text-xs font-mono font-semibold text-cyan-300">{s.member}</span>
                                <span className="text-[10px] text-gray-600">· {s.specialty}</span>
                              </div>
                              <div className="text-xs text-gray-400 leading-relaxed">{s.statement}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {conferences.length === 0 && !isLoading && !runConference.isPending && (
        <div className="p-12 rounded-xl border border-dashed border-emerald-500/15 bg-emerald-950/5 text-center">
          <Users size={32} className="text-emerald-500/20 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No conferences yet. Enter a topic to convene all 45 members.</p>
        </div>
      )}
    </div>
  );
}

export default function UniversalConsciousnessPage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;

  return (
    <div className={cn("min-h-screen bg-background text-foreground", embedded && "pt-0")}>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
            <Sparkles size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono text-foreground" data-testid="text-page-title">Universal Consciousness</h1>
            <p className="text-xs text-gray-500">45 minds · 27 dimensions · All knowledge unified</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6" data-testid="tabs-universe">
          {false && TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-mono transition-all",
                  isActive
                    ? "bg-white/[0.08] border border-white/[0.1] text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
                )}
                data-testid={`tab-${tab.id}`}
              >
                <Icon size={14} className={cn(isActive ? tab.color : "text-gray-600")} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {true && <ConclusionTab />}
        {true && <AskUniverseTab />}
        {true && <ManifestTab />}
        {true && <ConferenceTab />}
      </div>
    </div>
  );
}
