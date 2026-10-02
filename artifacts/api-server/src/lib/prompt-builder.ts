import type { LLMMessage } from "./llm-client";
import type { RetrievedChunk } from "./hybrid-retrieval";
import type { ToolInvocationResult } from "./tool-registry";

const APPROX_CHARS_PER_TOKEN = 4;

export interface PromptParts {
  systemPrompt: string;
  conversationSummary?: string;
  retrievedChunks?: RetrievedChunk[];
  toolResults?: ToolInvocationResult[];
  history?: LLMMessage[];
  userQuery: string;
  workingMemory?: string;
}

export interface PromptBuilderOpts {
  budgetTokens?: number;
  reserveForResponse?: number;
}

export interface BuiltPrompt {
  messages: LLMMessage[];
  estimatedTokens: number;
  truncated: boolean;
  citationsUsed: number;
}

function approxTokens(s: string): number {
  return Math.ceil((s || "").length / APPROX_CHARS_PER_TOKEN);
}

function trimToBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * APPROX_CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 30) + "\n…[truncated]";
}

export function buildPrompt(parts: PromptParts, opts: PromptBuilderOpts = {}): BuiltPrompt {
  const { budgetTokens = 8000, reserveForResponse = 1500 } = opts;
  const available = Math.max(1000, budgetTokens - reserveForResponse);

  let truncated = false;
  let used = 0;

  const sys = parts.systemPrompt;
  used += approxTokens(sys);

  const sections: string[] = [];

  if (parts.workingMemory && parts.workingMemory.trim()) {
    const block = `[WORKING MEMORY]\n${parts.workingMemory.trim()}`;
    sections.push(block);
    used += approxTokens(block);
  }

  if (parts.conversationSummary && parts.conversationSummary.trim()) {
    const block = `[CONVERSATION SUMMARY]\n${parts.conversationSummary.trim()}`;
    sections.push(block);
    used += approxTokens(block);
  }

  let citationsUsed = 0;
  if (parts.retrievedChunks && parts.retrievedChunks.length > 0) {
    const lines: string[] = ["[RETRIEVED CONTEXT — cite as [n] when used]"];
    for (let i = 0; i < parts.retrievedChunks.length; i++) {
      const c = parts.retrievedChunks[i];
      const remaining = available - used;
      if (remaining < 200) { truncated = true; break; }
      const chunkBudget = Math.min(400, Math.floor(remaining / 3));
      const text = trimToBudget(c.text, chunkBudget);
      const line = `[${i + 1}] (${c.source}) ${text}`;
      lines.push(line);
      used += approxTokens(line);
      citationsUsed++;
    }
    sections.push(lines.join("\n"));
  }

  if (parts.toolResults && parts.toolResults.length > 0) {
    const lines: string[] = ["[TOOL RESULTS]"];
    for (const r of parts.toolResults) {
      const body = r.ok
        ? `${r.name}: ${JSON.stringify(r.result).slice(0, 600)}`
        : `${r.name} ERROR: ${r.error}`;
      lines.push(body);
    }
    const block = lines.join("\n");
    sections.push(block);
    used += approxTokens(block);
  }

  const augmentedSystem = sections.length > 0
    ? `${sys}\n\n${sections.join("\n\n")}`
    : sys;

  const messages: LLMMessage[] = [{ role: "system", content: augmentedSystem }];

  const history = parts.history || [];
  const historyBudget = Math.max(0, available - used - approxTokens(parts.userQuery) - 200);
  let historyUsed = 0;
  const trimmedHistory: LLMMessage[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const t = approxTokens(msg.content);
    if (historyUsed + t > historyBudget) { truncated = true; break; }
    trimmedHistory.unshift(msg);
    historyUsed += t;
  }
  messages.push(...trimmedHistory);
  messages.push({ role: "user", content: parts.userQuery });

  used += historyUsed + approxTokens(parts.userQuery);

  return { messages, estimatedTokens: used, truncated, citationsUsed };
}
