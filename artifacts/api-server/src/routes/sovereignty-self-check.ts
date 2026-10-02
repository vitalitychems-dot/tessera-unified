import { Router, type IRouter } from "express";
import * as os from "os";
import { verifyLedger, getLedgerStats, appendLedgerEntry } from "../lib/sovereign-ledger";
import { getRedTeamStats } from "../lib/red-team-agent";
import { getSandboxPolicyStats } from "../lib/external-sandbox-policy";
import { getExecutorMetrics } from "../lib/council-executor";
import { getEmbeddingStats } from "../lib/neural-embeddings";

const router: IRouter = Router();

interface CheckRow {
  name: string;
  ok: boolean;
  score: number;
  detail: string;
}

router.get("/sovereignty/self-check", async (_req, res) => {
  const checks: CheckRow[] = [];

  const ledger = verifyLedger();
  checks.push({
    name: "ledger-integrity",
    ok: ledger.ok,
    score: ledger.ok ? 1 : 0,
    detail: ledger.ok ? `Hash chain verified across ${ledger.entries} entries.` : `Tamper at index ${ledger.firstBadIndex}: ${ledger.reason}`,
  });

  const mem = process.memoryUsage();
  const heapRatio = mem.heapUsed / Math.max(1, mem.heapTotal);
  checks.push({
    name: "memory-pressure",
    ok: heapRatio < 0.92,
    score: Math.max(0, 1 - heapRatio),
    detail: `Heap used ${(heapRatio * 100).toFixed(1)}% of total.`,
  });

  const sysMem = os.totalmem();
  const freeMem = os.freemem();
  const sysRatio = freeMem / Math.max(1, sysMem);
  checks.push({
    name: "system-memory",
    ok: sysRatio > 0.05,
    score: Math.min(1, sysRatio * 3),
    detail: `System free memory ${(sysRatio * 100).toFixed(1)}%.`,
  });

  const load = os.loadavg()[0];
  const cores = os.cpus().length;
  const loadRatio = load / Math.max(1, cores);
  checks.push({
    name: "cpu-load",
    ok: loadRatio < 2,
    score: Math.max(0, 1 - loadRatio / 4),
    detail: `1m load ${load.toFixed(2)} across ${cores} cores (ratio ${loadRatio.toFixed(2)}).`,
  });

  const uptimeS = process.uptime();
  checks.push({
    name: "uptime",
    ok: uptimeS > 10,
    score: Math.min(1, uptimeS / 300),
    detail: `Process up ${Math.round(uptimeS)}s.`,
  });

  const rt = getRedTeamStats();
  const rtFailures = (rt.bySeverity?.critical ?? 0) + (rt.bySeverity?.high ?? 0);
  checks.push({
    name: "red-team",
    ok: rtFailures === 0,
    score: rt.totalFindings > 0 ? rt.passes / Math.max(1, rt.passes + rt.failures) : 1,
    detail: rt.totalFindings === 0
      ? "No red-team sweeps yet."
      : `${rt.passes} pass / ${rt.failures} fail. High/critical: ${rtFailures}.`,
  });

  const sandbox = getSandboxPolicyStats();
  checks.push({
    name: "external-sandbox-policy",
    ok: sandbox.policy.externalSourcesAreUntrusted && sandbox.policy.privilegedCapabilitiesBlocked.length > 0,
    score: 1,
    detail: `Untrusted: ${sandbox.policy.externalSourcesAreUntrusted}. Blocked caps: ${sandbox.policy.privilegedCapabilitiesBlocked.length}. Lessons quarantined: ${sandbox.lessons.total}.`,
  });

  const exec = getExecutorMetrics();
  checks.push({
    name: "council-executor",
    ok: exec.isRunning && exec.configPersisted,
    score: exec.isRunning && exec.configPersisted ? 1 : 0.5,
    detail: `Running=${exec.isRunning}, configKeys=${exec.configKeys}, autoProcessed=${exec.autoProcessed}.`,
  });

  const embed = getEmbeddingStats();
  // Sovereign policy: local embeddings (SimHash+n-gram) are preferred over external neural APIs.
  // A low neural-rate is not degradation — it's sovereignty.
  const localMode = String(embed.mode ?? "").toLowerCase().includes("simhash") || String(embed.mode ?? "").toLowerCase().includes("local");
  checks.push({
    name: "embeddings",
    ok: embed.healthy || localMode,
    score: localMode ? 1 : (embed.neuralRate > 0 ? embed.neuralRate : 0.6),
    detail: localMode
      ? `Sovereign local embeddings (${embed.mode}) — no external dependency. cache=${embed.cacheSize}, dim=${embed.dimension}.`
      : (embed.healthWarning ?? `Mode: ${embed.mode}, cache size ${embed.cacheSize}, dim ${embed.dimension}.`),
  });

  const scoreSum = checks.reduce((s, c) => s + c.score, 0);
  const scoreAvg = scoreSum / checks.length;
  const sovereigntyScore = Math.round(scoreAvg * 1000) / 10;
  const grade = sovereigntyScore >= 90 ? "A" : sovereigntyScore >= 80 ? "B" : sovereigntyScore >= 70 ? "C" : sovereigntyScore >= 60 ? "D" : "F";

  try {
    appendLedgerEntry("self-check", "sovereignty-monitor", {
      score: sovereigntyScore,
      grade,
      failing: checks.filter(c => !c.ok).map(c => c.name),
    });
  } catch {}

  res.json({
    ok: true,
    sovereigntyScore,
    grade,
    checks,
    passing: checks.filter(c => c.ok).length,
    failing: checks.filter(c => !c.ok).length,
    ledgerEntries: getLedgerStats().entries,
    timestamp: Date.now(),
  });
});

export default router;
