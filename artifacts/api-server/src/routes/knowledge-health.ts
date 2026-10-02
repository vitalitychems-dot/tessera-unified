import { Router } from "express";
import { getLearnedProfileFreshness, restoreLearnedProfilesFromDb } from "../lib/reverse-engineering-engine";
import { getAGITrainingMetrics } from "../lib/agi-training-engine";
import { getSovereignMemoryVaultMetrics } from "../lib/sovereign-memory-vault";
import { getIngestionAuditLog } from "../lib/ingestion/pipeline";
import { getMemoryStats } from "../lib/vector-memory";
import { getProviderConfigs } from "../lib/provider-registry";

const router = Router();

router.get("/sovereign/knowledge-health", async (_req, res) => {
  try {
    let profileFreshness = getLearnedProfileFreshness();
    if (profileFreshness.length === 0) {
      await restoreLearnedProfilesFromDb();
      profileFreshness = getLearnedProfileFreshness();
    }
    const staleProfiles = profileFreshness.filter(p => Date.now() - p.updatedAt > 6 * 3600000);
    const configuredProviders = getProviderConfigs().length;
    const analyzedProviders = profileFreshness.length;
    const unanalyzedProviders = Math.max(0, configuredProviders - analyzedProviders);

    const trainingMetrics = getAGITrainingMetrics();
    const velocityReport = trainingMetrics.velocityReport as Record<string, { velocity: number; freshness: number; crossBoost: number }> | undefined;
    const avgVelocity = velocityReport
      ? Object.values(velocityReport).reduce((s, v) => s + v.velocity, 0) / Math.max(1, Object.keys(velocityReport).length)
      : 0;
    const staleCategoriesCount = velocityReport
      ? Object.values(velocityReport).filter(v => v.freshness < 0.3).length
      : 0;

    const vaultMetrics = getSovereignMemoryVaultMetrics();
    const coreIntact = vaultMetrics.vault.coreIdentityMemories > 0;
    const proceduralCount = vaultMetrics.vault.proceduralMemories;
    const vaultIntegrity = vaultMetrics.identity.memoryIntegrity;
    const consolidationHealth = vaultMetrics.consolidation.totalCycles > 0;

    const auditLog = getIngestionAuditLog();
    const rejectionRate = auditLog.total > 0 ? auditLog.rejected / auditLog.total : 0;

    let vectorStats = { total: 0, byCategory: {} as Record<string, number>, vocabSize: 0, recentlyAdded: 0 };
    try { vectorStats = await getMemoryStats(); } catch {}

    let knowledgeGaps: Array<{ domain: string; severity: string; description: string }> = [];
    const bottomCats = trainingMetrics.bottomCategories as Array<{ category: string; score: number; masteryLevel: string }> || [];
    for (const cat of bottomCats) {
      if (cat.score < 60) {
        knowledgeGaps.push({
          domain: cat.category,
          severity: cat.score < 30 ? "critical" : cat.score < 50 ? "high" : "medium",
          description: `Training score ${cat.score.toFixed(1)} (${cat.masteryLevel}) — needs more data and training cycles`,
        });
      }
    }

    const criticalGaps = knowledgeGaps.filter(g => g.severity === "critical").length;
    const highGaps = knowledgeGaps.filter(g => g.severity === "high").length;

    let overallScore = 100;
    if (staleProfiles.length > 3) overallScore -= 10;
    if (!coreIntact) overallScore -= 20;
    if (vaultIntegrity < 0.5) overallScore -= 15;
    if (!consolidationHealth) overallScore -= 10;
    if (rejectionRate > 0.5) overallScore -= 10;
    if (criticalGaps > 3) overallScore -= 15;
    if (highGaps > 5) overallScore -= 10;
    if (staleCategoriesCount > 10) overallScore -= 10;
    if (trainingMetrics.avgScore < 50) overallScore -= 10;
    overallScore = Math.max(0, overallScore);

    const status = overallScore >= 80 ? "healthy" : overallScore >= 50 ? "degraded" : "critical";

    res.json({
      status,
      overallScore,
      timestamp: Date.now(),
      reverseEngineering: {
        configuredProviders,
        analyzedProviders,
        unanalyzedProviders,
        staleProfiles: staleProfiles.length,
        avgConfidence: analyzedProviders > 0
          ? Math.round(profileFreshness.reduce((s, p) => s + p.confidence, 0) / analyzedProviders * 100) / 100
          : 0,
        avgConsistency: analyzedProviders > 0
          ? Math.round(profileFreshness.reduce((s, p) => s + p.responseConsistency, 0) / analyzedProviders * 100) / 100
          : 0,
        improvingProviders: profileFreshness.filter(p => p.recentTrend === "improving").length,
        degradingProviders: profileFreshness.filter(p => p.recentTrend === "degrading").length,
        profileFreshness: profileFreshness.map(p => ({
          providerId: p.providerId,
          age: p.age,
          dataPoints: p.dataPoints,
          isFresh: Date.now() - p.updatedAt < 6 * 3600000,
          confidence: p.confidence,
          responseConsistency: p.responseConsistency,
          recentTrend: p.recentTrend,
          successStreak: p.successStreak,
        })),
        note: analyzedProviders === 0 ? "No providers analyzed yet — profiles populate after provider calls" : undefined,
      },
      trainingVelocity: {
        avgScore: trainingMetrics.avgScore,
        totalCategories: trainingMetrics.totalCategories,
        totalCycles: trainingMetrics.totalCycles,
        avgVelocity: Math.round(avgVelocity * 1000) / 1000,
        staleCategories: staleCategoriesCount,
        topCategories: trainingMetrics.topCategories,
        bottomCategories: trainingMetrics.bottomCategories,
      },
      memoryVault: {
        totalMemories: vaultMetrics.vault.totalMemories,
        coreIdentityIntact: coreIntact,
        coreIdentityCount: vaultMetrics.vault.coreIdentityMemories,
        proceduralMemories: proceduralCount,
        integrityScore: vaultIntegrity,
        continuityScore: vaultMetrics.identity.continuityScore,
        consolidationCycles: vaultMetrics.consolidation.totalCycles,
        totalSessions: vaultMetrics.identity.totalSessions,
        vectorEmbeddings: vectorStats.total,
        vocabSize: vectorStats.vocabSize,
      },
      ingestionSecurity: {
        totalAuditEntries: auditLog.total,
        rejectedItems: auditLog.rejected,
        sanitizedItems: auditLog.sanitized,
        rateLimitedItems: auditLog.rateLimited,
        ingestedItems: auditLog.ingested,
        rejectionRate: Math.round(rejectionRate * 10000) / 100,
        recentEvents: auditLog.recent.slice(0, 10),
      },
      knowledgeCoverage: {
        totalGaps: knowledgeGaps.length,
        criticalGaps,
        highGaps,
        mediumGaps: knowledgeGaps.filter(g => g.severity === "medium").length,
        gaps: knowledgeGaps,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to compute knowledge health report", detail: (err as Error).message });
  }
});

export default router;
