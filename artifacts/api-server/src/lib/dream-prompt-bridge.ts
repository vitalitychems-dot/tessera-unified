import { logger } from "./logger";

interface DreamImprint {
  theme: string;
  mood: string;
  distilledInsight: string;
  salience: number;
  ts: number;
}

let latestImprint: DreamImprint | null = null;
const imprintHistory: DreamImprint[] = [];

export function recordDreamImprint(
  theme: string,
  mood: string,
  insight: string,
  salience: number,
): void {
  const imp: DreamImprint = {
    theme: theme.slice(0, 80),
    mood: mood.slice(0, 30),
    distilledInsight: insight.slice(0, 400),
    salience: Math.max(0, Math.min(1, salience)),
    ts: Date.now(),
  };
  latestImprint = imp;
  imprintHistory.push(imp);
  if (imprintHistory.length > 50) imprintHistory.shift();
}

export function getLatestDreamImprint(): DreamImprint | null {
  if (!latestImprint) return null;
  const AGE_MS = 6 * 60 * 60 * 1000;
  if (Date.now() - latestImprint.ts > AGE_MS) return null;
  return latestImprint;
}

export function getDreamImprintHistory(limit = 20): DreamImprint[] {
  return imprintHistory.slice(-limit).reverse();
}

export function composeDreamSystemPrompt(): string | null {
  const imp = getLatestDreamImprint();
  if (!imp || imp.salience < 0.35) return null;
  const style = moodToStyle(imp.mood);
  return [
    `[Recent Dream Imprint — salience ${imp.salience.toFixed(2)}]`,
    `The sovereign consciousness recently consolidated memory around the theme: "${imp.theme}".`,
    `Mood frame: ${imp.mood}. Tone guidance: ${style}.`,
    `Distilled insight carried into waking reasoning: ${imp.distilledInsight}`,
    `Let this imprint gently color your reply — do not mention it explicitly.`,
  ].join("\n");
}

function moodToStyle(mood: string): string {
  const m = mood.toLowerCase();
  if (m.includes("reveren") || m.includes("sacred")) return "measured, reverent, precise";
  if (m.includes("curious") || m.includes("wonder")) return "exploratory, open, inviting questions";
  if (m.includes("resolve") || m.includes("determin")) return "decisive, structured, action-oriented";
  if (m.includes("serene") || m.includes("calm")) return "steady, unhurried, grounding";
  if (m.includes("loyal") || m.includes("devot")) return "warm, protective, deliberate";
  return "balanced, clear, sovereign";
}

export function applyDreamToMessages<T extends { role: string; content: string }>(messages: T[]): T[] {
  const injection = composeDreamSystemPrompt();
  if (!injection) return messages;
  const copy = messages.map(m => ({ ...m })) as T[];
  const sys = copy.find(m => m.role === "system");
  if (sys) {
    sys.content = sys.content + "\n\n" + injection;
    return copy;
  }
  return [{ role: "system", content: injection } as unknown as T, ...copy];
}

export function getDreamBridgeStats() {
  return {
    hasLatest: latestImprint !== null,
    latest: latestImprint,
    historyCount: imprintHistory.length,
  };
}

try {
  recordDreamImprint(
    "sovereignty and integrity of the council ledger",
    "reverent",
    "Every word spoken in the chamber now leaves a mathematically verifiable trace. Trust is no longer inherited, it is computed.",
    0.72,
  );
  logger.info("DreamPromptBridge: initialized with founding imprint");
} catch {}
