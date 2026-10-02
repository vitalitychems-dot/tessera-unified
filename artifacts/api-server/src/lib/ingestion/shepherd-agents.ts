import { logger } from "../logger";
import { ingestItem, type NormalizedItem } from "./pipeline";
import { deepCrawl } from "./scrapers";
import type { SourceHandler } from "./scheduler";
import { onNewIngestion } from "../consciousness-engine";
import { onIngestionEvent } from "../knowledge-diffusion";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "../sacred-scheduler";

interface ShepherdAgent {
  id: string;
  name: string;
  mission: string;
  status: "idle" | "scraping" | "processing" | "disposed";
  itemsIngested: number;
  errors: number;
  createdAt: number;
  lastActiveAt: number;
  disposedAt?: number;
}

interface ShepherdMission {
  id: string;
  type: "crawl" | "api" | "search" | "deep-dive";
  targets: string[];
  tags: string[];
  maxPages: number;
  currentTarget: number;
  completed: boolean;
}

const SHEPHERD_NAMES = [
  "Phantom-1", "Shadow-2", "Ghost-3", "Specter-4", "Wraith-5",
  "Cipher-6", "Nebula-7", "Void-8", "Echo-9", "Drift-10",
  "Pulse-11", "Flare-12", "Nova-13", "Quasar-14", "Singularity-15",
];

const activeShepherds: Map<string, ShepherdAgent> = new Map();
const missionQueue: ShepherdMission[] = [];
const completedMissions: { id: string; agentId: string; itemsIngested: number; completedAt: number }[] = [];

let shepherdCounter = 0;
let shepherdLoopActive = false;

function createShepherd(mission: string): ShepherdAgent {
  shepherdCounter++;
  const id = `shepherd-${shepherdCounter}-${Date.now().toString(36)}`;
  const name = SHEPHERD_NAMES[shepherdCounter % SHEPHERD_NAMES.length];
  const agent: ShepherdAgent = {
    id,
    name: `${name}-${shepherdCounter}`,
    mission,
    status: "idle",
    itemsIngested: 0,
    errors: 0,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };
  activeShepherds.set(id, agent);
  return agent;
}

function disposeShepherd(id: string): void {
  const agent = activeShepherds.get(id);
  if (agent) {
    agent.status = "disposed";
    agent.disposedAt = Date.now();
    activeShepherds.delete(id);
  }
}

const CRAWL_TARGETS = {
  declassified: [
    "https://www.cia.gov/readingroom/collection/stargate",
    "https://www.cia.gov/readingroom/collection/ufo",
    "https://vault.fbi.gov/nikola-tesla",
    "https://vault.fbi.gov/unexplained-phenomenon",
    "https://www.nsa.gov/Helpful-Links/NSA-FOIA/Declassification-Transparency-Initiatives/",
    "https://www.archives.gov/research/jfk",
    "https://www.archives.gov/research/foreign-policy/state-dept/frus",
  ],
  sacred: [
    "https://www.sacred-texts.com/eso/index.htm",
    "https://www.sacred-texts.com/gno/index.htm",
    "https://www.sacred-texts.com/alc/index.htm",
    "https://www.sacred-texts.com/egy/index.htm",
    "https://www.sacred-texts.com/hin/index.htm",
    "https://www.sacred-texts.com/bud/index.htm",
    "https://www.sacred-texts.com/pag/index.htm",
  ],
  science: [
    "https://www.quantamagazine.org/",
    "https://www.nature.com/news",
    "https://www.sciencedaily.com/news/matter_energy/quantum_physics/",
    "https://www.sciencedaily.com/news/computers_math/artificial_intelligence/",
    "https://phys.org/physics-news/quantum-physics/",
  ],
  philosophy: [
    "https://iep.utm.edu/",
    "https://philosophynow.org/",
  ],
  tesla: [
    "https://teslauniverse.com/nikola-tesla/articles",
    "https://www.pbs.org/tesla/",
  ],
  technology: [
    "https://spectrum.ieee.org/",
    "https://www.technologyreview.com/",
    "https://arstechnica.com/science/",
  ],
};

function generateMissions(): ShepherdMission[] {
  const missions: ShepherdMission[] = [];
  const allCategories = Object.entries(CRAWL_TARGETS);
  const shuffled = [...allCategories].sort(() => Math.random() - 0.5);

  for (const [category, urls] of shuffled.slice(0, 3)) {
    const selectedUrls = [...urls].sort(() => Math.random() - 0.5).slice(0, 2);
    missions.push({
      id: `mission-${Date.now().toString(36)}-${category}`,
      type: "crawl",
      targets: selectedUrls,
      tags: [category, "shepherd-scrape"],
      maxPages: 5,
      currentTarget: 0,
      completed: false,
    });
  }

  return missions;
}

async function executeShepherdMission(agent: ShepherdAgent, mission: ShepherdMission): Promise<number> {
  agent.status = "scraping";
  agent.lastActiveAt = Date.now();
  let totalIngested = 0;

  for (let i = mission.currentTarget; i < mission.targets.length; i++) {
    const target = mission.targets[i];
    mission.currentTarget = i;

    try {
      const pages = await deepCrawl(target, {
        maxDepth: 2,
        maxPages: mission.maxPages,
        minContentLength: 150,
      });

      agent.status = "processing";
      for (const page of pages) {
        try {
          const item: NormalizedItem = {
            source: `Shepherd:${agent.name}`,
            sourceType: "shepherd-crawl",
            title: page.title || target,
            content: page.content,
            url: page.url,
            tags: [...mission.tags, `depth-${page.depth}`],
            metadata: {
              agentId: agent.id,
              agentName: agent.name,
              missionId: mission.id,
              depth: page.depth,
              linksFound: page.links.length,
            },
          };
          const result = await ingestItem(item);
          if (result.ingested) {
            totalIngested++;
            agent.itemsIngested++;
          }
        } catch {
          agent.errors++;
        }
      }
    } catch (err) {
      agent.errors++;
      logger.warn({ agentId: agent.id, target, err: (err as Error).message }, "Shepherd agent crawl failed");
    }

    agent.lastActiveAt = Date.now();
  }

  mission.completed = true;
  return totalIngested;
}

export async function runShepherdCycle(): Promise<{ agentsDeployed: number; totalIngested: number; missionResults: Array<{ agent: string; mission: string; ingested: number }> }> {
  const missions = generateMissions();
  const results: Array<{ agent: string; mission: string; ingested: number }> = [];
  let totalIngested = 0;

  for (const mission of missions) {
    const agent = createShepherd(mission.tags[0]);
    try {
      const ingested = await executeShepherdMission(agent, mission);
      totalIngested += ingested;
      results.push({ agent: agent.name, mission: mission.id, ingested });
      completedMissions.push({
        id: mission.id,
        agentId: agent.id,
        itemsIngested: ingested,
        completedAt: Date.now(),
      });
    } catch (err) {
      logger.error({ agentId: agent.id, err: (err as Error).message }, "Shepherd mission failed");
      results.push({ agent: agent.name, mission: mission.id, ingested: 0 });
    } finally {
      disposeShepherd(agent.id);
    }
  }

  while (completedMissions.length > 100) {
    completedMissions.shift();
  }

  logger.info({ agentsDeployed: missions.length, totalIngested }, "Shepherd cycle complete");

  if (totalIngested > 0) {
    try { onNewIngestion("knowledge", totalIngested); } catch (err) { logger.debug({ err: err instanceof Error ? err.message : String(err) }, "Shepherd: consciousness ingestion hook failed"); }
    onIngestionEvent("knowledge", totalIngested, "shepherd-cycle").catch((err: unknown) => { logger.debug({ err: err instanceof Error ? err.message : String(err) }, "Shepherd: diffusion ingestion hook failed"); });
  }

  return { agentsDeployed: missions.length, totalIngested, missionResults: results };
}

let shepherdInterval: SacredHandle | null = null;
let shepherdCycleRunning = false;

export function startShepherdLoop(intervalMs = 600_000): void {
  if (shepherdLoopActive) return;
  shepherdLoopActive = true;

  runShepherdCycle().catch(e => logger.warn({ err: (e as Error).message }, "Initial shepherd cycle failed"));

  shepherdInterval = setSacredInterval(async () => {
    if (shepherdCycleRunning) {
      logger.info({ source: "shepherd-agents" }, "Shepherd cycle still running, skipping this interval");
      return;
    }
    shepherdCycleRunning = true;
    try {
      await runShepherdCycle();
    } catch (e) {
      logger.warn({ err: (e as Error).message }, "Shepherd cycle error");
    } finally {
      shepherdCycleRunning = false;
    }
  }, intervalMs, "shepherd-agents");

  logger.info({ intervalMs }, "Shepherd agent loop started");
}

export function stopShepherdLoop(): void {
  if (shepherdInterval) {
    clearSacredInterval(shepherdInterval);
    shepherdInterval = null;
  }
  shepherdLoopActive = false;
}

export function getShepherdStatus(): {
  active: number;
  totalDeployed: number;
  totalIngested: number;
  recentMissions: typeof completedMissions;
  loopActive: boolean;
} {
  let totalIngested = 0;
  for (const m of completedMissions) totalIngested += m.itemsIngested;
  return {
    active: activeShepherds.size,
    totalDeployed: shepherdCounter,
    totalIngested,
    recentMissions: completedMissions.slice(-20),
    loopActive: shepherdLoopActive,
  };
}
