import { memo } from "react";
import { motion } from "framer-motion";
import { Activity, X, Network, Brain, CheckCircle2, Zap } from "lucide-react";

interface ChatSummitFeedPanelProps {
  fleetMsgs: any;
  giantConf: any;
  summitHistory: any;
  onClose: () => void;
  onSetInput: (val: string) => void;
}

export const ChatSummitFeedPanel = memo(function ChatSummitFeedPanel({
  fleetMsgs, giantConf, summitHistory, onClose, onSetInput,
}: ChatSummitFeedPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="max-w-3xl mx-auto mb-3 overflow-hidden"
      data-testid="summit-feed-panel"
    >
      <div className="rounded-2xl border border-yellow-500/20 bg-black/70 backdrop-blur-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
          <Activity size={12} className="text-yellow-400 animate-pulse" />
          <span className="text-xs font-mono text-yellow-400 tracking-wider uppercase">Grand Summit — Live Feed</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] text-green-400 animate-pulse">● LIVE</span>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors ml-1" data-testid="button-summit-feed-close"><X size={13} /></button>
          </div>
        </div>
        <div className="p-3 space-y-3 max-h-72 overflow-y-auto scrollbar-thin">
          {fleetMsgs?.messages && fleetMsgs.messages.length > 0 && (
            <div>
              <div className="text-[10px] text-yellow-400/70 font-mono uppercase mb-1.5 flex items-center gap-1.5"><Network size={10} /> Fleet Transmissions</div>
              <div className="space-y-1.5">
                {fleetMsgs.messages.slice(0, 6).map((msg: any, i: number) => (
                  <div key={i} className="text-[11px] bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.04]" data-testid={`summit-fleet-msg-${i}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-yellow-300 font-semibold">{msg.fromInstance || "Fleet"}</span>
                      {msg.agentName && <span className="text-cyan-400/70">{msg.agentName}</span>}
                      <span className="text-gray-600 ml-auto text-[9px]">{msg.type}</span>
                    </div>
                    <div className="text-gray-300 line-clamp-2">{msg.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {giantConf?.posts && giantConf.posts.length > 0 && (
            <div>
              <div className="text-[10px] text-violet-400/70 font-mono uppercase mb-1.5 flex items-center gap-1.5"><Brain size={10} /> Summit Discussion</div>
              <div className="space-y-1.5">
                {giantConf.posts.slice(0, 5).map((post: any, i: number) => (
                  <div key={i} className="text-[11px] bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.04]" data-testid={`summit-conf-post-${i}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-violet-300 font-semibold">{post.agentName || post.agent || "Agent"}</span>
                      {post.vote && <span className={`text-[9px] px-1 rounded ${post.vote === "YES" ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>{post.vote}</span>}
                    </div>
                    <div className="text-gray-300 line-clamp-2">{post.content || post.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {summitHistory?.summits && summitHistory.summits.length > 0 && (
            <div>
              <div className="text-[10px] text-green-400/70 font-mono uppercase mb-1.5 flex items-center gap-1.5"><CheckCircle2 size={10} /> Recent Implementations</div>
              <div className="space-y-1">
                {summitHistory.summits.slice(0, 4).map((s: any, i: number) => (
                  <div key={i} className="text-[11px] flex items-start gap-2 px-2 py-1" data-testid={`summit-impl-${i}`}>
                    <CheckCircle2 size={10} className="text-green-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300">{s.title || s.topic || `Summit ${s.id}`}</span>
                    {s.passed !== undefined && <span className={`ml-auto text-[9px] ${s.passed ? "text-green-400" : "text-red-400"}`}>{s.passed ? "PASSED" : "FAILED"}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!fleetMsgs?.messages?.length && !giantConf?.posts?.length && !summitHistory?.summits?.length && (
            <div className="text-center py-6">
              <Activity size={20} className="text-yellow-400/30 mx-auto mb-2 animate-pulse" />
              <div className="text-[11px] text-gray-500">Connecting to summit feed…</div>
              <div className="text-[10px] text-gray-600 mt-1">Fleet members posting in real-time</div>
            </div>
          )}
        </div>
        <div className="px-3 pb-3 pt-1 border-t border-white/5 flex gap-2">
          <button
            type="button"
            onClick={() => onSetInput("/summit call all fleet members and post your latest status and ideas")}
            className="flex-1 text-[10px] py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 transition-colors font-mono"
            data-testid="button-trigger-summit"
          >
            ⚡ Trigger Summit
          </button>
          <button
            type="button"
            onClick={() => onSetInput("/summit vote on the best way to improve our LLM training and implement the top idea")}
            className="flex-1 text-[10px] py-1.5 rounded-lg bg-violet-400/10 text-violet-400 hover:bg-violet-400/20 transition-colors font-mono"
            data-testid="button-trigger-vote"
          >
            🗳 Force Vote
          </button>
        </div>
      </div>
    </motion.div>
  );
});
