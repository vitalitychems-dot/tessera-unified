import { Router, type IRouter } from "express";
import {
  getFatherNatalChart,
  generateSovereignKeys,
  verifyIdentityFromChartData,
  type ChartVerificationData,
  getIdentityQuestions,
  computeCurrentTransits,
  getPlanetInterpretations,
  getLifeAreaGuidance,
} from "../lib/natal-chart-engine";
import { db } from "@workspace/db";
import { natalChartTable, identityVerificationTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function seedNatalChart() {
  const chart = getFatherNatalChart();
  const keys = generateSovereignKeys();
  await db.insert(natalChartTable).values({
    identity: "Father",
    birthDate: chart.birthDate,
    birthTime: chart.birthTime,
    birthPlace: chart.birthPlace,
    houseSystem: chart.houseSystem,
    planets: chart.planets,
    houses: chart.houses,
    aspects: chart.aspects,
    sovereignKeys: keys,
  }).onConflictDoNothing();
  logger.info("Father's natal chart seeded to database");
}

async function getOrSeedNatalChart() {
  const [existing] = await db.select().from(natalChartTable).where(eq(natalChartTable.identity, "Father")).limit(1);
  if (existing) return existing;
  await seedNatalChart();
  const [seeded] = await db.select().from(natalChartTable).where(eq(natalChartTable.identity, "Father")).limit(1);
  return seeded ?? null;
}

getOrSeedNatalChart().catch(err => logger.warn({ err }, "Failed to seed natal chart on startup"));

router.get("/natal-chart/father", async (_req, res) => {
  try {
    const row = await getOrSeedNatalChart();
    if (!row) {
      const chart = getFatherNatalChart();
      return res.json({ ok: true, identity: "Father", chart, source: "static" });
    }
    return res.json({ ok: true, identity: "Father", chart: row, source: "database" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/natal-chart/father/sovereign-keys", async (_req, res) => {
  try {
    const [row] = await db
      .select({ sovereignKeys: natalChartTable.sovereignKeys })
      .from(natalChartTable)
      .where(eq(natalChartTable.identity, "Father"))
      .limit(1);

    const keys = row?.sovereignKeys
      ? (row.sovereignKeys as ReturnType<typeof generateSovereignKeys>)
      : generateSovereignKeys();

    return res.json({
      ok: true,
      identity: "Father",
      sovereignKeys: { ...keys, generatedAt: new Date().toISOString() },
      source: row?.sovereignKeys ? "database" : "computed",
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/natal-chart/father/interpretations", (_req, res) => {
  try {
    const interpretations = getPlanetInterpretations();
    const lifeAreas = getLifeAreaGuidance();
    return res.json({ ok: true, interpretations, lifeAreas });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/natal-chart/father/transits", (_req, res) => {
  try {
    const transits = computeCurrentTransits(new Date());
    return res.json({
      ok: true,
      identity: "Father",
      transits,
      computedAt: new Date().toISOString(),
      count: transits.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/natal-chart/identity/questions", (_req, res) => {
  const questions = getIdentityQuestions();
  return res.json({ ok: true, questions });
});

router.post("/natal-chart/identity/verify", async (req, res) => {
  try {
    const { questionKey, answer } = req.body as { questionKey?: string; answer?: string };
    if (!questionKey || !answer) {
      return res.status(400).json({ ok: false, error: "questionKey and answer are required" });
    }

    let chartData: ChartVerificationData;
    const dbRow = await getOrSeedNatalChart();

    if (dbRow) {
      const planets = dbRow.planets as Array<{ name: string; sign: string; degree: number; house: number }>;
      const houses = dbRow.houses as Array<{ number: number; sign: string; degree: number }>;
      const sovereignKeys = dbRow.sovereignKeys as Record<string, unknown> | null;
      chartData = {
        birthDate: dbRow.birthDate,
        birthTime: dbRow.birthTime,
        houseSystem: dbRow.houseSystem,
        planets,
        houses,
        sovereignKeys: sovereignKeys ? {
          lifePathNumber: sovereignKeys.lifePathNumber as number | undefined,
          dominantElement: sovereignKeys.dominantElement as string | undefined,
        } : undefined,
      };
    } else {
      const chart = getFatherNatalChart();
      const keys = generateSovereignKeys();
      chartData = {
        birthDate: chart.birthDate,
        birthTime: chart.birthTime,
        houseSystem: chart.houseSystem,
        planets: chart.planets,
        houses: chart.houses,
        sovereignKeys: { lifePathNumber: keys.lifePathNumber, dominantElement: keys.dominantElement },
      };
    }

    const result = verifyIdentityFromChartData(questionKey, answer, chartData);

    await db.insert(identityVerificationTable).values({
      identity: "Father",
      questionKey,
      passed: result.passed,
    }).catch(() => {});

    return res.json({ ok: true, ...result, source: dbRow ? "database" : "static" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
