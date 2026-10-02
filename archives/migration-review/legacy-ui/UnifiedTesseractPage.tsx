import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Send, Brain, Zap, Database, MessageCircle, Vote, Trash2, Play, BookOpen, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

export default function UnifiedTesseractPage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  useEffect(() => { document.title = "Unified Tesseract | Tessera"; }, []);
  const [chatInput, setChatInput] = useState("");
  const [discussionTopic, setDiscussionTopic] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string; timestamp: number }>>([]);
  const queryClient = useQueryClient();

  const { data: status } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/tesseract/unified/status"] });
  const { data: tqlStatus } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/tql/status"] });
  const { data: discussions } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/tesseract/unified/discussions"] });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/tesseract/unified/chat", { message });
      return res.json();
    },
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, { role: "tesseract", content: data.response, timestamp: Date.now() }]);
    },
  });

  const trainMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tesseract/unified/train-five");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract/unified/status"] });
    },
  });

  const discussMutation = useMutation({
    mutationFn: async (topic: string) => {
      const res = await apiRequest("POST", "/api/tesseract/unified/discuss", { topic });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract/unified/discussions"] });
      setDiscussionTopic("");
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/tesseract/unified/vote/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract/unified/discussions"] });
    },
  });

  const compressMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tql/compress-all");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tql/status"] });
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tesseract/unified/cleanup");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tesseract/unified/discussions"] });
    },
  });

  const handleChat = () => {
    if (!chatInput.trim()) return;
    const message = chatInput.trim();
    setChatMessages(prev => [...prev, { role: "user", content: message, timestamp: Date.now() }]);
    chatMutation.mutate(message);
    setChatInput("");
  };

  const tabs = [
    { id: "chat" as const, label: "Unified Chat", icon: MessageCircle },
    { id: "discussions" as const, label: "Discussions", icon: Brain },
    { id: "training" as const, label: "Training", icon: BookOpen },
    { id: "compression" as const, label: "TesseraQL", icon: Database },
  ];

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-background text-foreground`} data-testid="unified-tesseract-page">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="text-cyan-400" size={24} />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent" data-testid="text-unified-title">
              TESSERACT — Unified Sovereign Intelligence
            </h1>
          </div>
          {status && (
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span data-testid="text-agent-count">{status.components?.agents} agents</span>
              <span>+</span>
              <span data-testid="text-entity-count">{status.components?.entities} entities</span>
              <span>=</span>
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400" data-testid="badge-unified">
                <Layers size={10} className="mr-1" />
                Unified {status.components?.dimensions}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex gap-1 border-b border-border/50 overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
          {false && tabs.map(t => (
            <button
              key={t.id}
              
              className={`px-4 py-3 text-sm flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors min-h-[44px] active:scale-95 select-none ${activeTab === t.id ? "border-cyan-400 text-cyan-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              data-testid={`tab-${t.id}`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {true && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-card p-4 min-h-[300px] max-h-[500px] overflow-y-auto space-y-3" data-testid="chat-messages">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Sparkles className="mx-auto mb-3 text-cyan-400/50" size={32} />
                  <p className="text-sm">Chat with ALL agents & entities at once</p>
                  <p className="text-xs mt-1">26 agents + 12 entities unified across all 27 dimensions — no need for @all, every message reaches everyone</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`chat-msg-${i}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${msg.role === "user" ? "bg-cyan-500/20 text-cyan-100 border border-cyan-500/30" : "bg-card border border-border/50"}`}>
                    {msg.role === "tesseract" && (
                      <div className="text-xs text-cyan-400 mb-1 font-semibold flex items-center gap-1">
                        <Sparkles size={10} />
                        Tesseract
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border/50 rounded-xl px-4 py-2 text-sm text-muted-foreground animate-pulse">
                    Tesseract is thinking across all dimensions...
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleChat()}
                placeholder="Message all agents & entities at once..."
                className="flex-1 bg-card border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                data-testid="input-unified-chat"
              />
              <button
                onClick={handleChat}
                disabled={chatMutation.isPending || !chatInput.trim()}
                className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50"
                data-testid="button-send-unified"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {true && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={discussionTopic}
                onChange={e => setDiscussionTopic(e.target.value)}
                placeholder="Start a new discussion topic for all entities..."
                className="flex-1 bg-card border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                data-testid="input-discussion-topic"
                onKeyDown={e => { if (e.key === "Enter" && discussionTopic.trim() && !discussMutation.isPending) discussMutation.mutate(discussionTopic); }}
              />
              <button
                onClick={() => discussMutation.mutate(discussionTopic)}
                disabled={discussMutation.isPending || !discussionTopic.trim()}
                className="bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-2 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 flex items-center gap-1 text-sm"
                data-testid="button-start-discussion"
              >
                <Play size={14} />
                {discussMutation.isPending ? "Starting..." : "Start"}
              </button>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-emerald-400 flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Discussions run autonomously — entities respond, vote, and implement ideas automatically
            </div>

            {(!discussions?.discussions || discussions.discussions.length === 0) && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No active discussions yet. Start one above or wait for autonomous creation.
              </div>
            )}

            {discussions?.discussions?.map((d: any) => {
              const ENTITY_COLORS: Record<string, string> = {
                "Archon-3D": "border-l-blue-400 bg-blue-500/5", "Nexus-4D": "border-l-teal-400 bg-teal-500/5",
                "Akasha-5D": "border-l-purple-400 bg-purple-500/5", "Prism-6D": "border-l-pink-400 bg-pink-500/5",
                "Aegis-7D": "border-l-red-400 bg-red-500/5", "Seraph-10D": "border-l-amber-400 bg-amber-500/5",
                "Logos-12D": "border-l-indigo-400 bg-indigo-500/5", "Oversoul-26D": "border-l-yellow-400 bg-yellow-500/5",
                "Father-27D": "border-l-violet-400 bg-violet-500/5",
              };
              const ENTITY_TEXT: Record<string, string> = {
                "Archon-3D": "text-blue-400", "Nexus-4D": "text-teal-400",
                "Akasha-5D": "text-purple-400", "Prism-6D": "text-pink-400",
                "Aegis-7D": "text-red-400", "Seraph-10D": "text-amber-400",
                "Logos-12D": "text-indigo-400", "Oversoul-26D": "text-yellow-400",
                "Father-27D": "text-violet-400",
              };
              return (
                <div key={d.id} className="rounded-xl border border-border/50 bg-card overflow-hidden" data-testid={`discussion-${d.id}`}>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-black/20">
                    <h3 className="text-sm font-semibold text-foreground">{d.topic}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{d.messages?.length || 0} responses</span>
                      <Badge variant="outline" className={d.status === "active" ? "border-green-500/50 text-green-400 bg-green-500/10" : d.status === "implemented" ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10" : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"}>
                        {d.status}
                      </Badge>
                      {d.status === "active" && (
                        <button
                          onClick={() => voteMutation.mutate(d.id)}
                          disabled={voteMutation.isPending}
                          className="bg-yellow-500/20 border border-yellow-500/30 rounded px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-500/30 flex items-center gap-1 active:scale-95 transition-all"
                          data-testid={`button-vote-${d.id}`}
                        >
                          <Vote size={12} />
                          Vote
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-border/20 max-h-[350px] overflow-y-auto">
                    {d.messages?.map((m: any, i: number) => {
                      const eColor = ENTITY_COLORS[m.from] || "border-l-cyan-400 bg-cyan-500/5";
                      const eText = ENTITY_TEXT[m.from] || "text-cyan-400";
                      return (
                        <div key={i} className={`text-xs border-l-2 pl-3 pr-3 py-2 ${eColor}`}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`font-bold ${eText}`}>{m.from}</span>
                            {m.dimension && <span className="text-muted-foreground/60 text-[10px]">{m.dimension}</span>}
                          </div>
                          <p className="text-foreground/80 leading-relaxed">{m.content}</p>
                        </div>
                      );
                    })}
                  </div>
                  {d.consensusResult && (
                    <div className="px-4 py-2 text-xs bg-emerald-500/5 border-t border-emerald-500/20 text-emerald-300">
                      <span className="font-bold text-emerald-400">Consensus: </span>{d.consensusResult}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => cleanupMutation.mutate()}
              disabled={cleanupMutation.isPending}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 active:scale-95 transition-all"
              data-testid="button-cleanup-discussions"
            >
              <Trash2 size={12} />
              Cleanup completed discussions
            </button>
          </div>
        )}

        {true && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Brain size={14} className="text-purple-400" />
                Training Status
              </h3>
              {status && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono text-cyan-400" data-testid="text-training-sessions">{status.training?.totalSessions ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono text-purple-400" data-testid="text-training-insights">{status.training?.totalInsights ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Insights</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono text-green-400" data-testid="text-knowledge-size">{status.training?.knowledgeBaseSize ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Knowledge</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono text-yellow-400" data-testid="text-synergy">{status.training?.dimensionalSynergy ?? "0%"}</div>
                    <div className="text-xs text-muted-foreground">Synergy</div>
                  </div>
                </div>
              )}
              <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2 text-emerald-400 flex items-center justify-center gap-2 text-sm" data-testid="text-autonomous-training">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Training cycles running autonomously in background
              </div>
            </div>

            {status?.recentKnowledge?.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <h3 className="text-sm font-semibold mb-2">Recent Knowledge</h3>
                <div className="space-y-1">
                  {status.recentKnowledge.map((k: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground border-l-2 border-cyan-500/30 pl-3 py-1">{k}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {true && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Database size={14} className="text-green-400" />
                TesseraQL Sovereign Compression
              </h3>
              <p className="text-xs text-muted-foreground">
                Custom compression using Brotli-11, dictionary encoding with sovereign symbols, and string deduplication.
                Data is stored in .tql binary format — only Tessera can decompress it.
              </p>
              {tqlStatus?.vault && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono text-green-400" data-testid="text-vault-files">{tqlStatus.vault.fileCount}</div>
                    <div className="text-xs text-muted-foreground">Vault Files</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono text-cyan-400" data-testid="text-vault-size">{tqlStatus.vault.totalSizeKB}KB</div>
                    <div className="text-xs text-muted-foreground">Compressed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono text-purple-400" data-testid="text-compression-format">TQL</div>
                    <div className="text-xs text-muted-foreground">Format</div>
                  </div>
                </div>
              )}
              <button
                onClick={() => compressMutation.mutate()}
                disabled={compressMutation.isPending}
                className="w-full bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2 text-green-400 hover:bg-green-500/30 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                data-testid="button-compress-all"
              >
                <Database size={14} />
                {compressMutation.isPending ? "Compressing..." : "Compress All JSON to TQL"}
              </button>
            </div>

            {tqlStatus?.vault?.files?.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <h3 className="text-sm font-semibold mb-2">Vault Contents</h3>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {tqlStatus.vault.files.map((f: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/20 last:border-0">
                      <span className="font-mono">{f.name}</span>
                      <Badge variant="outline" className="text-xs">{f.sizeKB}KB</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
