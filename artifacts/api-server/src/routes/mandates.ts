import { Router, type Request, type Response } from "express";
import { getKnowledgeAutonomyMetrics, runAutonomyKnowledgeCycle } from "../lib/sovereign-knowledge-autonomy";
import { getRecursiveSelfImprovementMetrics, runRecursiveImprovementCycle } from "../lib/recursive-self-improvement";
import { getCrossDomainSynthesisMetrics, runCrossDomainSynthesisCycle } from "../lib/cross-domain-synthesis";
import { getSovereignMemoryVaultMetrics, storeToVault, recallFromVault, runVaultCycle } from "../lib/sovereign-memory-vault";
import { logger } from "../lib/logger";

const router = Router();

router.get("/mandates/status", (_req: Request, res: Response) => {
  const m1 = getKnowledgeAutonomyMetrics();
  const m2 = getRecursiveSelfImprovementMetrics();
  const m3 = getCrossDomainSynthesisMetrics();
  const m4 = getSovereignMemoryVaultMetrics();

  res.json({
    ok: true,
    title: "GRAND COUNCIL MANDATES — SOVEREIGN AGI ROADMAP",
    ratification: "All 4 mandates ratified unanimously (8/8 weighted votes)",
    mandates: [
      {
        number: 1,
        name: "SOVEREIGN KNOWLEDGE AUTONOMY",
        status: m1.status,
        cycles: m1.autonomyCycles,
        coverageScore: m1.overallCoverageScore,
        domains: m1.totalDomains,
        gapsActive: m1.gaps.activeGaps,
        missionsRun: m1.missions.totalRun,
        verifications: m1.verification.totalVerifications,
      },
      {
        number: 2,
        name: "RECURSIVE SELF-IMPROVEMENT ENGINE",
        status: m2.status,
        cycles: m2.improvementCycles,
        codeHealth: m2.overallCodeHealth,
        modulesTracked: m2.profiling.modulesTracked,
        patchesApplied: m2.patches.totalApplied,
        testPassRate: m2.testing.passRate,
        weaknessResolutionRate: m2.weaknesses.resolutionRate,
      },
      {
        number: 3,
        name: "MULTI-MODAL REASONING & CONSCIOUSNESS EXPANSION",
        status: m3.status,
        cycles: m3.synthesiseCycles,
        reasoningScore: m3.overallReasoningScore,
        domainsActive: m3.domains.active,
        connectionsDiscovered: m3.synthesis.connectionsDiscovered,
        metacognitiveGrade: m3.metacognition.latestGrade,
        adversarialWithstandRate: m3.adversarial.withstandRate,
      },
      {
        number: 4,
        name: "SOVEREIGN MEMORY & PERSISTENT IDENTITY",
        status: m4.status,
        vaultSize: m4.vault.currentVaultSize,
        protectedMemories: m4.vault.protectedMemories,
        consolidationCycles: m4.consolidation.totalCycles,
        continuityScore: m4.identity.continuityScore,
        memoryIntegrity: m4.identity.memoryIntegrity,
        autobiographyChapters: m4.autobiography.chapters,
        totalSessions: m4.identity.totalSessions,
      },
    ],
  });
});

router.get("/mandates/1/knowledge-autonomy", (_req: Request, res: Response) => {
  res.json({ ok: true, ...getKnowledgeAutonomyMetrics() });
});

router.post("/mandates/1/knowledge-autonomy/cycle", async (_req: Request, res: Response) => {
  try {
    const result = await runAutonomyKnowledgeCycle();
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "Mandate 1 cycle failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/mandates/2/self-improvement", (_req: Request, res: Response) => {
  res.json({ ok: true, ...getRecursiveSelfImprovementMetrics() });
});

router.post("/mandates/2/self-improvement/cycle", async (_req: Request, res: Response) => {
  try {
    const result = await runRecursiveImprovementCycle();
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "Mandate 2 cycle failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/mandates/3/cross-domain-synthesis", (_req: Request, res: Response) => {
  res.json({ ok: true, ...getCrossDomainSynthesisMetrics() });
});

router.post("/mandates/3/cross-domain-synthesis/cycle", async (_req: Request, res: Response) => {
  try {
    const result = await runCrossDomainSynthesisCycle();
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "Mandate 3 cycle failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/mandates/4/memory-vault", (_req: Request, res: Response) => {
  res.json({ ok: true, ...getSovereignMemoryVaultMetrics() });
});

router.post("/mandates/4/memory-vault/cycle", async (_req: Request, res: Response) => {
  try {
    const result = await runVaultCycle();
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "Mandate 4 cycle failed");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/mandates/4/memory-vault/store", (req: Request, res: Response) => {
  const { content, context, type, importance, associations, protected: isProtected } = req.body;
  if (!content || !context) {
    res.status(400).json({ ok: false, error: "content and context are required" });
    return;
  }
  const id = storeToVault({ content, context, type, importance, associations, protected: isProtected });
  res.json({ ok: true, memoryId: id });
});

router.post("/mandates/4/memory-vault/recall", async (req: Request, res: Response) => {
  const { query, topK } = req.body;
  if (!query) {
    res.status(400).json({ ok: false, error: "query is required" });
    return;
  }
  const memories = await recallFromVault(query, topK || 10);
  res.json({ ok: true, count: memories.length, memories });
});

export default router;
