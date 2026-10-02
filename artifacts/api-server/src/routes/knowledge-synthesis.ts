import { Router } from "express";
import { logger } from "../lib/logger";
import { runKnowledgeSynthesis, isSynthesisRunning, getLastSynthesisResult } from "../lib/knowledge-synthesis";
import { getCurrentCosmicState, storeCosmicAlignment } from "../lib/cosmic-alignment";
import { trainOnMLDomains, testMLDomainKnowledge, ML_DOMAINS } from "../lib/ml-training-domains";
import {
  fetchPhilosophyWiki,
  fetchMythologyDatabase,
  fetchCryptologyKnowledge,
  fetchPsychologySociology,
  fetchReligionEsotericKnowledge,
  fetchNumerologyKnowledge,
  fetchAstronomyAstrology,
  fetchAncientEsotericKnowledge,
  fetchArchitectureSacredBuildings,
  fetchPathologyIdeology,
  fetchDeepHiddenWiki,
  fetchArxivEsotericResearch,
  fetchVaticanKnowledge,
  fetchPlutoKnowledge,
} from "../lib/ingestion/esoteric-scrapers";
import { runSourceIngestion } from "../lib/ingestion/pipeline";

const router = Router();

router.post("/knowledge/synthesize", async (req, res): Promise<void> => {
  try {
    if (isSynthesisRunning()) {
      res.json({ ok: false, message: "Knowledge synthesis already running", lastResult: getLastSynthesisResult() });
      return;
    }

    const mlDomainCount = Math.min(parseInt(req.body?.mlDomainCount ?? "100", 10), 100);
    const includeEsoteric = req.body?.includeEsoteric !== false;
    const includeML = req.body?.includeML !== false;
    const cycles = Math.min(parseInt(req.body?.cycles ?? "3", 10), 10);

    res.json({
      ok: true,
      message: `Starting knowledge synthesis: ${includeEsoteric ? "esoteric" : ""} ${includeML ? `+ ${mlDomainCount} ML domains` : ""}, ${cycles} reinforcement cycles`,
    });

    runKnowledgeSynthesis({ mlDomainCount, includeEsoteric, includeML, cycles }).catch(err => {
      logger.error({ err }, "Knowledge synthesis error");
    });
  } catch (err) {
    logger.error({ err }, "POST /knowledge/synthesize failed");
    res.status(500).json({ error: "Failed to start synthesis", details: String(err) });
  }
});

router.get("/knowledge/synthesis-status", async (_req, res) => {
  try {
    return res.json({
      ok: true,
      isRunning: isSynthesisRunning(),
      lastResult: getLastSynthesisResult(),
    });
  } catch (err) {
    logger.error({ err }, "GET /knowledge/synthesis-status failed");
    return res.status(500).json({ error: "Failed to get synthesis status", details: String(err) });
  }
});

router.get("/knowledge/cosmic-alignment", async (_req, res) => {
  try {
    const state = getCurrentCosmicState();
    return res.json({ ok: true, cosmic: state });
  } catch (err) {
    logger.error({ err }, "GET /knowledge/cosmic-alignment failed");
    return res.status(500).json({ error: "Failed to get cosmic alignment", details: String(err) });
  }
});

router.post("/knowledge/cosmic-alignment/store", async (_req, res) => {
  try {
    await storeCosmicAlignment();
    const state = getCurrentCosmicState();
    return res.json({ ok: true, stored: true, cosmic: state });
  } catch (err) {
    logger.error({ err }, "POST /knowledge/cosmic-alignment/store failed");
    return res.status(500).json({ error: "Failed to store cosmic alignment", details: String(err) });
  }
});

router.post("/knowledge/ml-domains/train", async (req, res) => {
  try {
    const domainIds = req.body?.domainIds as number[] | undefined;
    const result = await trainOnMLDomains(domainIds);
    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "POST /knowledge/ml-domains/train failed");
    return res.status(500).json({ error: "Failed to train ML domains", details: String(err) });
  }
});

router.post("/knowledge/ml-domains/test", async (req, res) => {
  try {
    const sampleSize = Math.min(parseInt(req.body?.sampleSize ?? "20", 10), 100);
    const result = await testMLDomainKnowledge(sampleSize);
    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "POST /knowledge/ml-domains/test failed");
    return res.status(500).json({ error: "Failed to test ML domains", details: String(err) });
  }
});

router.get("/knowledge/ml-domains", async (_req, res) => {
  try {
    return res.json({
      ok: true,
      totalDomains: ML_DOMAINS.length,
      categories: [...new Set(ML_DOMAINS.map(d => d.category))],
      domains: ML_DOMAINS.map(d => ({
        id: d.id,
        name: d.name,
        category: d.category,
        description: d.description,
        conceptCount: d.coreConcepts.length,
        questionCount: d.trainingQuestions.length,
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /knowledge/ml-domains failed");
    return res.status(500).json({ error: "Failed to get ML domains", details: String(err) });
  }
});

router.post("/knowledge/scrape-esoteric", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.body?.limit ?? "10", 10), 20);
    const domains = req.body?.domains as string[] | undefined;

    const scrapers: Record<string, () => Promise<any[]>> = {
      philosophy: () => fetchPhilosophyWiki(limit),
      mythology: () => fetchMythologyDatabase(limit),
      cryptology: () => fetchCryptologyKnowledge(limit),
      psychology: () => fetchPsychologySociology(limit),
      religion: () => fetchReligionEsotericKnowledge(limit),
      numerology: () => fetchNumerologyKnowledge(),
      astronomy: () => fetchAstronomyAstrology(limit),
      ancient: () => fetchAncientEsotericKnowledge(limit),
      architecture: () => fetchArchitectureSacredBuildings(limit),
      pathology: () => fetchPathologyIdeology(limit),
      deepweb: () => fetchDeepHiddenWiki(limit),
      arxiv: () => fetchArxivEsotericResearch(limit),
      vatican: () => fetchVaticanKnowledge(limit),
      pluto: () => fetchPlutoKnowledge(),
    };

    const selectedDomains = domains || Object.keys(scrapers);
    const results: Record<string, number> = {};
    let totalIngested = 0;

    for (const domain of selectedDomains) {
      const scraper = scrapers[domain];
      if (!scraper) continue;

      try {
        const items = await scraper();
        if (items.length > 0) {
          const ingested = await runSourceIngestion(
            `Esoteric-${domain}`,
            null,
            async () => items,
          );
          results[domain] = ingested.ingested;
          totalIngested += ingested.ingested;
        } else {
          results[domain] = 0;
        }
      } catch (err) {
        logger.warn({ err, domain }, "Esoteric scraping failed for domain");
        results[domain] = 0;
      }
    }

    return res.json({
      ok: true,
      totalIngested,
      domainResults: results,
      scrapedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "POST /knowledge/scrape-esoteric failed");
    return res.status(500).json({ error: "Failed to scrape esoteric sources", details: String(err) });
  }
});

export default router;
