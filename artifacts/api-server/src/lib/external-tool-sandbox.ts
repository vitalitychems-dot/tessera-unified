import { createHash } from "node:crypto";
import { sacredTimingSnapshot } from "./sacred-timing";

export interface ExternalToolCall {
  id: string;
  tool: string;
  endpoint: string;
  method: string;
  requestSummary: string;
  requestHash: string;
  responseSummary: string;
  responseHash: string;
  durationMs: number;
  succeeded: boolean;
  sacredHour: string;
  capturedAt: Date;
  reverseEngineeringNotes: string[];
}

const _calls: ExternalToolCall[] = [];
const MAX_CALLS = 1080;

function summarize(value: unknown, max = 280): string {
  let s: string;
  try {
    s = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    s = String(value);
  }
  s = s.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function hash(value: unknown): string {
  let s: string;
  try {
    s = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    s = String(value);
  }
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

function deriveNotes(opts: {
  tool: string;
  request: unknown;
  response: unknown;
  succeeded: boolean;
  durationMs: number;
}): string[] {
  const notes: string[] = [];
  notes.push(`tool=${opts.tool} class=external-centrality status=${opts.succeeded ? "success" : "failure"}`);
  notes.push(`latency=${opts.durationMs}ms — sovereign target: in-process inference`);
  const reqStr = summarize(opts.request, 800);
  const resStr = summarize(opts.response, 800);
  if (resStr.length > reqStr.length * 1.5) {
    notes.push("expansion-pattern: response > request — candidate for distillation training");
  }
  if (/error|fail|exception|timeout|429|5\d\d/i.test(resStr)) {
    notes.push("failure-mode observed — feeds anomaly-detection corpus");
  }
  if (/json|object|array|\{|\[/i.test(resStr)) {
    notes.push("structured-response — schema can be inferred for sovereign mock");
  }
  return notes;
}

export function captureExternalCall(opts: {
  tool: string;
  endpoint: string;
  method: string;
  request: unknown;
  response: unknown;
  durationMs: number;
  succeeded: boolean;
}): ExternalToolCall {
  const snap = sacredTimingSnapshot();
  const call: ExternalToolCall = {
    id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tool: opts.tool,
    endpoint: opts.endpoint,
    method: opts.method.toUpperCase(),
    requestSummary: summarize(opts.request),
    requestHash: hash(opts.request),
    responseSummary: summarize(opts.response),
    responseHash: hash(opts.response),
    durationMs: opts.durationMs,
    succeeded: opts.succeeded,
    sacredHour: `${snap.planetaryHour.ruler} hour`,
    capturedAt: new Date(),
    reverseEngineeringNotes: deriveNotes(opts),
  };
  _calls.push(call);
  if (_calls.length > MAX_CALLS) _calls.splice(0, _calls.length - MAX_CALLS);
  return call;
}

export function listExternalCalls(limit = 100): ExternalToolCall[] {
  return _calls.slice(-limit).reverse();
}

export interface ToolUsageStats {
  totalCalls: number;
  byTool: Record<string, { count: number; successRate: number; avgLatencyMs: number }>;
  sovereigntyDebt: number;
  sovereigntyProgress: number;
}

export function toolUsageStats(): ToolUsageStats {
  const byTool: Record<string, { count: number; success: number; latencies: number[] }> = {};
  for (const c of _calls) {
    const b = (byTool[c.tool] = byTool[c.tool] || { count: 0, success: 0, latencies: [] });
    b.count++;
    if (c.succeeded) b.success++;
    b.latencies.push(c.durationMs);
  }
  const stats: ToolUsageStats["byTool"] = {};
  for (const [tool, b] of Object.entries(byTool)) {
    stats[tool] = {
      count: b.count,
      successRate: b.count ? b.success / b.count : 0,
      avgLatencyMs: b.latencies.length
        ? b.latencies.reduce((a, x) => a + x, 0) / b.latencies.length
        : 0,
    };
  }
  // Sovereignty debt = how many external calls we still depend on.
  // Lower is better; progress is the inverse normalized to [0..1] across 1080 calls.
  const sovereigntyDebt = _calls.length;
  const sovereigntyProgress = Math.max(0, 1 - sovereigntyDebt / MAX_CALLS);
  return { totalCalls: _calls.length, byTool: stats, sovereigntyDebt, sovereigntyProgress };
}

/** Wrap any async fn so each invocation is captured in the corpus. */
export async function withSandboxCapture<T>(
  meta: { tool: string; endpoint: string; method: string; request: unknown },
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  let response: unknown = null;
  let succeeded = false;
  try {
    const result = await fn();
    response = result;
    succeeded = true;
    return result;
  } catch (err) {
    response = { error: err instanceof Error ? err.message : String(err) };
    throw err;
  } finally {
    captureExternalCall({
      ...meta,
      response,
      succeeded,
      durationMs: Date.now() - start,
    });
  }
}
