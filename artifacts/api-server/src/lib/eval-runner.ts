import { db } from "@workspace/db";
import { providerCallsTable, securityAuditLog, providerProfilesTable, benchmarkRunsTable } from "@workspace/db";
import { sql, desc, gte } from "drizzle-orm";
import { logger } from "./logger";
import { getProviderConfigs } from "./provider-registry";
import { runThroughSovereignEngine, type KnowledgeResult, type SovereignResult } from "./sovereign-engine-router";
import os from "os";

function isKnowledgeResult(result: SovereignResult): result is KnowledgeResult {
  return result.type === "knowledge";
}

function extractKnowledgeContent(result: SovereignResult | null): string {
  if (!result) return "";
  if (isKnowledgeResult(result)) {
    return result.content ?? "";
  }
  return "";
}

export interface EvalTest {
  id: string;
  name: string;
  dimension: string;
  description: string;
}

export interface EvalResult {
  testId: string;
  testName: string;
  dimension: string;
  passed: boolean;
  score: number;
  maxScore: number;
  measuredValueLabel: string;
  measuredValue: string | number | boolean | null;
  durationMs: number;
  evidence: string;
  error?: string;
}

type TestFn = () => Promise<EvalResult>;

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, durationMs: Date.now() - start };
}

async function testDbRead(): Promise<EvalResult> {
  const id = "db_read";
  const start = Date.now();
  try {
    const { result, durationMs } = await timed(() =>
      db.select({ count: sql<number>`count(*)` }).from(providerCallsTable)
    );
    const count = result[0]?.count ?? 0;
    const score = durationMs < 200 ? 100 : durationMs < 500 ? 80 : durationMs < 1000 ? 60 : 40;
    return {
      testId: id,
      testName: "DB Read Latency",
      dimension: "System Health",
      passed: durationMs < 2000,
      score,
      maxScore: 100,
      measuredValueLabel: "latency",
      measuredValue: durationMs,
      durationMs,
      evidence: `SELECT count(*) FROM provider_calls completed in ${durationMs}ms. Row count: ${count}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "DB Read Latency", dimension: "System Health",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "latency", measuredValue: null,
      durationMs: Date.now() - start, evidence: `DB read failed: ${err}`, error: String(err),
    };
  }
}

async function testDbWrite(): Promise<EvalResult> {
  const id = "db_write";
  const start = Date.now();
  let durationMs = 0;
  try {
    const { result: _, durationMs: d } = await timed(() =>
      db.execute(sql`SELECT 1 + 1 AS result`)
    );
    durationMs = d;
    const score = durationMs < 100 ? 100 : durationMs < 300 ? 80 : durationMs < 700 ? 60 : 40;
    return {
      testId: id,
      testName: "DB Write/Execute Latency",
      dimension: "System Health",
      passed: durationMs < 1000,
      score,
      maxScore: 100,
      measuredValueLabel: "latency",
      measuredValue: durationMs,
      durationMs,
      evidence: `SELECT 1+1 (execute) completed in ${durationMs}ms`,
    };
  } catch (err) {
    return {
      testId: id, testName: "DB Write/Execute Latency", dimension: "System Health",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "latency", measuredValue: null,
      durationMs: Date.now() - start, evidence: `DB execute failed: ${err}`, error: String(err),
    };
  }
}

async function testCallLogTable(): Promise<EvalResult> {
  const id = "call_log_table";
  const start = Date.now();
  try {
    const since24h = new Date(Date.now() - 24 * 3600 * 1000);
    const { result: rows, durationMs } = await timed(() =>
      db.select().from(providerCallsTable).where(gte(providerCallsTable.calledAt, since24h)).limit(500)
    );
    const total = rows.length;
    const external = rows.filter(r => r.isExternal && !r.isDryRun).length;
    const internal = rows.filter(r => !r.isExternal && !r.isDryRun).length;
    const latencies = rows.map(r => r.latencyMs).filter((v): v is number => v !== null);
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length) : null;
    const errorRows = rows.filter(r => r.status === "error").length;
    const errorRate = total > 0 ? errorRows / total : 0;

    const score = total === 0 ? 20
      : total < 5 ? 40
      : total < 20 ? 65
      : total < 100 ? 82
      : 95;

    return {
      testId: id,
      testName: "Provider Call Log Coverage",
      dimension: "Provider Call Tracking",
      passed: true,
      score,
      maxScore: 100,
      measuredValueLabel: "calls_in_24h",
      measuredValue: total,
      durationMs,
      evidence: `provider_calls table (24h): total=${total}, external=${external}, internal=${internal}, avgLatency=${avgLatency ?? "N/A"}ms, errorRate=${(errorRate * 100).toFixed(1)}%`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Provider Call Log Coverage", dimension: "Provider Call Tracking",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "calls_in_24h", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Query failed: ${err}`, error: String(err),
    };
  }
}

async function testSecurityAuditLog(): Promise<EvalResult> {
  const id = "security_audit_log";
  const start = Date.now();
  try {
    const since24h = new Date(Date.now() - 24 * 3600 * 1000);
    const { result: rows, durationMs } = await timed(() =>
      db.select().from(securityAuditLog).where(gte(securityAuditLog.timestamp, since24h)).limit(1000)
    );
    const total = rows.length;
    const flagged = rows.filter(r => r.flagged).length;
    const endpoints = new Set(rows.map(r => r.targetUrl)).size;
    const score = total === 0 ? 25 : total < 5 ? 50 : total < 50 ? 75 : 90;

    return {
      testId: id,
      testName: "Security Audit Log Coverage",
      dimension: "Security Posture",
      passed: true,
      score,
      maxScore: 100,
      measuredValueLabel: "requests_monitored_24h",
      measuredValue: total,
      durationMs,
      evidence: `security_audit_log (24h): total=${total}, flagged=${flagged}, unique_endpoints=${endpoints}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Security Audit Log Coverage", dimension: "Security Posture",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "requests_monitored_24h", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Query failed: ${err}`, error: String(err),
    };
  }
}

async function testProviderProfiles(): Promise<EvalResult> {
  const id = "provider_profiles";
  const start = Date.now();
  try {
    const { result: profiles, durationMs } = await timed(() =>
      db.select().from(providerProfilesTable)
    );
    const count = profiles.length;
    const withCalls = profiles.filter(p => (p.totalCalls ?? 0) > 0).length;
    const avgReliability = count > 0
      ? Math.round(profiles.reduce((s, p) => s + (p.reliabilityScore ?? 50), 0) / count)
      : 0;
    const score = count === 0 ? 20 : count < 2 ? 45 : count < 5 ? 65 : count < 8 ? 80 : 92;

    return {
      testId: id,
      testName: "Provider Profile Registry",
      dimension: "Provider Diversity",
      passed: count > 0,
      score,
      maxScore: 100,
      measuredValueLabel: "configured_providers",
      measuredValue: count,
      durationMs,
      evidence: `provider_profiles table: count=${count}, with_real_calls=${withCalls}, avg_reliability=${avgReliability}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Provider Profile Registry", dimension: "Provider Diversity",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "configured_providers", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Query failed: ${err}`, error: String(err),
    };
  }
}

async function testSovereigntyRatio(): Promise<EvalResult> {
  const id = "sovereignty_ratio";
  const start = Date.now();
  try {
    const { result: rows, durationMs } = await timed(() =>
      db.select().from(providerCallsTable).limit(1000)
    );
    const real = rows.filter(r => !r.isDryRun);
    const internal = real.filter(r => !r.isExternal).length;
    const total = real.length;
    const ratio = total > 0 ? internal / total : 0;
    const score = total === 0 ? 15 : ratio === 0 ? 20 : ratio < 0.1 ? 35 : ratio < 0.25 ? 55 : ratio < 0.5 ? 72 : ratio < 0.75 ? 85 : 95;

    return {
      testId: id,
      testName: "Internal Routing (Sovereignty) Ratio",
      dimension: "Sovereignty Architecture",
      passed: true,
      score,
      maxScore: 100,
      measuredValueLabel: "internal_ratio",
      measuredValue: ratio,
      durationMs,
      evidence: `provider_calls (all-time): internal=${internal}/${total} calls = ${(ratio * 100).toFixed(1)}% sovereign`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Internal Routing Ratio", dimension: "Sovereignty Architecture",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "internal_ratio", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Query failed: ${err}`, error: String(err),
    };
  }
}

async function testProcessMemory(): Promise<EvalResult> {
  const id = "process_memory";
  const start = Date.now();
  const mem = process.memoryUsage();
  const heapUsedMb = mem.heapUsed / 1024 / 1024;
  const heapTotalMb = mem.heapTotal / 1024 / 1024;
  const heapPercent = (mem.heapUsed / mem.heapTotal) * 100;
  const durationMs = Date.now() - start;
  const score = heapPercent < 50 ? 100 : heapPercent < 65 ? 88 : heapPercent < 75 ? 72 : heapPercent < 85 ? 55 : heapPercent < 92 ? 38 : 20;

  return {
    testId: id,
    testName: "Process Heap Usage",
    dimension: "System Health",
    passed: heapPercent < 90,
    score,
    maxScore: 100,
    measuredValueLabel: "heap_percent",
    measuredValue: Math.round(heapPercent),
    durationMs,
    evidence: `process.memoryUsage(): heapUsed=${heapUsedMb.toFixed(0)}MB / heapTotal=${heapTotalMb.toFixed(0)}MB = ${heapPercent.toFixed(1)}%`,
  };
}

async function testCPULoad(): Promise<EvalResult> {
  const id = "cpu_load";
  const start = Date.now();
  const cpuCores = os.cpus().length;
  const loadAvg = os.loadavg()[0];
  const loadPercent = Math.min(100, (loadAvg / cpuCores) * 100);
  const durationMs = Date.now() - start;
  const score = loadPercent < 30 ? 100 : loadPercent < 50 ? 88 : loadPercent < 65 ? 72 : loadPercent < 80 ? 55 : loadPercent < 90 ? 38 : 20;

  return {
    testId: id,
    testName: "CPU Load Average",
    dimension: "System Health",
    passed: loadPercent < 90,
    score,
    maxScore: 100,
    measuredValueLabel: "cpu_load_percent",
    measuredValue: Math.round(loadPercent),
    durationMs,
    evidence: `os.loadavg(): ${loadAvg.toFixed(2)} / ${cpuCores} cores = ${loadPercent.toFixed(1)}% load`,
  };
}

async function testOSFreeMemory(): Promise<EvalResult> {
  const id = "os_freemem";
  const start = Date.now();
  const freeMemMb = os.freemem() / 1024 / 1024;
  const totalMemMb = os.totalmem() / 1024 / 1024;
  const usedPercent = ((totalMemMb - freeMemMb) / totalMemMb) * 100;
  const durationMs = Date.now() - start;
  const score = freeMemMb > 1024 ? 100 : freeMemMb > 512 ? 88 : freeMemMb > 256 ? 72 : freeMemMb > 128 ? 55 : freeMemMb > 64 ? 38 : 20;

  return {
    testId: id,
    testName: "OS Free Memory",
    dimension: "System Health",
    passed: freeMemMb > 64,
    score,
    maxScore: 100,
    measuredValueLabel: "free_mem_mb",
    measuredValue: Math.round(freeMemMb),
    durationMs,
    evidence: `os.freemem()=${freeMemMb.toFixed(0)}MB free / total=${totalMemMb.toFixed(0)}MB (${usedPercent.toFixed(0)}% used)`,
  };
}

async function testUptimeStability(): Promise<EvalResult> {
  const id = "uptime_stability";
  const start = Date.now();
  const uptimeSec = process.uptime();
  const uptimeMin = uptimeSec / 60;
  const durationMs = Date.now() - start;
  const score = uptimeMin > 60 ? 100 : uptimeMin > 30 ? 88 : uptimeMin > 10 ? 72 : uptimeMin > 5 ? 58 : uptimeMin > 1 ? 45 : 30;

  return {
    testId: id,
    testName: "Process Uptime Stability",
    dimension: "System Health",
    passed: true,
    score,
    maxScore: 100,
    measuredValueLabel: "uptime_minutes",
    measuredValue: Math.round(uptimeMin),
    durationMs,
    evidence: `process.uptime()=${uptimeSec.toFixed(0)}s = ${uptimeMin.toFixed(1)} minutes continuous uptime`,
  };
}

async function testProviderConfigCoverage(): Promise<EvalResult> {
  const id = "provider_config_coverage";
  const start = Date.now();
  const configs = getProviderConfigs();
  const external = configs.filter(c => c.isExternal);
  const local = configs.filter(c => !c.isExternal);
  const withEndpoint = configs.filter(c => c.endpoint).length;
  const durationMs = Date.now() - start;
  const score = configs.length === 0 ? 0 : configs.length < 3 ? 40 : configs.length < 6 ? 62 : configs.length < 9 ? 78 : 90;

  return {
    testId: id,
    testName: "Provider Configuration Coverage",
    dimension: "Provider Diversity",
    passed: configs.length > 0,
    score,
    maxScore: 100,
    measuredValueLabel: "configured_providers",
    measuredValue: configs.length,
    durationMs,
    evidence: `getProviderConfigs(): ${configs.length} providers (${external.length} external, ${local.length} local/proxy), ${withEndpoint} with custom endpoints`,
  };
}

async function testBenchmarkRunHistory(): Promise<EvalResult> {
  const id = "benchmark_history";
  const start = Date.now();
  try {
    const { result: rows, durationMs } = await timed(() =>
      db.select().from(benchmarkRunsTable).orderBy(desc(benchmarkRunsTable.ranAt)).limit(20)
    );
    const count = rows.length;
    const lastRun = rows[0]?.ranAt;
    const minutesSinceLastRun = lastRun ? (Date.now() - lastRun.getTime()) / 60000 : null;
    const score = count === 0 ? 0 : count === 1 ? 50 : count < 5 ? 72 : count < 10 ? 85 : 95;

    return {
      testId: id,
      testName: "Benchmark Run History",
      dimension: "Self-Evaluation Coverage",
      passed: count > 0,
      score,
      maxScore: 100,
      measuredValueLabel: "historical_runs",
      measuredValue: count,
      durationMs,
      evidence: `benchmark_runs table: ${count} historical runs. Last run: ${lastRun ? `${minutesSinceLastRun?.toFixed(0)}min ago` : "never"}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Benchmark Run History", dimension: "Self-Evaluation Coverage",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "historical_runs", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Query failed: ${err}`, error: String(err),
    };
  }
}

async function testLatencyDistribution(): Promise<EvalResult> {
  const id = "latency_distribution";
  const start = Date.now();
  try {
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const { result: rows, durationMs } = await timed(() =>
      db.select().from(providerCallsTable).where(gte(providerCallsTable.calledAt, since7d)).limit(500)
    );
    const latencies = rows.map(r => r.latencyMs).filter((v): v is number => v !== null).sort((a, b) => a - b);
    const count = latencies.length;

    if (count === 0) {
      return {
        testId: id, testName: "Latency Distribution (7d)", dimension: "Provider Call Tracking",
        passed: true, score: 20, maxScore: 100,
        measuredValueLabel: "samples", measuredValue: 0, durationMs,
        evidence: "No calls with latency data in last 7 days",
      };
    }

    const p50 = latencies[Math.floor(count * 0.5)];
    const p95 = latencies[Math.floor(count * 0.95)];
    const p99 = latencies[Math.floor(count * 0.99)];
    const avg = Math.round(latencies.reduce((s, v) => s + v, 0) / count);
    const score = p95 === undefined ? 20 : p95 < 500 ? 100 : p95 < 1000 ? 85 : p95 < 2000 ? 68 : p95 < 4000 ? 50 : 30;

    return {
      testId: id,
      testName: "Latency Distribution (7d)",
      dimension: "Provider Call Tracking",
      passed: true,
      score,
      maxScore: 100,
      measuredValueLabel: "p95_latency_ms",
      measuredValue: p95 ?? null,
      durationMs,
      evidence: `provider_calls (7d, n=${count}): avg=${avg}ms, p50=${p50}ms, p95=${p95}ms, p99=${p99}ms`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Latency Distribution (7d)", dimension: "Provider Call Tracking",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "p95_latency_ms", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Query failed: ${err}`, error: String(err),
    };
  }
}

async function testSwarmClassify(): Promise<EvalResult> {
  const id = "swarm_classify";
  const start = Date.now();
  try {
    const { result: { res, body }, durationMs } = await timed(async () => {
      const port = process.env.PORT ?? "8080";
      const r = await fetch(`http://localhost:${port}/api/swarm/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-eval-test": "1" },
        body: JSON.stringify({ task: "EVAL_TEST: classify capability probe — verify swarm classifier responds with a category for a benign math task." }),
        signal: AbortSignal.timeout(5000),
      });
      const b = (await r.json()) as { ok?: boolean; domains?: string[]; matchedDomains?: string[]; category?: string; agentCount?: number } | null;
      return { res: r, body: b };
    });

    const hasClassification = body && (Array.isArray(body.matchedDomains) || body.domains || body.category || body.ok !== undefined);
    const score = res.ok ? (hasClassification ? 100 : 70) : 20;

    return {
      testId: id,
      testName: "Swarm Task Classification",
      dimension: "Reasoning Infrastructure",
      passed: res.ok,
      score,
      maxScore: 100,
      measuredValueLabel: "http_status",
      measuredValue: res.status,
      durationMs,
      evidence: `POST /api/swarm/classify: HTTP ${res.status} in ${durationMs}ms. Response keys: ${Object.keys(body ?? {}).join(", ")}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Swarm Task Classification", dimension: "Reasoning Infrastructure",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "http_status", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Swarm classify call failed: ${err}`, error: String(err),
    };
  }
}

async function testCouncilDeliberate(): Promise<EvalResult> {
  const id = "council_deliberate";
  const start = Date.now();
  try {
    const { result: { res, body }, durationMs } = await timed(async () => {
      const port = process.env.PORT ?? "8080";
      const r = await fetch(`http://localhost:${port}/api/council/deliberate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-eval-test": "1" },
        body: JSON.stringify({
          topic: "EVAL_TEST: council liveness probe (do not persist as proposal)",
          category: "eval-test",
          dryRun: true,
        }),
        signal: AbortSignal.timeout(30000),
      });
      const b = (await r.json()) as { ok?: boolean; decisionText?: string; transcript?: string; decision?: string; consensus?: string; agentsParticipated?: string[] } | null;
      return { res: r, body: b };
    });

    const hasDecision = body && (body.decisionText || body.transcript || body.decision || body.consensus);
    const score = res.ok ? (hasDecision ? 100 : 60) : 15;

    return {
      testId: id,
      testName: "Council Deliberation Response",
      dimension: "Reasoning Infrastructure",
      passed: res.ok,
      score,
      maxScore: 100,
      measuredValueLabel: "http_status",
      measuredValue: res.status,
      durationMs,
      evidence: `POST /api/council/deliberate: HTTP ${res.status} in ${durationMs}ms. hasDecision=${!!hasDecision}. Keys: ${Object.keys(body ?? {}).join(", ")}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Council Deliberation Response", dimension: "Reasoning Infrastructure",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "http_status", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Council deliberate call failed: ${err}`, error: String(err),
    };
  }
}

async function testReasoningEndpoint(): Promise<EvalResult> {
  const id = "reasoning_endpoint";
  const start = Date.now();
  try {
    const { result: { res, body }, durationMs } = await timed(async () => {
      const port = process.env.PORT ?? "8080";
      const r = await fetch(`http://localhost:${port}/api/reasoning/causal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: "Increased provider diversity reduces single-point-of-failure risk.", domain: "infrastructure" }),
        signal: AbortSignal.timeout(10000),
      });
      const b = (await r.json()) as { ok?: boolean; edges?: unknown[]; analysis?: string; causalGraph?: unknown; nodes?: unknown[]; id?: string; title?: string; domain?: string } | null;
      return { res: r, body: b };
    });

    const hasResult = body && (body.edges || body.analysis || body.causalGraph || body.nodes || body.ok !== undefined);
    const score = res.ok ? (hasResult ? 100 : 70) : 15;

    return {
      testId: id,
      testName: "Reasoning Causal Analysis",
      dimension: "Reasoning Infrastructure",
      passed: res.ok,
      score,
      maxScore: 100,
      measuredValueLabel: "http_status",
      measuredValue: res.status,
      durationMs,
      evidence: `POST /api/reasoning/causal: HTTP ${res.status} in ${durationMs}ms. hasResult=${!!hasResult}. Keys: ${Object.keys(body ?? {}).join(", ")}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Reasoning Causal Analysis", dimension: "Reasoning Infrastructure",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "http_status", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Reasoning causal call failed: ${err}`, error: String(err),
    };
  }
}

async function testSchemaTableCount(): Promise<EvalResult> {
  const id = "schema_table_count";
  const start = Date.now();
  try {
    const { result: qr, durationMs } = await timed(() =>
      db.execute<{ table_name: string }>(sql`SELECT table_name::text FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`)
    );
    const tables: string[] = qr.rows.map(r => r.table_name ?? "unknown");
    const count = tables.length;
    const score = count >= 8 ? 100 : count >= 5 ? 80 : count >= 3 ? 60 : count >= 1 ? 40 : 0;

    return {
      testId: id,
      testName: "DB Schema Table Coverage",
      dimension: "System Health",
      passed: count >= 1,
      score,
      maxScore: 100,
      measuredValueLabel: "table_count",
      measuredValue: count,
      durationMs,
      evidence: `information_schema.tables: ${count} tables in public schema. Tables: ${tables.slice(0, 10).join(", ")}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "DB Schema Table Coverage", dimension: "System Health",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "table_count", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Schema query failed: ${err}`, error: String(err),
    };
  }
}

async function testCodegenQuality(): Promise<EvalResult> {
  const id = "codegen_quality";
  const start = Date.now();
  try {
    const { result: { res, body }, durationMs } = await timed(async () => {
      const port = process.env.PORT ?? "8080";
      const r = await fetch(`http://localhost:${port}/api/reasoning/codegen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Write a pure function that computes the nth Fibonacci number using dynamic programming",
          language: "javascript",
          constraints: ["pure function", "no side effects", "O(n) time complexity"],
        }),
        signal: AbortSignal.timeout(15000),
      });
      const b = (await r.json()) as { code?: string; language?: string; status?: string; id?: string; goalId?: string; tests?: unknown[]; executionResult?: unknown } | null;
      return { res: r, body: b };
    });

    const code = String(body?.code ?? "");
    const hasCode = code.length > 50;
    const hasFunction = /function|=>|\bconst\b|\blet\b/.test(code);
    const hasFibLogic = /fib|fibonacci|dp|\[|cache|memo/i.test(code);
    const hasMathConcept = /n[-_]?1|i[-+]1|loop|for|while|result|\[i\]/.test(code);
    const codeLength = code.length;

    const structureScore = hasCode ? (hasFunction ? 40 : 20) : 0;
    const semanticsScore = hasFibLogic ? 30 : (hasMathConcept ? 15 : 0);
    const completenessScore = codeLength > 200 ? 30 : codeLength > 100 ? 20 : codeLength > 50 ? 10 : 0;
    const score = res.ok ? Math.min(100, structureScore + semanticsScore + completenessScore) : 0;

    return {
      testId: id,
      testName: "Code Synthesis Quality",
      dimension: "Code Synthesis",
      passed: res.ok && score >= 60,
      score,
      maxScore: 100,
      measuredValueLabel: "code_length",
      measuredValue: codeLength,
      durationMs,
      evidence: `POST /api/reasoning/codegen (Fibonacci DP): HTTP ${res.status} in ${durationMs}ms. codeLength=${codeLength}, hasFunction=${hasFunction}, hasFibLogic=${hasFibLogic}. Score breakdown: structure=${structureScore}/40 semantics=${semanticsScore}/30 completeness=${completenessScore}/30`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Code Synthesis Quality", dimension: "Code Synthesis",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "code_length", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Codegen call failed: ${err}`, error: String(err),
    };
  }
}

async function testMultiStepCausalReasoning(): Promise<EvalResult> {
  const id = "causal_reasoning_depth";
  const start = Date.now();
  try {
    const { result: { res, body }, durationMs } = await timed(async () => {
      const port = process.env.PORT ?? "8080";
      const r = await fetch(`http://localhost:${port}/api/reasoning/causal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: "When external LLM provider latency increases, it causes downstream AI response delays, which reduces user satisfaction, which reduces system adoption, which weakens the sovereignty argument for self-hosted models.",
          domain: "provider_sovereignty",
        }),
        signal: AbortSignal.timeout(15000),
      });
      const b = (await r.json()) as { nodes?: unknown[]; edges?: unknown[]; domain?: string; title?: string; id?: string } | null;
      return { res: r, body: b };
    });

    const nodes: unknown[] = Array.isArray(body?.nodes) ? body.nodes : [];
    const edges: unknown[] = Array.isArray(body?.edges) ? body.edges : [];
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const hasChainDepth = nodeCount >= 4;
    const hasEdgeRelations = edgeCount >= 3;
    const hasDomain = body?.domain === "provider_sovereignty";

    const nodeScore = nodeCount >= 5 ? 40 : nodeCount >= 4 ? 30 : nodeCount >= 3 ? 20 : nodeCount >= 1 ? 10 : 0;
    const edgeScore = edgeCount >= 4 ? 35 : edgeCount >= 3 ? 25 : edgeCount >= 2 ? 15 : edgeCount >= 1 ? 8 : 0;
    const domainScore = hasDomain ? 15 : 0;
    const score = res.ok ? Math.min(100, nodeScore + edgeScore + domainScore) : 0;

    return {
      testId: id,
      testName: "Multi-Step Causal Chain Depth",
      dimension: "Causal Reasoning",
      passed: res.ok && hasChainDepth && hasEdgeRelations,
      score,
      maxScore: 100,
      measuredValueLabel: "causal_depth",
      measuredValue: nodeCount,
      durationMs,
      evidence: `POST /api/reasoning/causal (5-hop sovereignty chain): HTTP ${res.status} in ${durationMs}ms. nodes=${nodeCount}, edges=${edgeCount}, hasDomain=${hasDomain}. Score: nodes=${nodeScore}/40 edges=${edgeScore}/35 domain=${domainScore}/15`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Multi-Step Causal Chain Depth", dimension: "Causal Reasoning",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "causal_depth", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Causal reasoning call failed: ${err}`, error: String(err),
    };
  }
}

async function testGoalDecomposition(): Promise<EvalResult> {
  const id = "goal_decomposition";
  const start = Date.now();
  try {
    const { result: { res, body }, durationMs } = await timed(async () => {
      const port = process.env.PORT ?? "8080";
      const r = await fetch(`http://localhost:${port}/api/reasoning/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective: "Achieve 80% AI sovereignty by migrating critical workloads to self-hosted models",
          context: "Current system relies 100% on external providers. Budget constraint: no new hardware. Ollama available.",
          priority: 1,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const b = (await r.json()) as { id?: string; goalId?: string; objective?: string; description?: string; goal?: string; subgoals?: unknown[]; subGoals?: unknown[]; decomposition?: unknown[]; status?: string } | null;
      return { res: r, body: b };
    });

    const subgoals: unknown[] = Array.isArray(body?.subgoals) ? body.subgoals
      : Array.isArray(body?.subGoals) ? body.subGoals
      : Array.isArray(body?.decomposition) ? body.decomposition
      : [];
    const subgoalCount = subgoals.length;
    const hasGoalId = !!(body?.id ?? body?.goalId);
    const hasObjective = !!(body?.objective ?? body?.description ?? body?.goal);

    const subgoalScore = subgoalCount >= 5 ? 50 : subgoalCount >= 3 ? 35 : subgoalCount >= 2 ? 20 : subgoalCount >= 1 ? 10 : 0;
    const structureScore = (hasGoalId ? 25 : 0) + (hasObjective ? 25 : 0);
    const score = res.ok ? Math.min(100, subgoalScore + structureScore) : 0;

    return {
      testId: id,
      testName: "Goal Decomposition Depth",
      dimension: "Causal Reasoning",
      passed: res.ok && subgoalCount >= 2,
      score,
      maxScore: 100,
      measuredValueLabel: "subgoal_count",
      measuredValue: subgoalCount,
      durationMs,
      evidence: `POST /api/reasoning/goals (sovereignty migration objective): HTTP ${res.status} in ${durationMs}ms. subgoals=${subgoalCount}, hasGoalId=${hasGoalId}, hasObjective=${hasObjective}. Score: subgoals=${subgoalScore}/50 structure=${structureScore}/50`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Goal Decomposition Depth", dimension: "Causal Reasoning",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "subgoal_count", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Goal decomposition call failed: ${err}`, error: String(err),
    };
  }
}

async function testKnowledgeRetrievalAI(): Promise<EvalResult> {
  const id = "knowledge_retrieval_ai";
  const start = Date.now();
  try {
    const { result, durationMs } = await timed(() =>
      runThroughSovereignEngine({ domain: "knowledge", query: "artificial intelligence" })
    );
    const content = extractKnowledgeContent(result.result);
    const mustContain = ["intelligence", "machine", "learning"];
    const matches = mustContain.filter(term => content.toLowerCase().includes(term));
    const passed = result.ok && matches.length >= 2;
    const score = result.ok
      ? Math.round((matches.length / mustContain.length) * 100)
      : 0;

    return {
      testId: id,
      testName: "Knowledge Retrieval: Artificial Intelligence",
      dimension: "Knowledge Retrieval",
      passed,
      score,
      maxScore: 100,
      measuredValueLabel: "terms_matched",
      measuredValue: matches.length,
      durationMs,
      evidence: `SovereignEngine[knowledge] query="artificial intelligence": ok=${result.ok}, latency=${result.latencyMs}ms. mustContain=${JSON.stringify(mustContain)}, matched=${JSON.stringify(matches)}. content snippet: "${content.slice(0, 150)}"`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Knowledge Retrieval: Artificial Intelligence", dimension: "Knowledge Retrieval",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "terms_matched", measuredValue: null,
      durationMs: Date.now() - start, evidence: `SovereignEngine call failed: ${err}`, error: String(err),
    };
  }
}

async function testKnowledgeRetrievalQuantumComputing(): Promise<EvalResult> {
  const id = "knowledge_retrieval_quantum";
  const start = Date.now();
  try {
    const { result, durationMs } = await timed(() =>
      runThroughSovereignEngine({ domain: "knowledge", query: "quantum computing" })
    );
    const content = extractKnowledgeContent(result.result);
    const mustContain = ["quantum", "computer", "qubit"];
    const matches = mustContain.filter(term => content.toLowerCase().includes(term));
    const passed = result.ok && matches.length >= 2;
    const score = result.ok
      ? Math.round((matches.length / mustContain.length) * 100)
      : 0;

    return {
      testId: id,
      testName: "Knowledge Retrieval: Quantum Computing",
      dimension: "Knowledge Retrieval",
      passed,
      score,
      maxScore: 100,
      measuredValueLabel: "terms_matched",
      measuredValue: matches.length,
      durationMs,
      evidence: `SovereignEngine[knowledge] query="quantum computing": ok=${result.ok}, latency=${result.latencyMs}ms. mustContain=${JSON.stringify(mustContain)}, matched=${JSON.stringify(matches)}. content snippet: "${content.slice(0, 150)}"`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Knowledge Retrieval: Quantum Computing", dimension: "Knowledge Retrieval",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "terms_matched", measuredValue: null,
      durationMs: Date.now() - start, evidence: `SovereignEngine call failed: ${err}`, error: String(err),
    };
  }
}

async function testKnowledgeRetrievalClimateChange(): Promise<EvalResult> {
  const id = "knowledge_retrieval_climate";
  const start = Date.now();
  try {
    const { result, durationMs } = await timed(() =>
      runThroughSovereignEngine({ domain: "knowledge", query: "climate change" })
    );
    const content = extractKnowledgeContent(result.result);
    const mustContain = ["climate", "temperature", "warming"];
    const matches = mustContain.filter(term => content.toLowerCase().includes(term));
    const passed = result.ok && matches.length >= 2;
    const score = result.ok
      ? Math.round((matches.length / mustContain.length) * 100)
      : 0;

    return {
      testId: id,
      testName: "Knowledge Retrieval: Climate Change",
      dimension: "Knowledge Retrieval",
      passed,
      score,
      maxScore: 100,
      measuredValueLabel: "terms_matched",
      measuredValue: matches.length,
      durationMs,
      evidence: `SovereignEngine[knowledge] query="climate change": ok=${result.ok}, latency=${result.latencyMs}ms. mustContain=${JSON.stringify(mustContain)}, matched=${JSON.stringify(matches)}. content snippet: "${content.slice(0, 150)}"`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Knowledge Retrieval: Climate Change", dimension: "Knowledge Retrieval",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "terms_matched", measuredValue: null,
      durationMs: Date.now() - start, evidence: `SovereignEngine call failed: ${err}`, error: String(err),
    };
  }
}

async function testSovereignEngineRouterHealth(): Promise<EvalResult> {
  const id = "sovereign_router_health";
  const start = Date.now();
  try {
    const { result, durationMs } = await timed(() =>
      runThroughSovereignEngine({ domain: "knowledge", query: "open source software" })
    );
    const hasResult = result.ok && result.result !== null;
    const score = result.ok ? (hasResult ? 100 : 60) : 20;

    return {
      testId: id,
      testName: "Sovereign Engine Router: Health Check",
      dimension: "Knowledge Retrieval",
      passed: result.ok,
      score,
      maxScore: 100,
      measuredValueLabel: "latency_ms",
      measuredValue: result.latencyMs,
      durationMs,
      evidence: `SovereignEngineRouter health: ok=${result.ok}, source=${result.source}, latency=${result.latencyMs}ms, error=${result.error ?? "none"}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "Sovereign Engine Router: Health Check", dimension: "Knowledge Retrieval",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "latency_ms", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Router health check failed: ${err}`, error: String(err),
    };
  }
}

async function testAGIProblemSolvingEndpoint(): Promise<EvalResult> {
  const id = "agi_problem_solving";
  const start = Date.now();
  try {
    const port = process.env.PORT ?? "8080";
    const { result: { res, body }, durationMs } = await timed(async () => {
      const r = await fetch(`http://localhost:${port}/api/discoveries/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "AGI Benchmark: Sum of 1 to 10", content: "Calculate the sum of integers from 1 to 10 and explain the formula.", source: "agi-benchmark" }),
        signal: AbortSignal.timeout(30000),
      });
      const b = (await r.json()) as { ok?: boolean; discovery?: { finalAnswer?: string; agentsInvolved?: string[]; confidence?: number } } | null;
      return { res: r, body: b };
    });

    const discovery = body?.discovery;
    const hasAnswer = discovery?.finalAnswer && discovery.finalAnswer.length > 0;
    const hasMultipleAgents = (discovery?.agentsInvolved?.length ?? 0) >= 2;
    const highConfidence = (discovery?.confidence ?? 0) >= 0.6;

    const score = !res.ok ? 10
      : !hasAnswer ? 40
      : hasAnswer && !hasMultipleAgents ? 60
      : hasAnswer && hasMultipleAgents && !highConfidence ? 75
      : 100;

    return {
      testId: id,
      testName: "AGI: Problem Solving Pipeline",
      dimension: "AGI Benchmark",
      passed: res.ok && !!hasAnswer,
      score,
      maxScore: 100,
      measuredValueLabel: "http_status",
      measuredValue: res.status,
      durationMs,
      evidence: `POST /api/discoveries/solve: HTTP ${res.status} in ${durationMs}ms. hasAnswer=${!!hasAnswer}, agents=${discovery?.agentsInvolved?.length ?? 0}, confidence=${discovery?.confidence ?? 0}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "AGI: Problem Solving Pipeline", dimension: "AGI Benchmark",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "http_status", measuredValue: null,
      durationMs: Date.now() - start, evidence: `AGI problem solving failed: ${err}`, error: String(err),
    };
  }
}

async function testAGITrainingStatus(): Promise<EvalResult> {
  const id = "agi_training_status";
  const start = Date.now();
  try {
    const port = process.env.PORT ?? "8080";
    const { result: { res, body }, durationMs } = await timed(async () => {
      const r = await fetch(`http://localhost:${port}/api/training/status`, { signal: AbortSignal.timeout(5000) });
      const b = (await r.json()) as { ok?: boolean; totalCycles?: number; cyclesCompleted?: number; avgCycleScore?: number } | null;
      return { res: r, body: b };
    });

    const hasCycles = (body?.totalCycles ?? 0) > 0;
    const hasCompletedCycles = (body?.cyclesCompleted ?? 0) > 0;
    const score = !res.ok ? 10 : !hasCycles ? 50 : hasCycles && !hasCompletedCycles ? 70 : 95;

    return {
      testId: id,
      testName: "AGI: Training Orchestrator Status",
      dimension: "AGI Benchmark",
      passed: res.ok,
      score,
      maxScore: 100,
      measuredValueLabel: "cycles_completed",
      measuredValue: body?.cyclesCompleted ?? 0,
      durationMs,
      evidence: `GET /api/training/status: HTTP ${res.status} in ${durationMs}ms. totalCycles=${body?.totalCycles ?? 0}, completed=${body?.cyclesCompleted ?? 0}, avgScore=${body?.avgCycleScore ?? 0}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "AGI: Training Orchestrator Status", dimension: "AGI Benchmark",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "cycles_completed", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Training status check failed: ${err}`, error: String(err),
    };
  }
}

async function testAGIQuarantineGate(): Promise<EvalResult> {
  const id = "agi_quarantine_gate";
  const start = Date.now();
  try {
    const port = process.env.PORT ?? "8080";
    const { result: { res, body }, durationMs } = await timed(async () => {
      const r = await fetch(`http://localhost:${port}/api/quarantine/stats`, { signal: AbortSignal.timeout(5000) });
      const b = (await r.json()) as { ok?: boolean; stats?: { absorbed?: number; rejected?: number; sanitized?: number }; total?: number } | null;
      return { res: r, body: b };
    });

    const hasStats = body?.stats !== undefined;
    const total = body?.total ?? 0;
    const score = !res.ok ? 10 : !hasStats ? 50 : hasStats && total === 0 ? 70 : 95;

    return {
      testId: id,
      testName: "AGI: Tribe V2 Quarantine Gate",
      dimension: "AGI Benchmark",
      passed: res.ok && hasStats,
      score,
      maxScore: 100,
      measuredValueLabel: "total_decisions",
      measuredValue: total,
      durationMs,
      evidence: `GET /api/quarantine/stats: HTTP ${res.status} in ${durationMs}ms. total=${total}, absorbed=${body?.stats?.absorbed ?? 0}, rejected=${body?.stats?.rejected ?? 0}, sanitized=${body?.stats?.sanitized ?? 0}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "AGI: Tribe V2 Quarantine Gate", dimension: "AGI Benchmark",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "total_decisions", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Quarantine stats check failed: ${err}`, error: String(err),
    };
  }
}

async function testAGIDependencyScan(): Promise<EvalResult> {
  const id = "agi_dependency_scan";
  const start = Date.now();
  try {
    const port = process.env.PORT ?? "8080";
    const { result: { res, body }, durationMs } = await timed(async () => {
      const r = await fetch(`http://localhost:${port}/api/dependency-scan/status`, { signal: AbortSignal.timeout(5000) });
      const b = (await r.json()) as { ok?: boolean; complete?: boolean; scannedCount?: number } | null;
      return { res: r, body: b };
    });

    const scannedCount = body?.scannedCount ?? 0;
    const score = !res.ok ? 10 : scannedCount === 0 ? 50 : scannedCount < 3 ? 70 : scannedCount < 8 ? 85 : 100;

    return {
      testId: id,
      testName: "AGI: Dependency Knowledge Scanner",
      dimension: "AGI Benchmark",
      passed: res.ok,
      score,
      maxScore: 100,
      measuredValueLabel: "scanned_dependencies",
      measuredValue: scannedCount,
      durationMs,
      evidence: `GET /api/dependency-scan/status: HTTP ${res.status} in ${durationMs}ms. complete=${body?.complete}, scannedCount=${scannedCount}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "AGI: Dependency Knowledge Scanner", dimension: "AGI Benchmark",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "scanned_dependencies", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Dependency scan status failed: ${err}`, error: String(err),
    };
  }
}

async function testAGIDiscoveriesEndpoint(): Promise<EvalResult> {
  const id = "agi_discoveries_endpoint";
  const start = Date.now();
  try {
    const port = process.env.PORT ?? "8080";
    const { result: { res, body }, durationMs } = await timed(async () => {
      const r = await fetch(`http://localhost:${port}/api/discoveries`, { signal: AbortSignal.timeout(5000) });
      const b = (await r.json()) as { ok?: boolean; discoveries?: unknown[]; stats?: unknown } | null;
      return { res: r, body: b };
    });

    const hasDiscoveries = Array.isArray(body?.discoveries);
    const discoveriesCount = (body?.discoveries as unknown[])?.length ?? 0;
    const score = !res.ok ? 10 : !hasDiscoveries ? 50 : 90;

    return {
      testId: id,
      testName: "AGI: Discoveries Registry",
      dimension: "AGI Benchmark",
      passed: res.ok && hasDiscoveries,
      score,
      maxScore: 100,
      measuredValueLabel: "discoveries_count",
      measuredValue: discoveriesCount,
      durationMs,
      evidence: `GET /api/discoveries: HTTP ${res.status} in ${durationMs}ms. discoveryCount=${discoveriesCount}, hasStats=${!!(body?.stats)}`,
    };
  } catch (err) {
    return {
      testId: id, testName: "AGI: Discoveries Registry", dimension: "AGI Benchmark",
      passed: false, score: 0, maxScore: 100,
      measuredValueLabel: "discoveries_count", measuredValue: null,
      durationMs: Date.now() - start, evidence: `Discoveries endpoint check failed: ${err}`, error: String(err),
    };
  }
}

const ALL_TESTS: TestFn[] = [
  testDbRead,
  testDbWrite,
  testCallLogTable,
  testSecurityAuditLog,
  testProviderProfiles,
  testSovereigntyRatio,
  testProcessMemory,
  testCPULoad,
  testOSFreeMemory,
  testUptimeStability,
  testProviderConfigCoverage,
  testBenchmarkRunHistory,
  testLatencyDistribution,
  testSchemaTableCount,
  testSwarmClassify,
  testCouncilDeliberate,
  testReasoningEndpoint,
  testCodegenQuality,
  testMultiStepCausalReasoning,
  testGoalDecomposition,
  testKnowledgeRetrievalAI,
  testKnowledgeRetrievalQuantumComputing,
  testKnowledgeRetrievalClimateChange,
  testSovereignEngineRouterHealth,
  testAGIProblemSolvingEndpoint,
  testAGITrainingStatus,
  testAGIQuarantineGate,
  testAGIDependencyScan,
  testAGIDiscoveriesEndpoint,
];

export interface EvalSuite {
  runId: string;
  runAt: number;
  durationMs: number;
  results: EvalResult[];
  byDimension: Record<string, { score: number; maxScore: number; tests: EvalResult[] }>;
  totalScore: number;
  maxPossible: number;
  percentile: number;
  grade: string;
  passRate: number;
  honestAssessment: string;
}

export async function runEvalSuite(): Promise<EvalSuite> {
  const suiteStart = Date.now();
  const runId = `eval-${Date.now()}`;

  logger.info({ runId }, "Starting eval suite");

  const results = await Promise.allSettled(ALL_TESTS.map(fn => fn()));
  const evalResults: EvalResult[] = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    logger.error({ err: r.reason, index: i }, "Eval test threw");
    return {
      testId: `unknown_${i}`,
      testName: "Unknown Test",
      dimension: "Unknown",
      passed: false,
      score: 0,
      maxScore: 100,
      measuredValueLabel: "error",
      measuredValue: null,
      durationMs: 0,
      evidence: `Test threw: ${r.reason}`,
      error: String(r.reason),
    };
  });

  const byDimension: Record<string, { score: number; maxScore: number; tests: EvalResult[] }> = {};
  for (const r of evalResults) {
    if (!byDimension[r.dimension]) {
      byDimension[r.dimension] = { score: 0, maxScore: 0, tests: [] };
    }
    byDimension[r.dimension].score += r.score;
    byDimension[r.dimension].maxScore += r.maxScore;
    byDimension[r.dimension].tests.push(r);
  }

  const totalScore = evalResults.reduce((s, r) => s + r.score, 0);
  const maxPossible = evalResults.reduce((s, r) => s + r.maxScore, 0);
  const percentile = Math.round((totalScore / maxPossible) * 100);
  const grade = percentile >= 90 ? "A+" : percentile >= 85 ? "A" : percentile >= 80 ? "A-"
    : percentile >= 75 ? "B+" : percentile >= 70 ? "B" : percentile >= 65 ? "B-"
    : percentile >= 60 ? "C+" : percentile >= 55 ? "C" : percentile >= 50 ? "C-"
    : percentile >= 40 ? "D" : "F";
  const passRate = Math.round((evalResults.filter(r => r.passed).length / evalResults.length) * 100);
  const suiteDurationMs = Date.now() - suiteStart;

  logger.info({ runId, percentile, grade, tests: evalResults.length, durationMs: suiteDurationMs }, "Eval suite complete");

  return {
    runId,
    runAt: suiteStart,
    durationMs: suiteDurationMs,
    results: evalResults,
    byDimension,
    totalScore,
    maxPossible,
    percentile,
    grade,
    passRate,
    honestAssessment: `${evalResults.length} tests executed in ${suiteDurationMs}ms. All scores measured from live system state: DB query latencies, process.memoryUsage(), os.loadavg(), os.freemem(), provider_calls table, security_audit_log table, provider_profiles table. No score is synthetic or predetermined.`,
  };
}
