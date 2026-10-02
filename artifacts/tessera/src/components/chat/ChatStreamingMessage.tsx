import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CodePreview } from "./ChatCodePreview";
import { ColorizedText } from "./ChatColorizedText";
import { TesseractSwarmPanel, AgentActivityPanel, ActiveAgentsBadges, ThinkingRepoBlocks } from "./ChatPanels";
import { CodeExecutionResult, type ExecutionResultData } from "./CodeExecutionResult";
import type { AgentInfo, AgentComm } from "@/hooks/use-chat";

interface StreamingMessageProps {
  streamingContent: string;
  thinkingElapsedMs: number;
  tesseractMode: boolean;
  swarmAgents: any[];
  swarmComms: any[];
  agentComms: AgentComm[];
  activeAgents: AgentInfo[];
  isStreaming: boolean;
  codeExecutionResults?: ExecutionResultData[];
}

function sanitizeStreamingContent(content: string): string {
  if (!content) return content;
  let cleaned = content;
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");
  return cleaned.trim();
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const StreamingMarkdownComponents = {
  p: ({ children }: any) => (
    <div className="mb-3 last:mb-0">
      {typeof children === "string"
        ? <ColorizedText text={children} />
        : Array.isArray(children)
        ? children.map((c, ci) => typeof c === "string" ? <ColorizedText key={ci} text={c} /> : c)
        : children}
    </div>
  ),
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-cyan-400 underline decoration-cyan-500/40 hover:text-cyan-300 hover:decoration-cyan-400/60 transition-colors"
      data-testid="link-markdown-streaming">
      {children}
    </a>
  ),
  details: ({ children }: any) => (
    <details className="my-3 rounded-lg border border-cyan-500/15 bg-black/30 backdrop-blur-sm group" data-testid="details-expandable-streaming">
      {children}
    </details>
  ),
  summary: ({ children }: any) => (
    <summary className="cursor-pointer px-4 py-2 text-cyan-300 font-semibold font-[var(--font-display)] tracking-wide select-none hover:text-cyan-200 transition-colors" data-testid="summary-expandable-streaming">
      {children}
    </summary>
  ),
  code: ({ className, children }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const lang = match ? match[1] : "";
    const codeStr = String(children).replace(/\n$/, "");
    if (lang && codeStr.length > 50) {
      return <CodePreview code={codeStr} language={lang} />;
    }
    return <code className={className}>{children}</code>;
  },
  pre: ({ children }: any) => <>{children}</>,
  img: ({ src, alt }: any) => {
    const isVideo = src?.endsWith(".mp4") || src?.endsWith(".webm") || src?.includes("/videos/");
    if (isVideo) {
      return (
        <div className="my-4 rounded-xl overflow-hidden border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
          <video controls className="w-full max-h-[600px] bg-black" data-testid="video-generated-streaming" preload="metadata">
            <source src={src} type="video/mp4" />
          </video>
          {alt && (
            <div className="p-2 bg-black/60 text-[11px] text-cyan-400/60 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />{alt}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="my-4 rounded-xl overflow-hidden border border-white/10">
        <img src={src} alt={alt || "Generated image"} className="w-full max-h-[600px] object-contain bg-black" data-testid="img-generated-streaming" loading="eager" />
        {alt && <div className="p-2 bg-black/60 text-[11px] text-gray-500 font-mono">{alt}</div>}
      </div>
    );
  },
};

export const ChatStreamingMessage = memo(function ChatStreamingMessage({
  streamingContent, thinkingElapsedMs, tesseractMode, swarmAgents, swarmComms, agentComms, activeAgents, isStreaming, codeExecutionResults = [],
}: StreamingMessageProps) {
  const tokenCount = streamingContent ? estimateTokens(streamingContent) : 0;

  return (
    <div className="max-w-3xl mx-auto mt-4">
      <AnimatePresence>
        {tesseractMode && (swarmAgents.length > 0 || swarmComms.length > 0) && (
          <TesseractSwarmPanel agents={swarmAgents} comms={swarmComms} isActive={isStreaming} />
        )}
        {agentComms.length > 0 && !tesseractMode && (
          <AgentActivityPanel comms={agentComms} isActive={isStreaming} />
        )}
      </AnimatePresence>

      {activeAgents.length > 0 && (
        <ActiveAgentsBadges agents={activeAgents.map(a => a.name)} />
      )}

      {streamingContent ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
          <div className="tessera-message prose prose-invert max-w-none prose-sm prose-p:leading-relaxed prose-p:text-[15px] prose-pre:bg-black/60 prose-pre:border prose-pre:border-white/5 prose-pre:p-4 prose-pre:rounded-xl prose-code:text-cyan-400 prose-headings:text-white prose-strong:text-white prose-blockquote:border-l-cyan-500/40 prose-blockquote:bg-cyan-950/10 prose-li:marker:text-cyan-500/60 prose-a:text-cyan-400 text-gray-200">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={StreamingMarkdownComponents}>
              {sanitizeStreamingContent(streamingContent)}
            </ReactMarkdown>
          </div>
          {codeExecutionResults.length > 0 && (
            <div className="mt-2 space-y-2">
              {codeExecutionResults.map((execResult, idx) => (
                <CodeExecutionResult key={execResult.id || idx} result={execResult} />
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-block w-0.5 h-5 bg-cyan-400 animate-pulse" />
            <span className="text-[10px] text-cyan-400/50 font-mono tabular-nums" data-testid="text-token-counter">
              {tokenCount} tokens
            </span>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3 animate-fade-in-up">
          <div className="flex items-center gap-3 text-muted-foreground glass-panel rounded-xl px-4 py-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full border-2 border-cyan-500/40 flex items-center justify-center thinking-timer-ring animate-glow-pulse">
                <Loader2 size={15} className="animate-spin text-cyan-400" />
              </div>
              <div className="absolute inset-0 rounded-full animate-ping opacity-15 border border-cyan-400" />
            </div>
            <div className="flex flex-col gap-0.5 flex-1">
              <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
                <span className="text-cyan-400">Tessera</span>{" "}
                <span className="text-purple-400">is</span>{" "}
                <span className="text-pink-400/80">thinking</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="thinking-timer-display font-mono text-xs tabular-nums" data-testid="text-thinking-timer">
                  {String(Math.floor(thinkingElapsedMs / 60000)).padStart(2, '0')}
                  :{String(Math.floor((thinkingElapsedMs % 60000) / 1000)).padStart(2, '0')}
                  .{String(Math.floor((thinkingElapsedMs % 1000) / 100))}s
                </span>
                <span className="text-[11px] text-emerald-400/60 font-mono">sovereign mind active</span>
                <div className="typing-dots ml-1">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          </div>
          <ThinkingRepoBlocks />
        </div>
      )}
    </div>
  );
});
