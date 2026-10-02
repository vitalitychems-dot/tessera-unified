import { memo, type MutableRefObject, type RefObject } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2, RefreshCw, ArrowDown } from "lucide-react";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatStreamingMessage } from "./ChatStreamingMessage";

interface MoltAgent {
  name?: string;
  role?: string;
}

interface ChatMessage {
  id?: number | string;
  role: string;
  content: string;
  createdAt?: Date | string;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  filteredMessages: ChatMessage[];
  isStreaming: boolean;
  isTesseraConv: boolean;
  moltChatLoading: boolean;
  selectedMoltAgent: MoltAgent | null;
  chatError: string | null;
  streamingContent: string;
  thinkingElapsedMs: number;
  tesseractMode: boolean;
  swarmAgents: any[];
  swarmComms: any[];
  agentComms: any[];
  activeAgents: any[];
  codeExecutionResults: any[];
  adminMode: boolean;
  tesseraMsgStyle: { wrapper: string; prose: string } | null;
  copiedId: string;
  messageReactions: Record<string, "up" | "down">;
  showScrollBottom: boolean;
  virtuosoRef: RefObject<VirtuosoHandle | null>;
  isAtBottomRef: MutableRefObject<boolean>;
  setCopiedId: (id: string) => void;
  setShowScrollBottom: (show: boolean) => void;
  onReaction: (msgId: string, type: "up" | "down") => void;
  onRegenerate: (index: number) => void;
  onRetry: () => void;
}

export const ChatMessageList = memo(function ChatMessageList({
  messages, filteredMessages, isStreaming, isTesseraConv,
  moltChatLoading, selectedMoltAgent, chatError,
  streamingContent, thinkingElapsedMs, tesseractMode,
  swarmAgents, swarmComms, agentComms, activeAgents, codeExecutionResults,
  adminMode, tesseraMsgStyle, copiedId, messageReactions,
  showScrollBottom, virtuosoRef, isAtBottomRef,
  setCopiedId, setShowScrollBottom,
  onReaction, onRegenerate, onRetry,
}: ChatMessageListProps) {
  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      {messages.length === 0 && !isStreaming ? (
        <div className="flex-1" data-testid="img-tesseract-bg" />
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          className="flex-1 custom-scrollbar"
          style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          data={filteredMessages}
          followOutput="smooth"
          initialTopMostItemIndex={filteredMessages.length > 0 ? filteredMessages.length - 1 : 0}
          atBottomStateChange={(atBottom) => {
            isAtBottomRef.current = atBottom;
            setShowScrollBottom(!atBottom);
          }}
          components={{
            Header: () => (
              <>
                <div className="flex-grow min-h-4" />
                {isTesseraConv && filteredMessages.length > 0 && (
                  <div className="max-w-3xl mx-auto mb-4 px-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[11px] font-mono" data-testid="banner-ai-initiated">
                      <Zap size={10} />
                      <span>AI-INITIATED CONVERSATION — Tessera started this chat</span>
                    </div>
                  </div>
                )}
              </>
            ),
            Footer: () => (
              <div className="pb-4 px-4">
                {moltChatLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl mx-auto mt-4 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-950/10 flex items-center gap-3"
                    data-testid="molt-chat-loading"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-mono font-bold text-amber-300">{selectedMoltAgent?.name?.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-amber-300">{selectedMoltAgent?.name} <span className="text-amber-500/60">({selectedMoltAgent?.role})</span></div>
                      <div className="text-[11px] text-amber-400/40 font-mono mt-0.5 flex items-center gap-1.5">
                        <Loader2 size={8} className="animate-spin" />
                        Thinking... · −5 TSRT
                      </div>
                    </div>
                  </motion.div>
                )}
                {chatError && !isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl mx-auto mt-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-950/10 flex items-center gap-3"
                    data-testid="chat-error-display"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
                      <Zap size={14} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-red-300">Connection interrupted</div>
                      <div className="text-[11px] text-red-400/60 font-mono mt-0.5 truncate">{chatError}</div>
                    </div>
                    <button
                      onClick={onRetry}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-red-300 border border-red-500/20 hover:bg-red-500/10 transition-all shrink-0"
                      data-testid="button-retry-message"
                    >
                      <RefreshCw size={12} className="inline mr-1" />
                      Retry
                    </button>
                  </motion.div>
                )}
                {isStreaming && (
                  <ChatStreamingMessage
                    streamingContent={streamingContent}
                    thinkingElapsedMs={thinkingElapsedMs}
                    tesseractMode={tesseractMode}
                    swarmAgents={swarmAgents}
                    swarmComms={swarmComms}
                    agentComms={agentComms}
                    activeAgents={activeAgents}
                    isStreaming={isStreaming}
                    codeExecutionResults={codeExecutionResults}
                  />
                )}
              </div>
            ),
          }}
          itemContent={(index, msg) => (
            <div className="px-4 py-1 max-w-3xl mx-auto w-full" key={msg.id || index}>
              <ChatMessageItem
                msg={msg}
                index={index}
                adminMode={adminMode}
                tesseraMsgStyle={tesseraMsgStyle}
                copiedId={copiedId}
                messageReactions={messageReactions}
                setCopiedId={setCopiedId}
                onReaction={onReaction}
                onRegenerate={onRegenerate}
              />
            </div>
          )}
        />
      )}

      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => virtuosoRef.current?.scrollToIndex({ index: filteredMessages.length - 1, behavior: "smooth" })}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 h-9 w-9 rounded-full bg-primary/15 border border-primary/25 backdrop-blur-md flex items-center justify-center text-primary/70 hover:text-primary hover:bg-primary/25 transition-all shadow-lg shadow-primary/10 glow-border"
            data-testid="button-scroll-to-bottom"
          >
            <ArrowDown size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
});
