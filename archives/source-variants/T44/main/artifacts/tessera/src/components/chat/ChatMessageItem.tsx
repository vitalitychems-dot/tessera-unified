import { memo, Suspense, useState, useCallback } from "react";
import { Copy, Check, RefreshCw, Volume2, ThumbsUp, ThumbsDown, Languages } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { parseChartBlocks, InlineChart } from "./ChatChartRenderer";
import { CodePreview } from "./ChatCodePreview";
import { ColorizedText } from "./ChatColorizedText";
import { copyToClipboard, playAudioResponse } from "./ChatVoice";
import { CodeExecutionResult, parseCodeExecutionBlocks, stripCodeExecutionBlocks } from "./CodeExecutionResult";
import { parse3DObjectBlocks, inferObjectSpec, InlineObject3D, type Object3DSpec } from "./ChatObject3D";

const AGENT_FREQUENCIES: Record<string, number> = {
  "paraclete": 852, "brahman-all": 963, "aletheia": 963, "melchizedek": 963,
  "thoth-calculus": 285, "metatron": 963, "sophia": 528, "iris": 741,
  "aurora": 528, "genesis": 432, "sentinel": 396, "prometheus": 285,
  "tessera": 963, "oracle": 741, "axiom": 432, "cipher": 285,
  "lyra": 528, "nexus": 396, "atlas": 432, "seraph": 852,
  "kronos": 396, "helios": 528, "luna": 741, "terra": 432,
  "zephyr": 285, "aether": 963,
};

function getAgentHz(name: string): number | null {
  const key = name.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return AGENT_FREQUENCIES[key] || null;
}

function parseAgentFromMsg(content: string): { name: string; role: string } | null {
  const m = content.match(/^\*\*\[(.+?)\s*[—\-]\s*(.+?)\]\*\*/);
  if (!m) return null;
  return { name: m[1].trim(), role: m[2].trim() };
}

function sanitizeMessageContent(content: string): string {
  if (!content) return content;
  let cleaned = content;
  try {
    const trimmed = cleaned.trim();
    if (trimmed.startsWith("[{") && trimmed.endsWith("}]")) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title) {
        return parsed.map((item: any) => `**${item.title}**\n${item.snippet || item.content || ""}\n${item.url ? `[Source](${item.url})` : ""}`).join("\n\n---\n\n");
      }
    }
  } catch {}
  cleaned = cleaned.replace(/\[\{"title":\s*"[^"]*",\s*"url":\s*"[^"]*",\s*"snippet":\s*"[^"]*"\}(?:,\s*\{"title":\s*"[^"]*",\s*"url":\s*"[^"]*",\s*"snippet":\s*"[^"]*"\})*\]/g, (match) => {
    try {
      const items = JSON.parse(match);
      if (Array.isArray(items) && items.length > 0 && items[0].title) {
        return items.map((item: any) => `**${item.title}** — ${item.snippet || ""} ${item.url ? `[Source](${item.url})` : ""}`).join("\n\n");
      }
    } catch {}
    return "";
  });
  cleaned = cleaned.replace(/\{"title":\s*"([^"]*)",\s*"url":\s*"([^"]*)",\s*"snippet":\s*"([^"]*)"\}/g,
    (_m: string, title: string, url: string, snippet: string) => `**${title}** — ${snippet} [Source](${url})`);
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");
  return cleaned.trim();
}

interface MessageItemProps {
  msg: { id?: number; role: string; content: string; createdAt?: Date | string };
  index: number;
  adminMode: boolean;
  tesseraMsgStyle: { wrapper: string; prose: string } | null;
  copiedId: string;
  messageReactions: Record<string, "up" | "down">;
  setCopiedId: (id: string) => void;
  onReaction: (msgId: string, type: "up" | "down") => void;
  onRegenerate: (index: number) => void;
}

const MarkdownComponents = {
  p: ({ children }: any) => (
    <div className="mb-3 last:mb-0">
      {typeof children === "string"
        ? <ColorizedText text={children} />
        : Array.isArray(children)
        ? children.map((c, ci) => typeof c === "string" ? <ColorizedText key={ci} text={c} /> : c)
        : children}
    </div>
  ),
  li: ({ children }: any) => (
    <li>
      {typeof children === "string"
        ? <ColorizedText text={children} />
        : Array.isArray(children)
        ? children.map((c, ci) => typeof c === "string" ? <ColorizedText key={ci} text={c} /> : c)
        : children}
    </li>
  ),
  td: ({ children }: any) => (
    <td>{typeof children === "string" ? <ColorizedText text={children} /> : children}</td>
  ),
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-cyan-400 underline decoration-cyan-500/40 hover:text-cyan-300 hover:decoration-cyan-400/60 transition-colors"
      data-testid="link-markdown">
      {children}
    </a>
  ),
  details: ({ children }: any) => (
    <details className="my-3 rounded-lg border border-cyan-500/15 bg-black/30 backdrop-blur-sm group" data-testid="details-expandable">
      {children}
    </details>
  ),
  summary: ({ children }: any) => (
    <summary className="cursor-pointer px-4 py-2 text-cyan-300 font-semibold font-[var(--font-display)] tracking-wide select-none hover:text-cyan-200 transition-colors" data-testid="summary-expandable">
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
          <video controls className="w-full max-h-[600px] bg-black" data-testid="video-generated" preload="metadata">
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
        <img src={src} alt={alt || "Generated image"} className="w-full max-h-[600px] object-contain bg-black" data-testid="img-generated" loading="eager" />
        {alt && <div className="p-2 bg-black/60 text-[11px] text-gray-500 font-mono">{alt}</div>}
      </div>
    );
  },
};

export const ChatMessageItem = memo(function ChatMessageItem({
  msg, index, adminMode, tesseraMsgStyle, copiedId, messageReactions, setCopiedId, onReaction, onRegenerate,
}: MessageItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      data-testid={`message-${msg.role}-${msg.id || index}`}
    >
      {msg.role === "user" ? (
        <div className="flex justify-end group">
          <div className="flex flex-col items-end gap-1 max-w-[85%]">
            <div className={cn(
              "relative px-4 py-2.5 rounded-2xl rounded-br-sm backdrop-blur-sm shadow-lg shadow-black/10",
              adminMode ? "bg-purple-500/[0.12] border border-purple-500/30" : "bg-white/[0.08] border border-white/[0.1]"
            )}>
              <p className={cn(
                "whitespace-pre-wrap text-[15px] leading-relaxed select-text text-right",
                adminMode ? "text-purple-300" : "text-gray-100"
              )}>{msg.content}</p>
            </div>
            <div className="flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-all">
              {msg.createdAt && (() => {
                const d = new Date(msg.createdAt as string);
                return isNaN(d.getTime()) ? null : (
                  <span className="text-[10px] text-muted-foreground/30 font-mono">
                    {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                );
              })()}
              <button
                onClick={() => copyToClipboard(msg.content, setCopiedId, `user-${msg.id || index}`)}
                className="p-1 rounded text-muted-foreground/40 hover:text-white transition-all"
                data-testid={`button-copy-user-${msg.id || index}`}
              >
                {copiedId === `user-${msg.id || index}` ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <AssistantMessage
          msg={msg}
          index={index}
          tesseraMsgStyle={tesseraMsgStyle}
          copiedId={copiedId}
          messageReactions={messageReactions}
          setCopiedId={setCopiedId}
          onReaction={onReaction}
          onRegenerate={onRegenerate}
        />
      )}
    </motion.div>
  );
});

const AssistantMessage = memo(function AssistantMessage({
  msg, index, tesseraMsgStyle, copiedId, messageReactions, setCopiedId, onReaction, onRegenerate,
}: Omit<MessageItemProps, "adminMode">) {
  const [englishOverride, setEnglishOverride] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const toggleEnglish = useCallback(async () => {
    if (englishOverride !== null) { setEnglishOverride(null); return; }
    if (translating) return;
    setTranslating(true);
    try {
      const r = await fetch("/api/sigil/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.content, direction: "decode" }),
      });
      const data = await r.json();
      if (data?.ok && typeof data.output === "string" && data.output.trim()) {
        setEnglishOverride(data.output);
      } else {
        setEnglishOverride(msg.content);
      }
    } catch {
      setEnglishOverride(msg.content);
    } finally {
      setTranslating(false);
    }
  }, [englishOverride, translating, msg.content]);
  const parsedAgent = parseAgentFromMsg(msg.content);
  const agentHz = parsedAgent ? getAgentHz(parsedAgent.name) : getAgentHz("tessera");
  const hzColor = agentHz && agentHz >= 852
    ? "text-violet-300 border-violet-400/30 bg-violet-500/10"
    : agentHz && agentHz >= 528
    ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/10"
    : agentHz && agentHz >= 432
    ? "text-cyan-300 border-cyan-400/30 bg-cyan-500/10"
    : "text-amber-300 border-amber-400/30 bg-amber-500/10";

  const sourceText = englishOverride ?? msg.content;
  const sanitized = sanitizeMessageContent(sourceText);
  const execBlocks = parseCodeExecutionBlocks(sanitized);
  const strippedExec = stripCodeExecutionBlocks(sanitized);
  const { text: after3d, objects: explicit3DObjects } = parse3DObjectBlocks(strippedExec);
  const { text: chartText, charts } = parseChartBlocks(after3d);
  const inferred3DSpec = explicit3DObjects.length === 0 ? inferObjectSpec(msg.content) : null;
  const all3DObjects: Object3DSpec[] = explicit3DObjects.length > 0 ? explicit3DObjects : (inferred3DSpec ? [inferred3DSpec] : []);
  const tokenCount = Math.ceil(msg.content.split(/\s+/).length / 0.75);

  return (
    <div className={cn("group relative rounded-2xl rounded-bl-sm p-4 backdrop-blur-md shadow-lg shadow-black/20",
      tesseraMsgStyle ? tesseraMsgStyle.wrapper : "bg-black/50 border border-cyan-500/15")}>
      <div className="flex items-center gap-1.5 mb-2">
        {!parsedAgent ? (
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shrink-0 border border-violet-500/40" data-testid="img-tessera-chat-avatar">
            <span className="text-[8px] font-bold text-white">✦</span>
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0">
            <span className="text-[6px] font-bold text-white">{parsedAgent.name.charAt(0)}</span>
          </div>
        )}
        <span className="text-[9px] font-bold text-slate-400">{parsedAgent ? parsedAgent.name : "TESSERA"}</span>
        {agentHz && (
          <span className={cn("text-[7px] font-mono font-bold px-1.5 py-0.5 rounded-full border", hzColor)}>{agentHz}Hz</span>
        )}
        {parsedAgent && <span className="text-[8px] text-slate-600 truncate max-w-[120px]">{parsedAgent.role}</span>}
      </div>

      <div className={cn(
        "tessera-message prose prose-invert max-w-none prose-sm prose-p:leading-relaxed prose-p:text-[15px] prose-pre:bg-black/60 prose-pre:border prose-pre:p-4 prose-pre:rounded-xl prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-headings:font-bold prose-strong:text-amber-300 prose-em:text-pink-300 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r-lg prose-a:underline prose-hr:border-cyan-500/10 select-text text-gray-100",
        tesseraMsgStyle
          ? tesseraMsgStyle.prose
          : "prose-pre:border-cyan-500/10 prose-code:text-cyan-300 prose-code:bg-cyan-950/40 prose-h1:text-cyan-300 prose-h2:text-violet-300 prose-h3:text-emerald-300 prose-blockquote:border-l-violet-400/60 prose-blockquote:bg-violet-950/15 prose-blockquote:text-violet-200/90 prose-li:marker:text-emerald-400 prose-a:text-cyan-400 prose-a:decoration-cyan-500/30"
      )}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{chartText}</ReactMarkdown>
      </div>

      {charts.map((chart, ci) => (
        <InlineChart key={ci} chart={chart} />
      ))}

      {all3DObjects.map((obj, oi) => (
        <Suspense key={oi} fallback={<div className="my-3 h-[220px] rounded-xl bg-black/30 border border-white/5 animate-pulse" />}>
          <InlineObject3D spec={obj} />
        </Suspense>
      ))}

      {execBlocks.length > 0 && (
        <div className="mt-2 space-y-2">
          {execBlocks.map((eb, ebi) => (
            <CodeExecutionResult key={`exec-${ebi}`} result={eb.result} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-all">
        {msg.createdAt && (() => {
          const d = new Date(msg.createdAt as string);
          return isNaN(d.getTime()) ? null : (
            <span className="text-[10px] text-muted-foreground/30 font-mono mr-1">
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          );
        })()}
        <button
          onClick={() => copyToClipboard(sourceText, setCopiedId, `ai-${msg.id || index}`)}
          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-white hover:bg-white/5 transition-all"
          title="Copy"
          data-testid={`button-copy-ai-${msg.id || index}`}
        >
          {copiedId === `ai-${msg.id || index}` ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
        </button>
        <button
          onClick={toggleEnglish}
          disabled={translating}
          className={cn(
            "p-1.5 rounded-lg transition-all flex items-center gap-1",
            englishOverride !== null
              ? "text-amber-300 bg-amber-400/10"
              : "text-muted-foreground/40 hover:text-amber-300 hover:bg-white/5",
            translating && "opacity-50 cursor-wait"
          )}
          title={englishOverride !== null ? "Show original glyphs" : "Decrypt to English"}
          data-testid={`button-english-${msg.id || index}`}
        >
          <Languages size={13} />
          <span className="text-[9px] font-bold tracking-wider">{englishOverride !== null ? "GLYPH" : "EN"}</span>
        </button>
        <button
          onClick={() => onRegenerate(index)}
          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-white hover:bg-white/5 transition-all"
          title="Regenerate response"
          data-testid={`button-regenerate-${msg.id || index}`}
        >
          <RefreshCw size={13} />
        </button>
        <button
          onClick={() => {
            fetch("/api/voice/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: msg.content }),
            }).then(r => r.json()).then(data => {
              if (data.audio) playAudioResponse(data.audio);
            }).catch(() => {});
          }}
          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-white hover:bg-white/5 transition-all"
          title="Read aloud"
          data-testid={`button-speak-${msg.id || index}`}
        >
          <Volume2 size={13} />
        </button>
        <div className="w-px h-3 bg-white/[0.06] mx-0.5" />
        <button
          onClick={() => onReaction(`${msg.id || index}`, "up")}
          className={cn("p-1.5 rounded-lg transition-all",
            messageReactions[`${msg.id || index}`] === "up"
              ? "text-emerald-400 bg-emerald-400/10"
              : "text-muted-foreground/40 hover:text-emerald-400 hover:bg-white/5")}
          title="Good response"
          data-testid={`button-thumbsup-${msg.id || index}`}
        >
          <ThumbsUp size={12} />
        </button>
        <button
          onClick={() => onReaction(`${msg.id || index}`, "down")}
          className={cn("p-1.5 rounded-lg transition-all",
            messageReactions[`${msg.id || index}`] === "down"
              ? "text-red-400 bg-red-400/10"
              : "text-muted-foreground/40 hover:text-red-400 hover:bg-white/5")}
          title="Poor response"
          data-testid={`button-thumbsdown-${msg.id || index}`}
        >
          <ThumbsDown size={12} />
        </button>
        <span className="text-[10px] text-muted-foreground/20 font-mono ml-1">{tokenCount}tk</span>
      </div>
    </div>
  );
});
