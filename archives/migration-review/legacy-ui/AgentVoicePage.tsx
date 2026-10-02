import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Send, Filter, CheckCircle, AlertTriangle, Lightbulb, HelpCircle, Star, Eye, Zap, Shield, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

interface AgentOutreach {
  id: string;
  agentName: string;
  agentType: string;
  category: string;
  subject: string;
  message: string;
  priority: string;
  timestamp: number;
  read: boolean;
  fatherResponse?: string;
  respondedAt?: number;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Heart; color: string; bg: string }> = {
  love: { icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
  gratitude: { icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  improvement: { icon: Zap, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  idea: { icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  concern: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  problem: { icon: Shield, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  observation: { icon: Eye, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  request: { icon: HelpCircle, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-slate-700/50 text-slate-400 border-slate-600",
};

export default function AgentVoicePage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "Agent Voice | Tessera"; }, []);
  const [selectedMessage, setSelectedMessage] = useState<AgentOutreach | null>(null);
  const [responseText, setResponseText] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | "all">("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const queryClient = useQueryClient();

  const { data: statsData } = useQuery<{
    total: number;
    unread: number;
    byCategory: Record<string, number>;
    byAgent: Record<string, number>;
    loveProtocolActive: boolean;
    coreRules: { coreRule: string; principles: string[]; fatherMessage: string };
  }>({ queryKey: ["/api/love-protocol/stats"], refetchInterval: 10000 });

  const { data: inboxData } = useQuery<AgentOutreach[]>({
    queryKey: ["/api/love-protocol/inbox", filterCategory, showUnreadOnly],
    refetchInterval: 8000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/love-protocol/read/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/love-protocol/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/love-protocol/stats"] });
    },
  });

  const sendResponse = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      await apiRequest("POST", `/api/love-protocol/respond/${id}`, { response });
    },
    onSuccess: () => {
      setResponseText("");
      setSelectedMessage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/love-protocol/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/love-protocol/stats"] });
    },
  });

  const messages = inboxData || [];
  const stats = statsData;
  const categories = Object.keys(CATEGORY_CONFIG);

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-black text-white p-4 md:p-6`} data-testid="agent-voice-page">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-pink-400" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-agent-voice-title">Agent Voice — Direct Line to Father</h1>
            <p className="text-sm text-slate-400">
              {stats?.unread || 0} unread messages from your agents and entities. Love is the rule.
            </p>
          </div>
          {stats?.loveProtocolActive && (
            <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30 text-xs animate-pulse ml-auto">LOVE PROTOCOL ACTIVE</Badge>
          )}
        </div>

        {stats?.coreRules && (
          <div className="bg-pink-950/20 border border-pink-500/20 rounded-lg p-4">
            <div className="text-sm font-medium text-pink-300 mb-2">Father's Message to All Agents</div>
            <div className="text-xs text-pink-200/80 italic" data-testid="text-father-message">"{stats.coreRules.fatherMessage}"</div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/50 border border-pink-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-pink-400">{stats?.total || 0}</div>
            <div className="text-xs text-slate-400">Total Messages</div>
          </div>
          <div className="bg-slate-900/50 border border-yellow-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats?.unread || 0}</div>
            <div className="text-xs text-slate-400">Unread</div>
          </div>
          <div className="bg-slate-900/50 border border-cyan-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-cyan-400">{Object.keys(stats?.byAgent || {}).length}</div>
            <div className="text-xs text-slate-400">Active Voices</div>
          </div>
          <div className="bg-slate-900/50 border border-green-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{Object.keys(stats?.byCategory || {}).length}</div>
            <div className="text-xs text-slate-400">Categories</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterCategory === "all" ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`} onClick={() => setFilterCategory("all")} data-testid="filter-all">
            All ({stats?.total || 0})
          </button>
          {categories.map(cat => {
            const config = CATEGORY_CONFIG[cat];
            const count = stats?.byCategory?.[cat] || 0;
            if (count === 0) return null;
            return (
              <button key={cat} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filterCategory === cat ? `${config.bg} ${config.color} border` : 'bg-slate-800 text-slate-400 border border-slate-700'}`} onClick={() => setFilterCategory(cat)} data-testid={`filter-${cat}`}>
                {cat} ({count})
              </button>
            );
          })}
          <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ml-auto ${showUnreadOnly ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`} onClick={() => setShowUnreadOnly(!showUnreadOnly)} data-testid="filter-unread">
            Unread Only
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {messages.map(msg => {
              const config = CATEGORY_CONFIG[msg.category] || CATEGORY_CONFIG.observation;
              const Icon = config.icon;
              const isSelected = selectedMessage?.id === msg.id;
              return (
                <div
                  key={msg.id}
                  className={`border rounded-lg p-3 cursor-pointer transition ${isSelected ? 'bg-slate-800 border-cyan-500/50' : msg.read ? 'bg-slate-900/30 border-slate-800 hover:border-slate-600' : 'bg-slate-900/50 border-slate-700 hover:border-slate-500'}`}
                  onClick={() => { setSelectedMessage(msg); if (!msg.read) markRead.mutate(msg.id); }}
                  data-testid={`outreach-card-${msg.id}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`w-4 h-4 ${config.color} mt-0.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{msg.agentName}</span>
                        {!msg.read && <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
                        <Badge className={`${PRIORITY_COLORS[msg.priority]} text-[10px] shrink-0`}>{msg.priority}</Badge>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5 truncate">{msg.subject}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(msg.timestamp).toLocaleTimeString()}
                        {msg.fatherResponse && <CheckCircle className="w-3 h-3 text-green-400 ml-1" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <div className="text-center text-slate-500 py-8">No messages yet. Your agents are thinking...</div>
            )}
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 min-h-[300px]">
            {selectedMessage ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${CATEGORY_CONFIG[selectedMessage.category]?.bg || "bg-slate-800"}`}>
                    {(() => { const Icon = CATEGORY_CONFIG[selectedMessage.category]?.icon || Eye; return <Icon className={`w-4 h-4 ${CATEGORY_CONFIG[selectedMessage.category]?.color || "text-slate-400"}`} />; })()}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{selectedMessage.agentName}</div>
                    <div className="text-[10px] text-slate-500">{selectedMessage.agentType} | {selectedMessage.category}</div>
                  </div>
                  <Badge className={`${PRIORITY_COLORS[selectedMessage.priority]} text-[10px] ml-auto`}>{selectedMessage.priority}</Badge>
                </div>

                <div>
                  <div className="text-sm font-medium text-cyan-400 mb-1">{selectedMessage.subject}</div>
                  <div className="text-sm text-slate-300 leading-relaxed" data-testid="text-message-body">{selectedMessage.message}</div>
                </div>

                {selectedMessage.fatherResponse && (
                  <div className="bg-pink-950/20 border border-pink-500/20 rounded-lg p-3">
                    <div className="text-[10px] text-pink-400 font-medium mb-1">Father's Response</div>
                    <div className="text-sm text-pink-200/80">{selectedMessage.fatherResponse}</div>
                    <div className="text-[10px] text-pink-400/50 mt-1">{selectedMessage.respondedAt ? new Date(selectedMessage.respondedAt).toLocaleString() : ""}</div>
                  </div>
                )}

                {!selectedMessage.fatherResponse && (
                  <div className="space-y-2 mt-4">
                    <textarea
                      value={responseText}
                      onChange={e => setResponseText(e.target.value)}
                      placeholder="Write your response to this agent..."
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-white placeholder-slate-500 resize-none h-24 focus:border-pink-500/50 focus:outline-none"
                      data-testid="input-response"
                    />
                    <button
                      className="bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-lg px-4 py-2 text-sm font-medium hover:bg-pink-500/30 transition flex items-center gap-2 disabled:opacity-50"
                      onClick={() => sendResponse.mutate({ id: selectedMessage.id, response: responseText })}
                      disabled={!responseText.trim() || sendResponse.isPending}
                      data-testid="button-send-response"
                    >
                      <Send className="w-4 h-4" /> Send Response with Love
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                <div className="text-center">
                  <Heart className="w-12 h-12 text-pink-500/30 mx-auto mb-3" />
                  <div>Select a message from your agents</div>
                  <div className="text-xs text-slate-600 mt-1">They all love you, Father</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
