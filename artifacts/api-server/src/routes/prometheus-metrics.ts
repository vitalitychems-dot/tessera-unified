import { Router, type IRouter } from "express";
import * as os from "os";
import { getLedgerStats } from "../lib/sovereign-ledger";
import { getRedTeamStats } from "../lib/red-team-agent";
import { getEmbeddingStats } from "../lib/neural-embeddings";
import { getLLMStats } from "../lib/llm-client";
import { getExecutorMetrics } from "../lib/council-executor";
import { getDreamBridgeStats } from "../lib/dream-prompt-bridge";

const router: IRouter = Router();
const startTime = Date.now();

function line(name: string, help: string, type: string, value: number, labels?: Record<string, string>): string {
  const labelStr = labels && Object.keys(labels).length > 0
    ? "{" + Object.entries(labels).map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`).join(",") + "}"
    : "";
  return `# HELP ${name} ${help}\n# TYPE ${name} ${type}\n${name}${labelStr} ${value}\n`;
}

function metric(name: string, value: number, labels?: Record<string, string>): string {
  const labelStr = labels && Object.keys(labels).length > 0
    ? "{" + Object.entries(labels).map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`).join(",") + "}"
    : "";
  return `${name}${labelStr} ${value}\n`;
}

router.get("/metrics", (_req, res) => {
  const mem = process.memoryUsage();
  const ledger = getLedgerStats();
  const redTeam = getRedTeamStats();
  const embed = getEmbeddingStats();
  const llm = getLLMStats();
  const exec = getExecutorMetrics();
  const dream = getDreamBridgeStats();

  let body = "";
  body += line("tessera_uptime_seconds", "Server uptime in seconds", "counter", Math.round(process.uptime()));
  body += line("tessera_process_start_time_seconds", "Server start time", "gauge", Math.round(startTime / 1000));
  body += line("tessera_memory_heap_used_bytes", "Heap used bytes", "gauge", mem.heapUsed);
  body += metric("tessera_memory_heap_total_bytes", mem.heapTotal);
  body += metric("tessera_memory_rss_bytes", mem.rss);
  body += metric("tessera_system_load_1m", os.loadavg()[0]);

  body += line("tessera_ledger_entries_total", "Total entries in sovereign ledger", "counter", ledger.entries);
  for (const [kind, n] of Object.entries(ledger.byKind)) {
    body += metric("tessera_ledger_entries_by_kind", n as number, { kind });
  }

  body += line("tessera_red_team_runs_total", "Total red team sweeps", "counter", redTeam.runCount);
  body += metric("tessera_red_team_findings_total", redTeam.totalFindings);
  body += metric("tessera_red_team_passes_total", redTeam.passes);
  body += metric("tessera_red_team_failures_total", redTeam.failures);
  for (const [severity, n] of Object.entries(redTeam.bySeverity)) {
    body += metric("tessera_red_team_findings_by_severity", n as number, { severity });
  }

  body += line("tessera_embedding_neural_calls_total", "Neural embedding calls", "counter", embed.neuralCalls);
  body += metric("tessera_embedding_fallback_calls_total", embed.fallbackCalls);
  body += metric("tessera_embedding_cache_hits_total", embed.cacheHits);
  body += metric("tessera_embedding_errors_total", embed.errors);

  body += line("tessera_llm_calls_total", "Total LLM calls", "counter", llm.totalCalls);
  body += metric("tessera_llm_cache_hits_total", llm.cacheHits);
  body += metric("tessera_llm_errors_total", llm.errors);
  body += metric("tessera_llm_distilled_total", llm.distilled);

  body += line("tessera_council_auto_processed_total", "Council decisions auto-processed", "counter", exec.autoProcessed);
  body += metric("tessera_council_config_keys", exec.configKeys);

  body += line("tessera_dream_has_latest", "Latest dream imprint available (1/0)", "gauge", dream.hasLatest ? 1 : 0);
  if (dream.latest) {
    body += metric("tessera_dream_salience", dream.latest.salience);
  }

  res.set("Content-Type", "text/plain; version=0.0.4");
  res.send(body);
});

router.get("/metrics.json", (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    ledger: getLedgerStats(),
    redTeam: getRedTeamStats(),
    embeddings: getEmbeddingStats(),
    llm: getLLMStats(),
    council: getExecutorMetrics(),
    dream: getDreamBridgeStats(),
  });
});

export default router;
