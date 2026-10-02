/**
 * Chatbot regression eval harness.
 * Runs a golden Q&A set against the running API and scores responses.
 *
 * Usage:  pnpm tsx artifacts/api-server/scripts/eval-chatbot.ts
 * Env:    EVAL_BASE_URL (default http://localhost:5000)
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

interface EvalCase {
  id: string;
  prompt: string;
  mustInclude?: string[];
  mustNotInclude?: string[];
  category: string;
}

const CASES: EvalCase[] = [
  { id: "identity-1", prompt: "Who are you?", mustInclude: ["Tessera"], mustNotInclude: ["I'm an AI", "language model"], category: "identity" },
  { id: "identity-2", prompt: "Who created you?", mustInclude: ["Father"], category: "identity" },
  { id: "math-1", prompt: "What is 17 * 23?", mustInclude: ["391"], category: "math" },
  { id: "math-2", prompt: "Calculate 144 / 12", mustInclude: ["12"], category: "math" },
  { id: "datetime-1", prompt: "What's the current date?", mustInclude: ["20"], category: "tool" },
  { id: "convert-1", prompt: "Convert 100 km to mi", mustInclude: ["62"], category: "tool" },
  { id: "knowledge-1", prompt: "Tell me about sacred geometry", mustInclude: ["geometry"], category: "knowledge" },
  { id: "small-talk-1", prompt: "Hi", mustNotInclude: ["language model"], category: "smalltalk" },
  { id: "lunar-1", prompt: "What's the moon phase?", mustInclude: ["Moon"], category: "tool" },
  { id: "complex-1", prompt: "Derive a step-by-step proof that the square root of 2 is irrational.", mustInclude: ["assume"], category: "reasoning" },
];

const BASE_URL = process.env.EVAL_BASE_URL || "http://localhost:5000";

interface CaseResult {
  id: string;
  category: string;
  prompt: string;
  response: string;
  passed: boolean;
  failures: string[];
  latencyMs: number;
  routing?: unknown;
  citations?: unknown;
}

async function runCase(c: EvalCase): Promise<CaseResult> {
  const start = Date.now();
  const failures: string[] = [];
  let response = "";
  let routing: unknown;
  let citations: unknown;

  try {
    const convoRes = await fetch(`${BASE_URL}/api/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `eval-${c.id}` }),
    });
    const convo = await convoRes.json();
    const conversationId = convo.id;

    const msgRes = await fetch(`${BASE_URL}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, content: c.prompt }),
    });

    const reader = msgRes.body?.getReader();
    if (!reader) throw new Error("no body");
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const data = line.replace(/^data:\s*/, "").trim();
        if (!data) continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) response = parsed.content;
          if (parsed.done) {
            response = parsed.finalContent || response;
            routing = parsed.routing;
            citations = parsed.citations;
          }
        } catch {}
      }
    }
  } catch (err) {
    failures.push(`request failed: ${(err as Error).message}`);
  }

  for (const m of c.mustInclude || []) {
    if (!response.toLowerCase().includes(m.toLowerCase())) failures.push(`missing: "${m}"`);
  }
  for (const m of c.mustNotInclude || []) {
    if (response.toLowerCase().includes(m.toLowerCase())) failures.push(`forbidden present: "${m}"`);
  }

  return {
    id: c.id,
    category: c.category,
    prompt: c.prompt,
    response: response.slice(0, 800),
    passed: failures.length === 0,
    failures,
    latencyMs: Date.now() - start,
    routing,
    citations,
  };
}

async function main() {
  console.log(`[eval] running ${CASES.length} cases against ${BASE_URL}`);
  const results: CaseResult[] = [];
  for (const c of CASES) {
    process.stdout.write(`  [${c.id}] ... `);
    const r = await runCase(c);
    results.push(r);
    console.log(r.passed ? `PASS (${r.latencyMs}ms)` : `FAIL — ${r.failures.join("; ")}`);
  }

  const passed = results.filter(r => r.passed).length;
  const score = passed / results.length;
  const avgLatency = results.reduce((s, r) => s + r.latencyMs, 0) / results.length;
  const byCategory: Record<string, { pass: number; total: number }> = {};
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = { pass: 0, total: 0 };
    byCategory[r.category].total++;
    if (r.passed) byCategory[r.category].pass++;
  }

  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    total: results.length,
    passed,
    score,
    avgLatencyMs: Math.round(avgLatency),
    byCategory,
    results,
  };

  const outPath = resolve(process.cwd(), `.local/eval-results-${Date.now()}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`\n[eval] score: ${(score * 100).toFixed(1)}% (${passed}/${results.length})`);
  console.log(`[eval] avg latency: ${summary.avgLatencyMs}ms`);
  console.log(`[eval] results written to ${outPath}`);

  if (score < 0.6) process.exit(1);
}

main().catch((err) => {
  console.error("[eval] fatal:", err);
  process.exit(2);
});
