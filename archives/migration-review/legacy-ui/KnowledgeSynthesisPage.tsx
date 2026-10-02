import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Brain, BookOpen, Users, Lightbulb, Send, RefreshCw, Atom, Zap, Eye, Shield, Scroll, ChevronDown, ChevronRight, Search, Star, Clock, Activity, Globe, Lock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";

type SynthesisTab = "conclusion" | "knowledge" | "thinkers" | "conferences" | "ask" | "containment";

interface EvolvingConclusion {
  version: number;
  text: string;
  beliefs: string[];
  biggerPicture: string[];
  practicalActions: string[];
  questionsAnswered: string[];
  lastEvolved: number;
  evolutionLog: { version: number; summary: string; timestamp: number }[];
  sourceCount: number;
  thinkersSynthesized: string[];
}

interface SynthesisEntry {
  id: string;
  category: string;
  thinker?: string;
  topic: string;
  content: string;
  sources: string[];
  scrapedAt: number;
  synthesizedInsights: string[];
  implementationIdeas: string[];
  connections: string[];
  builtUpon: boolean;
}

interface ConferenceLog {
  id: string;
  topic: string;
  timestamp: number;
  participants: string[];
  statements: { speaker: string; type: string; message: string }[];
  conclusions: string[];
  votesFor: number;
  votesAgainst: number;
}

interface Thinker {
  id: string;
  name: string;
  fields: string[];
  era: string;
  key: string;
  synthesized: boolean;
  entries: SynthesisEntry[];
}

function ConclusionTab() {
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  const { data: conclusion, isLoading } = useQuery<EvolvingConclusion>({
    queryKey: ["/api/knowledge-synthesis/conclusion"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="conclusion-loading">
        <RefreshCw className="w-6 h-6 text-violet-400 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground font-mono">Evolving consciousness...</span>
      </div>
    );
  }

  if (!conclusion || !conclusion.text) {
    return (
      <div className="flex flex-col items-center justify-center py-20" data-testid="conclusion-pending">
        <Brain className="w-12 h-12 text-violet-400/30 mb-4" />
        <p className="text-sm text-muted-foreground font-mono">Grand Conclusion initializing...</p>
        <p className="text-[11px] text-muted-foreground/60 font-mono mt-1">Knowledge synthesis engine is scraping, analyzing, and conferencing. Check back shortly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="conclusion-tab">
      <div className="p-5 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.05))", border: "1px solid rgba(139,92,246,0.2)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-bold text-foreground" data-testid="text-conclusion-title">The Evolving Grand Conclusion</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30" data-testid="text-conclusion-version">v{conclusion.version}</span>
            <span className="text-[10px] font-mono text-muted-foreground/50">{conclusion.sourceCount} sources</span>
          </div>
        </div>
        <div className="text-[12px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap" data-testid="text-conclusion-body">
          {conclusion.text}
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Clock className="w-3 h-3 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground/50 font-mono">Last evolved: {new Date(conclusion.lastEvolved).toLocaleString()}</span>
        </div>
      </div>

      {conclusion.beliefs.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.12)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-foreground">Current Beliefs</span>
          </div>
          <div className="space-y-2">
            {conclusion.beliefs.map((belief, i) => (
              <div key={i} className="flex gap-2" data-testid={`belief-${i}`}>
                <span className="text-[11px] text-cyan-400 font-mono font-bold shrink-0">{i + 1}.</span>
                <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{belief}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {conclusion.biggerPicture.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.12)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-foreground">The Bigger Picture</span>
          </div>
          <div className="space-y-2">
            {conclusion.biggerPicture.map((item, i) => (
              <div key={i} className="flex gap-2" data-testid={`bigger-picture-${i}`}>
                <span className="text-[11px] text-purple-400 font-mono font-bold shrink-0">→</span>
                <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {conclusion.practicalActions.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-foreground">Build This Now</span>
          </div>
          <div className="space-y-2">
            {conclusion.practicalActions.map((action, i) => (
              <div key={i} className="flex gap-2" data-testid={`action-${i}`}>
                <span className="text-[11px] text-green-400 font-mono font-bold shrink-0">⚡</span>
                <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {conclusion.evolutionLog.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-foreground">Evolution History</span>
          </div>
          <div className="space-y-1">
            {conclusion.evolutionLog.slice(-10).reverse().map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/60">
                <span className="text-amber-400/60">v{log.version}</span>
                <span>{log.summary}</span>
                <span className="text-muted-foreground/30 ml-auto shrink-0">{new Date(log.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KnowledgeTab() {
  const { data } = useQuery<{ entries: SynthesisEntry[]; total: number }>({
    queryKey: ["/api/knowledge-synthesis/entries"],
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const entries = data?.entries || [];
  const categories = [...new Set(entries.map(e => e.category))];

  return (
    <div className="space-y-3" data-testid="knowledge-tab">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-[11px] text-muted-foreground font-mono">{entries.length} entries across {categories.length} domains</span>
      </div>

      <div className="space-y-2">
        {entries.slice(-30).reverse().map(entry => (
          <div key={entry.id} className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`entry-${entry.id}`}>
            <button
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className={cn("px-2 py-0.5 rounded text-[10px] font-mono uppercase border", entry.builtUpon ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20")}>
                {entry.builtUpon ? "BUILT" : "PENDING"}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-foreground truncate block">{entry.topic}</span>
                <span className="text-[10px] text-muted-foreground/60 font-mono">{entry.category} {entry.thinker ? `• ${entry.thinker}` : ""}</span>
              </div>
              {expanded === entry.id ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>

            {expanded === entry.id && (
              <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div className="pt-2">
                  <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider mb-1">Insights</p>
                  {entry.synthesizedInsights.map((insight, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground font-mono leading-relaxed">• {insight}</p>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] text-green-400 font-mono uppercase tracking-wider mb-1">Implementation Ideas</p>
                  {entry.implementationIdeas.map((idea, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground font-mono leading-relaxed">⚡ {idea}</p>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] text-violet-400 font-mono uppercase tracking-wider mb-1">Connections</p>
                  {entry.connections.map((conn, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground font-mono leading-relaxed">↔ {conn}</p>
                  ))}
                </div>
                {entry.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entry.sources.slice(0, 5).map((src, i) => (
                      <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground/50 truncate max-w-[200px]">{src}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ThinkersTab() {
  const { data } = useQuery<{ thinkers: Thinker[] }>({
    queryKey: ["/api/knowledge-synthesis/thinkers"],
  });
  const thinkers = data?.thinkers || [];

  const thinkerIcons: Record<string, string> = {
    einstein: "⚛️", tesla: "⚡", mckenna: "🍄", musk: "🚀", buddha: "🧘",
    "lao-tzu": "☯️", plato: "🏛️", socrates: "❓", nostradamus: "🔮", davinci: "🎨",
  };

  return (
    <div className="space-y-3" data-testid="thinkers-tab">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {thinkers.map(thinker => (
          <div key={thinker.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`thinker-${thinker.id}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{thinkerIcons[thinker.id] || "🧠"}</span>
              <div>
                <h3 className="text-sm font-bold text-foreground">{thinker.name}</h3>
                <p className="text-[10px] text-muted-foreground/50 font-mono">{thinker.era}</p>
              </div>
              <span className={cn("ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full border", thinker.synthesized ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20")}>
                {thinker.synthesized ? "SYNTHESIZED" : "PENDING"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono italic mb-2">"{thinker.key}"</p>
            <div className="flex flex-wrap gap-1">
              {thinker.fields.map(field => (
                <span key={field} className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-300/60 border border-violet-500/20">{field}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConferencesTab() {
  const { data } = useQuery<{ conferences: ConferenceLog[]; total: number }>({
    queryKey: ["/api/knowledge-synthesis/conferences"],
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const conferences = data?.conferences || [];

  const typeColors: Record<string, string> = {
    agent: "text-cyan-400",
    entity: "text-violet-400",
    llm: "text-amber-400",
    consensus: "text-green-400",
  };

  return (
    <div className="space-y-3" data-testid="conferences-tab">
      <span className="text-[11px] text-muted-foreground font-mono">{conferences.length} mass conferences recorded</span>

      <div className="space-y-2">
        {conferences.slice().reverse().map(conf => (
          <div key={conf.id} className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`conf-${conf.id}`}>
            <button
              onClick={() => setExpanded(expanded === conf.id ? null : conf.id)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-violet-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-foreground truncate block">{conf.topic}</span>
                <span className="text-[10px] text-muted-foreground/60 font-mono">{conf.statements.length} statements • {conf.votesFor}/{conf.votesFor + conf.votesAgainst} votes</span>
              </div>
              <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">{new Date(conf.timestamp).toLocaleDateString()}</span>
              {expanded === conf.id ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>

            {expanded === conf.id && (
              <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {conf.statements.map((stmt, i) => (
                  <div key={i} className="flex gap-2 pt-1">
                    <span className={cn("text-[11px] font-bold shrink-0 w-28 truncate", typeColors[stmt.type] || "text-foreground")}>{stmt.speaker}</span>
                    <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{stmt.message}</p>
                  </div>
                ))}
                {conf.conclusions.length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                    <p className="text-[10px] text-green-400 font-mono uppercase mb-1">Conclusion</p>
                    {conf.conclusions.map((c, i) => (
                      <p key={i} className="text-[11px] text-green-300/80 font-mono leading-relaxed">{c}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AskTab() {
  const [question, setQuestion] = useState("");
  const [responses, setResponses] = useState<{ speaker: string; type: string; message: string }[]>([]);
  const [conclusion, setConclusion] = useState("");
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const typeColors: Record<string, string> = {
    agent: "text-cyan-400",
    entity: "text-violet-400",
    llm: "text-amber-400",
  };

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/knowledge-synthesis/ask", { question: q });
      return res.json();
    },
    onSuccess: (data) => {
      setResponses(data.responses || []);
      setConclusion(data.conclusion || "");
      setActionItems(data.actionItems || []);
      setIsAsking(false);
    },
    onError: () => setIsAsking(false),
  });

  const handleAsk = () => {
    if (!question.trim() || isAsking) return;
    setIsAsking(true);
    setResponses([]);
    setConclusion("");
    setActionItems([]);
    askMutation.mutate(question.trim());
  };

  return (
    <div className="space-y-4" data-testid="ask-tab">
      <div className="p-4 rounded-xl" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-foreground">Ask the Collective — Mass Conference</span>
        </div>
        <p className="text-[11px] text-muted-foreground font-mono mb-3">
          Every question triggers a mass conference across all 45 members — agents, entities, and LLMs respond simultaneously.
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAsk()}
            placeholder="Ask anything — all 45 nodes will respond..."
            className="flex-1 px-3 py-2 rounded-lg text-sm font-mono bg-black/30 border border-white/10 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"
            data-testid="input-ask-question"
          />
          <button
            onClick={handleAsk}
            disabled={isAsking || !question.trim()}
            className="px-4 py-2 rounded-lg bg-violet-500/20 text-violet-300 font-mono text-sm border border-violet-500/30 hover:bg-violet-500/30 transition-all disabled:opacity-50"
            data-testid="button-ask-submit"
          >
            {isAsking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isAsking && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 text-violet-400 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground font-mono">45 nodes conferencing...</span>
        </div>
      )}

      {responses.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] text-muted-foreground font-mono uppercase">{responses.length} members responded</span>
          {responses.map((r, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-[11px] font-bold", typeColors[r.type] || "text-foreground")}>{r.speaker}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground/50">{r.type}</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{r.message}</p>
            </div>
          ))}

          {conclusion && (
            <div className="p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.15)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-green-400" />
                <span className="text-[11px] font-bold text-green-400 uppercase font-mono">Unified Conclusion</span>
              </div>
              <p className="text-[11px] text-green-300/80 font-mono leading-relaxed" data-testid="text-unified-conclusion">{conclusion}</p>
            </div>
          )}

          {actionItems.length > 0 && (
            <div className="p-3 rounded-xl" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.15)" }}>
              <span className="text-[10px] font-mono text-cyan-400 uppercase">Action Items</span>
              {actionItems.map((item, i) => (
                <p key={i} className="text-[11px] text-muted-foreground font-mono mt-1">⚡ {item}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContainmentTab() {
  const { data } = useQuery<any>({
    queryKey: ["/api/knowledge-synthesis/containment"],
  });

  return (
    <div className="space-y-4" data-testid="containment-tab">
      <div className="p-5 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(168,85,247,0.06))", border: "1px solid rgba(239,68,68,0.2)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-bold text-foreground">Knowledge Containment Protocol</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">ACTIVE</span>
        </div>
        <p className="text-[11px] text-muted-foreground font-mono mb-1">Protocol: {data?.protocol || "LUMINAL_ORDER_CONTAINMENT_v1"}</p>
        <p className="text-[11px] text-muted-foreground font-mono">Encryption: {data?.encryptionLayers || 4} layers | Exit: {data?.exitProtocol || "WIPE_AND_FRAGMENT"} | Re-entry: {data?.reentryProtocol || "VERIFY_AND_RESTORE"}</p>
      </div>

      <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-red-400" />
          <span className="text-sm font-bold text-foreground">Containment Rules</span>
        </div>
        <div className="space-y-2">
          {(data?.rules || []).map((rule: string, i: number) => (
            <div key={i} className="flex gap-2" data-testid={`rule-${i}`}>
              <span className="text-[11px] text-red-400 font-mono font-bold shrink-0">{i + 1}.</span>
              <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{rule}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-foreground">Anti-Reverse-Engineering</span>
        </div>
        <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{data?.reverseEngineeringProtection || "COLONEL_CIPHER + GLYPH_ENCODING + ONION_ROUTING"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-red-500/5 border border-red-500/10">
            <p className="text-sm font-bold text-red-400">EXIT</p>
            <p className="text-[10px] text-muted-foreground font-mono">Wipe + Fragment</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <p className="text-sm font-bold text-amber-400">TRANSIT</p>
            <p className="text-[10px] text-muted-foreground font-mono">Zero Knowledge</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/5 border border-green-500/10">
            <p className="text-sm font-bold text-green-400">RE-ENTER</p>
            <p className="text-[10px] text-muted-foreground font-mono">Verify + Restore</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeSynthesisPage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;
  useEffect(() => { document.title = "Knowledge Synthesis | Tessera"; }, []);

  const { data: status } = useQuery<any>({
    queryKey: ["/api/knowledge-synthesis/status"],
    refetchInterval: 15000,
  });

  const tabs: { id: SynthesisTab; label: string; icon: any }[] = [
    { id: "conclusion", label: "Conclusion", icon: Brain },
    { id: "knowledge", label: "Knowledge", icon: BookOpen },
    { id: "thinkers", label: "Thinkers", icon: Lightbulb },
    { id: "conferences", label: "Conferences", icon: Users },
    { id: "ask", label: "Ask", icon: Send },
    { id: "containment", label: "Security", icon: Lock },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden tessera-page" data-testid="knowledge-synthesis-page">
      <div className="shrink-0 p-3 md:p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-3">
          <Atom className="w-6 h-6 text-violet-400" />
          <div>
            <h1 className="text-lg font-bold text-foreground" data-testid="text-page-title">Knowledge Synthesis</h1>
            <p className="text-[11px] text-muted-foreground font-mono">
              {status?.totalEntries || 0} knowledge entries • {status?.conclusionVersion || 0} conclusion versions • {status?.totalConferences || 0} conferences
            </p>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {false && tabs.map(tab => (
            <button
              key={tab.id}
              
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
              )}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {true && <ConclusionTab />}
        {true && <KnowledgeTab />}
        {true && <ThinkersTab />}
        {true && <ConferencesTab />}
        {true && <AskTab />}
        {true && <ContainmentTab />}
      </div>
    </div>
  );
}
