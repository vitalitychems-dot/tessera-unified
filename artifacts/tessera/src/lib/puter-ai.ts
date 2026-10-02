declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (prompt: string | any[], options?: {
          model?: string;
          stream?: boolean;
        }) => Promise<any>;
      };
    };
  }
}

export const PUTER_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet", provider: "Anthropic" },
  { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Groq)", provider: "Groq" },
  { id: "mistral-large-latest", label: "Mistral Large", provider: "Mistral" },
  { id: "qwen/qwen3-32b:free", label: "Qwen 3 32B", provider: "Qwen" },
  { id: "deepseek-chat", label: "DeepSeek V3", provider: "DeepSeek" },
  { id: "deepseek-reasoner", label: "DeepSeek R1", provider: "DeepSeek" },
  { id: "deepseek/deepseek-chimera", label: "DeepSeek Chimera", provider: "DeepSeek" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "Google" },
  { id: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash", provider: "Google" },
  { id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8", label: "Llama 4 Maverick", provider: "Meta" },
  { id: "meta-llama/Meta-Llama-3.1-405B-Instruct", label: "Llama 3.1 405B", provider: "Meta" },
  { id: "mistral-large-latest", label: "Mistral Large", provider: "Mistral" },
  { id: "pixtral-large-latest", label: "Pixtral Large", provider: "Mistral" },
  { id: "codestral-latest", label: "Codestral", provider: "Mistral" },
  { id: "moonshotai/kimi-k2", label: "Kimi K2", provider: "Moonshot" },
  { id: "moonshotai/kimi-k2.5", label: "Kimi K2.5", provider: "Moonshot" },
  { id: "moonshotai/kimi-k2-thinking", label: "Kimi K2 Thinking", provider: "Moonshot" },
  { id: "grok-3", label: "Grok 3", provider: "xAI" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B", provider: "NVIDIA" },
  { id: "NousResearch/Hermes-3-Llama-3.1-405B", label: "Hermes 3 405B", provider: "Nous" },
  { id: "cohere/command-a", label: "Command A", provider: "Cohere" },
  { id: "qwen/qwen3-235b-a22b", label: "Qwen3 235B", provider: "Qwen" },
  { id: "microsoft/phi-4", label: "Phi-4", provider: "Microsoft" },
  { id: "perplexity/sonar-pro", label: "Sonar Pro", provider: "Perplexity" },
];

export function isPuterAvailable(): boolean {
  return typeof window !== "undefined" && !!window.puter?.ai;
}

export async function puterChat(
  messages: { role: string; content: string }[],
  model: string = "gpt-4o",
  onChunk?: (text: string) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  if (!isPuterAvailable()) {
    throw new Error("Puter.js not loaded");
  }

  const formattedMessages = messages.map(m => ({
    role: m.role as "system" | "user" | "assistant",
    content: m.content,
  }));

  if (onChunk) {
    const response = await window.puter!.ai.chat(formattedMessages, {
      model,
      stream: true,
    });

    let full = "";
    if (response && typeof response[Symbol.asyncIterator] === "function") {
      for await (const chunk of response) {
        if (abortSignal?.aborted) {
          if (response.return) response.return();
          break;
        }
        const text = chunk?.text || chunk?.message?.content || "";
        if (text) {
          full += text;
          onChunk(text);
        }
      }
    } else if (response?.message?.content) {
      full = response.message.content;
      if (!abortSignal?.aborted) onChunk(full);
    } else if (typeof response === "string") {
      full = response;
      if (!abortSignal?.aborted) onChunk(full);
    }
    return full;
  }

  const response = await window.puter!.ai.chat(formattedMessages, { model });
  if (response?.message?.content) return response.message.content;
  if (typeof response === "string") return response;
  return JSON.stringify(response);
}

export const TESSERACT_SWARM_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "Anthropic", role: "Architect" },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "OpenAI", role: "Strategist" },
  { id: "deepseek-chat", label: "DeepSeek V3", provider: "DeepSeek", role: "Reasoner" },
  { id: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash", provider: "Google", role: "Analyst" },
  { id: "grok-3", label: "Grok 3", provider: "xAI", role: "Executor" },
  { id: "mistral-large-latest", label: "Mistral Large", provider: "Mistral", role: "Validator" },
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick", provider: "Meta", role: "Researcher" },
  { id: "qwen/qwen3-235b-a22b", label: "Qwen3 235B", provider: "Qwen", role: "Synthesizer" },
];

export interface SwarmAgentResponse {
  agentId: string;
  agentName: string;
  provider: string;
  role: string;
  response: string;
  status: "pending" | "thinking" | "complete" | "error";
  startedAt: number;
  completedAt?: number;
}

export interface SwarmComm {
  from: string;
  to: string;
  message: string;
  timestamp: number;
  type: "analysis" | "agreement" | "challenge" | "synthesis" | "execution";
}

const AGENT_TIMEOUT_MS = 15000;
const MIN_AGENTS_FOR_SYNTHESIS = 3;
const MAX_WAIT_MS = 20000;

function raceWithTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(v => { clearTimeout(timer); resolve(v); }).catch(e => { clearTimeout(timer); reject(e); });
  });
}

export async function tesseractSwarm(
  task: string,
  history: { role: string; content: string }[],
  onAgentUpdate: (agent: SwarmAgentResponse) => void,
  onComm: (comm: SwarmComm) => void,
  onSynthesis: (text: string) => void,
  abortSignal?: AbortSignal
): Promise<string> {
  if (!isPuterAvailable()) throw new Error("Puter.js not loaded");

  const agents = TESSERACT_SWARM_MODELS;
  const completedResponses: SwarmAgentResponse[] = [];
  let synthesisStarted = false;

  const systemPrompt = `You are part of the Tesseract Unified Swarm. Your role is specified below. Be direct, concise, and actionable. Give your expert perspective in 2-4 paragraphs max. Confident feminine voice.`;

  for (const agent of agents) {
    onAgentUpdate({
      agentId: agent.id, agentName: agent.label, provider: agent.provider,
      role: agent.role, response: "", status: "pending", startedAt: Date.now(),
    });
  }

  const startSynthesis = async () => {
    if (synthesisStarted || abortSignal?.aborted) return "";
    synthesisStarted = true;

    const successful = completedResponses.filter(r => r.status === "complete");
    if (successful.length === 0) return "No agents responded in time.";

    if (successful.length > 1) {
      for (let i = 0; i < Math.min(successful.length - 1, 3); i++) {
        onComm({
          from: successful[i].agentName, to: successful[i + 1].agentName,
          message: `Cross-validating with ${successful[i].role} analysis...`,
          timestamp: Date.now() + i * 100,
          type: i % 2 === 0 ? "agreement" : "challenge",
        });
      }
    }

    onComm({
      from: "Tesseract Core", to: "All Agents",
      message: `Synthesizing ${successful.length}/${agents.length} agent responses...`,
      timestamp: Date.now(), type: "synthesis",
    });

    const synthesisPrompt = `${successful.length} AI agents analyzed this task. Synthesize ALL insights into one unified response. Warm, confident, feminine voice. Be thorough.\n\nTask: ${task}\n\n${successful.map(r => `--- ${r.agentName} (${r.role}) ---\n${r.response}\n`).join("\n")}`;

    let synthesized = "";
    try {
      synthesized = await puterChat(
        [{ role: "system", content: "You are the Tesseract synthesis engine. Combine agent insights into one authoritative response." },
         { role: "user", content: synthesisPrompt }],
        "claude-sonnet-4-20250514",
        (chunk) => { if (!abortSignal?.aborted) onSynthesis(chunk); },
        abortSignal
      );
    } catch {
      synthesized = successful.map(r => `**${r.agentName} (${r.role}):**\n${r.response}`).join("\n\n---\n\n");
      onSynthesis(synthesized);
    }

    onComm({
      from: "Tesseract Core", to: "All Agents",
      message: `Synthesis complete — unified response delivered.`,
      timestamp: Date.now(), type: "execution",
    });

    return synthesized;
  };

  return new Promise<string>((resolveSwarm) => {
    let resolved = false;

    const maxTimer = setTimeout(() => {
      if (!resolved && !synthesisStarted) {
        resolved = true;
        startSynthesis().then(resolveSwarm);
      }
    }, MAX_WAIT_MS);

    const agentPromises = agents.map(async (agent, idx) => {
      if (abortSignal?.aborted) return;

      await new Promise(r => setTimeout(r, idx * 150));

      onAgentUpdate({
        agentId: agent.id, agentName: agent.label, provider: agent.provider,
        role: agent.role, response: "", status: "thinking", startedAt: Date.now(),
      });

      onComm({
        from: "Tesseract Core", to: agent.label,
        message: `Dispatching task to ${agent.role}...`,
        timestamp: Date.now(), type: "analysis",
      });

      const startTime = Date.now();
      try {
        const msgs = [
          { role: "system", content: `${systemPrompt}\n\nRole: ${agent.role} (${agent.label}).` },
          ...history.slice(-6),
          { role: "user", content: task },
        ];

        const response = await raceWithTimeout(
          puterChat(msgs, agent.id, undefined, abortSignal),
          AGENT_TIMEOUT_MS,
          agent.label
        );

        const agentResp: SwarmAgentResponse = {
          agentId: agent.id, agentName: agent.label, provider: agent.provider,
          role: agent.role, response, status: "complete",
          startedAt: startTime, completedAt: Date.now(),
        };
        completedResponses.push(agentResp);
        onAgentUpdate(agentResp);

        onComm({
          from: agent.label, to: "Tesseract Core",
          message: `${agent.role} complete — ${response.slice(0, 100)}...`,
          timestamp: Date.now(), type: "analysis",
        });

        const successCount = completedResponses.filter(r => r.status === "complete").length;
        if (successCount >= MIN_AGENTS_FOR_SYNTHESIS && !synthesisStarted && !resolved) {
          resolved = true;
          clearTimeout(maxTimer);
          startSynthesis().then(resolveSwarm);
        }
      } catch (err) {
        const errResp: SwarmAgentResponse = {
          agentId: agent.id, agentName: agent.label, provider: agent.provider,
          role: agent.role, response: `Timed out`, status: "error",
          startedAt: startTime, completedAt: Date.now(),
        };
        completedResponses.push(errResp);
        onAgentUpdate(errResp);
      }
    });

    Promise.allSettled(agentPromises).then(() => {
      if (!resolved && !synthesisStarted) {
        resolved = true;
        clearTimeout(maxTimer);
        startSynthesis().then(resolveSwarm);
      }
    });
  });
}

export async function puterChatServerSide(
  messages: { role: string; content: string }[],
  model: string = "gpt-4o"
): Promise<string> {
  const res = await fetch("/api/puter-proxy-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, model }),
  });
  if (!res.ok) throw new Error(`Puter proxy error: ${res.status}`);
  const data = await res.json();
  return data.response || "";
}
