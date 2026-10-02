import { Router } from "express";
import { logger } from "../lib/logger";
import { getProviderConfigs, getAllProviderProfiles, initializeProviderProfiles } from "../lib/provider-registry";
import { logProviderCall, getRecentProviderCalls, getTotalCallStats, getCallCountsByProvider } from "../lib/provider-call-logger";
import { analyzeAllProviders, analyzeProvider, compareProvidersForPrompt } from "../lib/reverse-engineering-engine";
import {
  computeSovereigntyStatus, runDryRun, getLatestSovereigntyMetrics,
  enableHardDisconnect, disableHardDisconnect, getHardDisconnectStatus, runFullDryRunDetach,
} from "../lib/sovereignty-monitor";
import { db } from "@workspace/db";
import { providerDiffsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/provider-sovereignty/providers", async (_req, res) => {
  try {
    const configs = getProviderConfigs();
    const profiles = await getAllProviderProfiles();
    const profileMap = new Map(profiles.map(p => [p.providerId, p]));

    const providers = configs.map(c => ({
      ...c,
      profile: profileMap.get(c.id) ?? null,
    }));

    return res.json({ ok: true, providers });
  } catch (err) {
    logger.error({ err }, "GET /provider-sovereignty/providers failed");
    return res.status(500).json({ ok: false, error: "Failed to fetch providers" });
  }
});

router.post("/provider-sovereignty/log-call", async (req, res) => {
  try {
    const { providerId, providerName, model, requestMessages, responseText,
            latencyMs, inputTokens, outputTokens, error, isExternal, isDryRun } = req.body;

    if (!providerId || !model) {
      return res.status(400).json({ ok: false, error: "providerId and model are required" });
    }

    const id = await logProviderCall({
      providerId,
      providerName: providerName ?? providerId,
      model,
      requestMessages: requestMessages ?? [],
      responseText,
      latencyMs,
      inputTokens,
      outputTokens,
      error,
      isExternal: isExternal ?? true,
      isDryRun: isDryRun ?? false,
    });

    return res.json({ ok: true, id });
  } catch (err) {
    logger.error({ err }, "POST /provider-sovereignty/log-call failed");
    return res.status(500).json({ ok: false, error: "Failed to log provider call" });
  }
});

router.get("/provider-sovereignty/calls", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string ?? "50", 10);
    const calls = await getRecentProviderCalls(Math.min(limit, 500));
    return res.json({ ok: true, calls });
  } catch (err) {
    logger.error({ err }, "GET /provider-sovereignty/calls failed");
    return res.status(500).json({ ok: false, error: "Failed to fetch calls" });
  }
});

router.get("/provider-sovereignty/stats", async (_req, res) => {
  try {
    const stats = await getTotalCallStats(24);
    const byProvider = await getCallCountsByProvider(24);
    return res.json({ ok: true, stats, byProvider });
  } catch (err) {
    logger.error({ err }, "GET /provider-sovereignty/stats failed");
    return res.status(500).json({ ok: false, error: "Failed to fetch stats" });
  }
});

router.post("/provider-sovereignty/analyze", async (_req, res) => {
  try {
    const profiles = await analyzeAllProviders();
    return res.json({ ok: true, profiles, analyzedAt: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "POST /provider-sovereignty/analyze failed");
    return res.status(500).json({ ok: false, error: "Failed to analyze providers" });
  }
});

router.get("/provider-sovereignty/analyze/:providerId", async (req, res) => {
  try {
    const { providerId } = req.params;
    const profile = await analyzeProvider(providerId);
    if (!profile) {
      return res.status(404).json({ ok: false, error: "Provider not found" });
    }
    return res.json({ ok: true, profile });
  } catch (err) {
    logger.error({ err }, "GET /provider-sovereignty/analyze/:providerId failed");
    return res.status(500).json({ ok: false, error: "Failed to analyze provider" });
  }
});

router.post("/provider-sovereignty/diff", async (req, res) => {
  try {
    const { prompt, providerIds, responses } = req.body;

    if (!prompt || !Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ ok: false, error: "prompt and responses[] are required" });
    }

    const result = await compareProvidersForPrompt(prompt, providerIds ?? [], responses);

    await db.insert(providerDiffsTable).values({
      prompt,
      providers: providerIds ?? [],
      responses,
      similarityMatrix: result.similarities,
      winnerProviderId: result.winner,
      scoringCriteria: "length(30%) + speed(30%) + cross-similarity(40%)",
    });

    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "POST /provider-sovereignty/diff failed");
    return res.status(500).json({ ok: false, error: "Failed to diff providers" });
  }
});

router.get("/provider-sovereignty/diffs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string ?? "20", 10);
    const diffs = await db.select().from(providerDiffsTable)
      .orderBy(desc(providerDiffsTable.diffedAt))
      .limit(Math.min(limit, 100));
    return res.json({ ok: true, diffs });
  } catch (err) {
    logger.error({ err }, "GET /provider-sovereignty/diffs failed");
    return res.status(500).json({ ok: false, error: "Failed to fetch diffs" });
  }
});

router.get("/provider-sovereignty/sovereignty", async (_req, res) => {
  try {
    const status = await computeSovereigntyStatus();
    return res.json({ ok: true, ...status });
  } catch (err) {
    logger.error({ err }, "GET /provider-sovereignty/sovereignty failed");
    return res.status(500).json({ ok: false, error: "Failed to compute sovereignty status" });
  }
});

router.get("/provider-sovereignty/sovereignty/history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string ?? "10", 10);
    const history = await getLatestSovereigntyMetrics(Math.min(limit, 50));
    return res.json({ ok: true, history });
  } catch (err) {
    logger.error({ err }, "GET /provider-sovereignty/sovereignty/history failed");
    return res.status(500).json({ ok: false, error: "Failed to fetch sovereignty history" });
  }
});

router.post("/provider-sovereignty/dry-run", async (_req, res) => {
  try {
    const result = await runDryRun();
    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "POST /provider-sovereignty/dry-run failed");
    return res.status(500).json({ ok: false, error: "Failed to run dry-run simulation" });
  }
});

router.post("/provider-sovereignty/initialize", async (_req, res) => {
  try {
    await initializeProviderProfiles();
    const profiles = await analyzeAllProviders();
    const status = await computeSovereigntyStatus();
    return res.json({ ok: true, initialized: true, profileCount: profiles.length, sovereignty: status });
  } catch (err) {
    logger.error({ err }, "POST /provider-sovereignty/initialize failed");
    return res.status(500).json({ ok: false, error: "Failed to initialize" });
  }
});

router.get("/provider-sovereignty/hard-disconnect", (_req, res) => {
  return res.json({ ok: true, ...getHardDisconnectStatus() });
});

router.post("/provider-sovereignty/hard-disconnect/enable", (_req, res) => {
  try {
    const result = enableHardDisconnect();
    return res.json({ ok: true, ...result, status: getHardDisconnectStatus() });
  } catch (err) {
    logger.error({ err }, "POST /provider-sovereignty/hard-disconnect/enable failed");
    return res.status(500).json({ ok: false, error: "Failed to enable hard-disconnect" });
  }
});

router.post("/provider-sovereignty/hard-disconnect/disable", (_req, res) => {
  try {
    const result = disableHardDisconnect();
    return res.json({ ok: true, ...result, status: getHardDisconnectStatus() });
  } catch (err) {
    logger.error({ err }, "POST /provider-sovereignty/hard-disconnect/disable failed");
    return res.status(500).json({ ok: false, error: "Failed to disable hard-disconnect" });
  }
});

router.post("/provider-sovereignty/full-dry-run", async (_req, res) => {
  try {
    const result = await runFullDryRunDetach();
    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "POST /provider-sovereignty/full-dry-run failed");
    return res.status(500).json({ ok: false, error: "Failed to run full dry-run detach" });
  }
});

export default router;
