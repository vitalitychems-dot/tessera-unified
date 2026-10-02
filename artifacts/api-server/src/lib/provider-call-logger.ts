import { db } from "@workspace/db";
import { providerCallsTable } from "@workspace/db";
import { desc, eq, and, gte, count, avg, sql } from "drizzle-orm";
import { logger } from "./logger";
import type { ProviderCallRow } from "@workspace/db";

export interface LogProviderCallOptions {
  providerId: string;
  providerName: string;
  model: string;
  requestMessages: { role: string; content: string }[];
  responseText?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  isExternal?: boolean;
  isDryRun?: boolean;
}

export async function logProviderCall(opts: LogProviderCallOptions): Promise<number | null> {
  try {
    const totalTokens =
      (opts.inputTokens ?? 0) + (opts.outputTokens ?? 0) || undefined;
    const status = opts.error ? "error" : "success";

    const rows = await db.insert(providerCallsTable).values({
      providerId: opts.providerId,
      providerName: opts.providerName,
      model: opts.model,
      requestMessages: opts.requestMessages,
      responseText: opts.responseText ?? null,
      latencyMs: opts.latencyMs ?? null,
      inputTokens: opts.inputTokens ?? null,
      outputTokens: opts.outputTokens ?? null,
      totalTokens: totalTokens ?? null,
      error: opts.error ?? null,
      status,
      isExternal: opts.isExternal ?? true,
      isDryRun: opts.isDryRun ?? false,
    }).returning({ id: providerCallsTable.id });

    return rows[0]?.id ?? null;
  } catch (err) {
    logger.error({ err }, "Failed to log provider call");
    return null;
  }
}

export async function getRecentProviderCalls(limit = 100): Promise<ProviderCallRow[]> {
  try {
    return await db.select().from(providerCallsTable)
      .orderBy(desc(providerCallsTable.calledAt))
      .limit(limit);
  } catch {
    return [];
  }
}

export async function getProviderCallStats(providerId: string, sinceHours = 24) {
  const since = new Date(Date.now() - sinceHours * 3600 * 1000);
  try {
    const rows = await db.select().from(providerCallsTable)
      .where(and(
        eq(providerCallsTable.providerId, providerId),
        gte(providerCallsTable.calledAt, since),
      ));

    if (rows.length === 0) return null;

    const successful = rows.filter(r => r.status === "success");
    const latencies = successful
      .map(r => r.latencyMs)
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);

    const avgLatency = latencies.length > 0
      ? latencies.reduce((s, v) => s + v, 0) / latencies.length
      : null;
    const p95Latency = latencies.length > 0
      ? latencies[Math.floor(latencies.length * 0.95)] ?? latencies[latencies.length - 1]!
      : null;

    const avgInput = successful.reduce((s, r) => s + (r.inputTokens ?? 0), 0) / (successful.length || 1);
    const avgOutput = successful.reduce((s, r) => s + (r.outputTokens ?? 0), 0) / (successful.length || 1);

    return {
      totalCalls: rows.length,
      successCalls: successful.length,
      errorCalls: rows.length - successful.length,
      errorRate: rows.length > 0 ? (rows.length - successful.length) / rows.length : 0,
      avgLatencyMs: avgLatency,
      p95LatencyMs: p95Latency,
      avgInputTokens: avgInput,
      avgOutputTokens: avgOutput,
    };
  } catch {
    return null;
  }
}

export async function getCallCountsByProvider(sinceHours = 24) {
  const since = new Date(Date.now() - sinceHours * 3600 * 1000);
  try {
    const rows = await db.select().from(providerCallsTable)
      .where(gte(providerCallsTable.calledAt, since));

    const byProvider = new Map<string, { external: number; internal: number; total: number }>();

    for (const row of rows) {
      const existing = byProvider.get(row.providerId) ?? { external: 0, internal: 0, total: 0 };
      existing.total++;
      if (row.isExternal) existing.external++;
      else existing.internal++;
      byProvider.set(row.providerId, existing);
    }

    return Object.fromEntries(byProvider.entries());
  } catch {
    return {};
  }
}

export async function getTotalCallStats(sinceHours = 24) {
  const since = new Date(Date.now() - sinceHours * 3600 * 1000);
  try {
    const rows = await db.select().from(providerCallsTable)
      .where(gte(providerCallsTable.calledAt, since));

    const external = rows.filter(r => r.isExternal && !r.isDryRun);
    const internal = rows.filter(r => !r.isExternal && !r.isDryRun);

    const externalLatencies = external.map(r => r.latencyMs).filter((v): v is number => v !== null);
    const internalLatencies = internal.map(r => r.latencyMs).filter((v): v is number => v !== null);

    const avgExt = externalLatencies.length > 0
      ? externalLatencies.reduce((s, v) => s + v, 0) / externalLatencies.length
      : null;
    const avgInt = internalLatencies.length > 0
      ? internalLatencies.reduce((s, v) => s + v, 0) / internalLatencies.length
      : null;

    return {
      total: rows.filter(r => !r.isDryRun).length,
      external: external.length,
      internal: internal.length,
      avgExternalLatencyMs: avgExt,
      avgInternalLatencyMs: avgInt,
    };
  } catch {
    return { total: 0, external: 0, internal: 0, avgExternalLatencyMs: null, avgInternalLatencyMs: null };
  }
}
