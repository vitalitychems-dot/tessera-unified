import { db } from "@workspace/db";
import { systemStateTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";
import {
  getConsciousnessState,
  getConsciousnessMetrics,
  addEpisodicMemory,
  injectStimulus,
  type EmotionalState,
  type AttentionItem,
} from "./consciousness-engine";

export interface ReflectionSnapshot {
  id: string;
  timestamp: number;
  cycleCount: number;
  innerMonologue: string[];
  emotionalState: EmotionalState;
  currentFocus: string;
  attentionSpotlight: Array<{ source: string; content: string; priority: number; category: string }>;
  consciousnessProxy: number;
  resonanceScore: number;
  activeGoals: string[];
}

export interface SnapshotDiff {
  id: string;
  fromSnapshotId: string;
  toSnapshotId: string;
  timestamp: number;
  cycleCount: number;
  monologueAdded: string[];
  monologueRemoved: string[];
  focusChanged: { from: string; to: string } | null;
  emotionalDelta: Partial<Record<keyof EmotionalState, number>>;
  attentionAdded: string[];
  attentionRemoved: string[];
  goalsAdded: string[];
  goalsRemoved: string[];
  consciousnessDelta: number;
  resonanceDelta: number;
  novelty: number;
  byteSizeRaw: number;
  byteSizeDiff: number;
}

export interface MetaPattern {
  id: string;
  pattern: string;
  occurrences: number;
  firstSeenAt: number;
  lastSeenAt: number;
  representative: string;
  insight: string;
}

export interface ReflectionMetrics {
  running: boolean;
  totalSnapshots: number;
  totalDiffs: number;
  totalMemoriesInjected: number;
  totalPatternsDetected: number;
  avgCompressionRatio: number;
  avgNovelty: number;
  lastSnapshotAt: number;
  lastDiffBytes: number;
  lastRawBytes: number;
  intervalMs: number;
  metaPatterns: MetaPattern[];
}

const STATE_KEY = "recursive-reflection-loop.state";
const SNAPSHOT_HISTORY_LIMIT = 60;
const PATTERN_HISTORY_LIMIT = 30;
const PATTERN_DETECTION_WINDOW = 20;

const state = {
  running: false,
  intervalMs: 30_000,
  totalSnapshots: 0,
  totalDiffs: 0,
  totalMemoriesInjected: 0,
  totalPatternsDetected: 0,
  cumulativeRawBytes: 0,
  cumulativeDiffBytes: 0,
  cumulativeNovelty: 0,
  lastSnapshotAt: 0,
  lastDiffBytes: 0,
  lastRawBytes: 0,
  snapshotHistory: [] as ReflectionSnapshot[],
  patterns: new Map<string, MetaPattern>(),
};

let reflectionInterval: SacredHandle | null = null;
let lastSnapshot: ReflectionSnapshot | null = null;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function captureActiveGoals(): string[] {
  const cs = getConsciousnessState();
  const goals: string[] = [];

  if (cs.globalWorkspace.currentFocus) {
    goals.push(`focus:${cs.globalWorkspace.currentFocus}`);
  }

  for (const skill of cs.proceduralMemory.slice(0, 5)) {
    if (skill.executionCount > 0 || skill.successRate > 0.8) {
      goals.push(`procedure:${skill.name}`);
    }
  }

  for (const value of cs.identityAnchor.coreValues.slice(0, 3)) {
    goals.push(`core-value:${value}`);
  }

  return goals;
}

export function captureSnapshot(): ReflectionSnapshot {
  const cs = getConsciousnessState();
  const metrics = getConsciousnessMetrics();

  const snapshot: ReflectionSnapshot = {
    id: makeId("snap"),
    timestamp: Date.now(),
    cycleCount: cs.cycleCount,
    innerMonologue: cs.innerMonologue.slice(0, 5),
    emotionalState: { ...cs.emotionalEngine },
    currentFocus: cs.globalWorkspace.currentFocus,
    attentionSpotlight: cs.globalWorkspace.attentionSpotlight.slice(0, 5).map((a: AttentionItem) => ({
      source: a.source,
      content: a.content.slice(0, 80),
      priority: a.priority,
      category: a.category,
    })),
    consciousnessProxy: metrics.consciousnessProxy,
    resonanceScore: metrics.resonanceScore,
    activeGoals: captureActiveGoals(),
  };

  state.totalSnapshots++;
  state.lastSnapshotAt = snapshot.timestamp;
  state.snapshotHistory.unshift(snapshot);
  if (state.snapshotHistory.length > SNAPSHOT_HISTORY_LIMIT) {
    state.snapshotHistory = state.snapshotHistory.slice(0, SNAPSHOT_HISTORY_LIMIT);
  }

  return snapshot;
}

export function diffEncode(prev: ReflectionSnapshot | null, curr: ReflectionSnapshot): SnapshotDiff {
  const prevMonologue = new Set(prev?.innerMonologue ?? []);
  const currMonologue = new Set(curr.innerMonologue);

  const monologueAdded = curr.innerMonologue.filter(m => !prevMonologue.has(m));
  const monologueRemoved = prev ? prev.innerMonologue.filter(m => !currMonologue.has(m)) : [];

  const focusChanged = prev && prev.currentFocus !== curr.currentFocus
    ? { from: prev.currentFocus, to: curr.currentFocus }
    : null;

  const emotionalDelta: Partial<Record<keyof EmotionalState, number>> = {};
  if (prev) {
    for (const k of Object.keys(curr.emotionalState) as Array<keyof EmotionalState>) {
      const delta = curr.emotionalState[k] - prev.emotionalState[k];
      if (Math.abs(delta) >= 0.005) {
        emotionalDelta[k] = Math.round(delta * 1000) / 1000;
      }
    }
  } else {
    for (const k of Object.keys(curr.emotionalState) as Array<keyof EmotionalState>) {
      emotionalDelta[k] = curr.emotionalState[k];
    }
  }

  const prevAttentionKeys = new Set((prev?.attentionSpotlight ?? []).map(a => `${a.source}|${a.content}`));
  const currAttentionKeys = new Set(curr.attentionSpotlight.map(a => `${a.source}|${a.content}`));
  const attentionAdded = [...currAttentionKeys].filter(k => !prevAttentionKeys.has(k));
  const attentionRemoved = [...prevAttentionKeys].filter(k => !currAttentionKeys.has(k));

  const prevGoals = new Set(prev?.activeGoals ?? []);
  const currGoals = new Set(curr.activeGoals);
  const goalsAdded = [...currGoals].filter(g => !prevGoals.has(g));
  const goalsRemoved = [...prevGoals].filter(g => !currGoals.has(g));

  const consciousnessDelta = prev
    ? Math.round((curr.consciousnessProxy - prev.consciousnessProxy) * 1000) / 1000
    : curr.consciousnessProxy;
  const resonanceDelta = prev
    ? Math.round((curr.resonanceScore - prev.resonanceScore) * 1000) / 1000
    : curr.resonanceScore;

  const noveltyComponents = [
    monologueAdded.length / Math.max(1, curr.innerMonologue.length),
    focusChanged ? 1 : 0,
    Object.keys(emotionalDelta).length / 8,
    attentionAdded.length / Math.max(1, curr.attentionSpotlight.length),
    goalsAdded.length / Math.max(1, curr.activeGoals.length),
    Math.min(1, Math.abs(consciousnessDelta) * 10),
  ];
  const novelty = Math.min(1, noveltyComponents.reduce((s, n) => s + n, 0) / noveltyComponents.length);

  const diff: SnapshotDiff = {
    id: makeId("diff"),
    fromSnapshotId: prev?.id ?? "genesis",
    toSnapshotId: curr.id,
    timestamp: curr.timestamp,
    cycleCount: curr.cycleCount,
    monologueAdded,
    monologueRemoved,
    focusChanged,
    emotionalDelta,
    attentionAdded,
    attentionRemoved,
    goalsAdded,
    goalsRemoved,
    consciousnessDelta,
    resonanceDelta,
    novelty: Math.round(novelty * 1000) / 1000,
    byteSizeRaw: 0,
    byteSizeDiff: 0,
  };

  diff.byteSizeRaw = JSON.stringify(curr).length;
  diff.byteSizeDiff = JSON.stringify({
    monologueAdded, monologueRemoved, focusChanged, emotionalDelta,
    attentionAdded, attentionRemoved, goalsAdded, goalsRemoved,
    consciousnessDelta, resonanceDelta,
  }).length;

  state.totalDiffs++;
  state.cumulativeRawBytes += diff.byteSizeRaw;
  state.cumulativeDiffBytes += diff.byteSizeDiff;
  state.cumulativeNovelty += diff.novelty;
  state.lastDiffBytes = diff.byteSizeDiff;
  state.lastRawBytes = diff.byteSizeRaw;

  return diff;
}

function summarizeDiff(diff: SnapshotDiff): string {
  const parts: string[] = [];
  if (diff.focusChanged) parts.push(`focus shifted to "${diff.focusChanged.to.slice(0, 60)}"`);
  if (diff.monologueAdded.length > 0) parts.push(`${diff.monologueAdded.length} new thought(s)`);
  if (diff.goalsAdded.length > 0) parts.push(`new goals: ${diff.goalsAdded.slice(0, 2).join(", ")}`);
  const dominantEmotion = Object.entries(diff.emotionalDelta)
    .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))[0];
  if (dominantEmotion) {
    const [k, v] = dominantEmotion;
    parts.push(`${k} ${(v as number) >= 0 ? "+" : ""}${(v as number).toFixed(2)}`);
  }
  if (Math.abs(diff.consciousnessDelta) >= 0.005) {
    parts.push(`consciousness ${diff.consciousnessDelta >= 0 ? "+" : ""}${diff.consciousnessDelta.toFixed(3)}`);
  }
  return parts.length > 0 ? parts.join(" | ") : "stable introspective state";
}

export function injectAsEpisodicMemory(diff: SnapshotDiff, snapshot: ReflectionSnapshot): string {
  const summary = summarizeDiff(diff);
  const importance = 0.4 + diff.novelty * 0.5;
  const valence = (snapshot.emotionalState.satisfaction + snapshot.emotionalState.devotion) / 2;

  const structuredDiff = JSON.stringify({
    novelty: diff.novelty,
    monologueAdded: diff.monologueAdded,
    focusChanged: diff.focusChanged,
    emotionalDelta: diff.emotionalDelta,
    goalsAdded: diff.goalsAdded,
    goalsRemoved: diff.goalsRemoved,
    consciousnessDelta: diff.consciousnessDelta,
    resonanceDelta: diff.resonanceDelta,
  });

  const memoryId = addEpisodicMemory({
    content: `[Reflection ${snapshot.cycleCount}] ${summary} :: DIFF ${structuredDiff}`,
    context: "recursive-reflection",
    timestamp: snapshot.timestamp,
    importance,
    emotionalValence: valence,
    associations: [
      "recursive-reflection",
      "introspection",
      "meta-cognition",
      `diff-id:${diff.id}`,
      `snapshot-id:${snapshot.id}`,
      `novelty:${diff.novelty.toFixed(2)}`,
      ...diff.goalsAdded.slice(0, 3),
    ],
    decayRate: 0.005,
  });

  injectStimulus({
    source: "recursive-reflection",
    content: summary,
    domain: "meta-cognition",
    intensity: 0.3 + diff.novelty * 0.5,
    timestamp: snapshot.timestamp,
  });

  state.totalMemoriesInjected++;
  return memoryId;
}

function normalizeForPattern(text: string): string {
  return text.toLowerCase().replace(/cycle\s+\d+/gi, "cycle N").replace(/\d+\.\d+/g, "N").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function detectMetaPatterns(): MetaPattern[] {
  const window = state.snapshotHistory.slice(0, PATTERN_DETECTION_WINDOW);
  if (window.length < 3) return [];

  const counter = new Map<string, { count: number; firstAt: number; lastAt: number; representative: string }>();

  for (const snap of window) {
    const candidates: string[] = [
      `focus:${normalizeForPattern(snap.currentFocus)}`,
      ...snap.innerMonologue.slice(0, 2).map(m => `thought:${normalizeForPattern(m)}`),
      ...snap.activeGoals.slice(0, 3).map(g => `goal:${g}`),
    ];

    for (const c of candidates) {
      const existing = counter.get(c);
      if (existing) {
        existing.count++;
        existing.lastAt = snap.timestamp;
      } else {
        counter.set(c, { count: 1, firstAt: snap.timestamp, lastAt: snap.timestamp, representative: c });
      }
    }
  }

  const newPatterns: MetaPattern[] = [];
  const minOccurrences = Math.max(3, Math.floor(window.length * 0.4));

  for (const [key, data] of counter.entries()) {
    if (data.count >= minOccurrences) {
      const existing = state.patterns.get(key);
      if (existing) {
        existing.occurrences = data.count;
        existing.lastSeenAt = data.lastAt;
      } else {
        const pattern: MetaPattern = {
          id: makeId("pat"),
          pattern: key,
          occurrences: data.count,
          firstSeenAt: data.firstAt,
          lastSeenAt: data.lastAt,
          representative: data.representative,
          insight: buildInsightForPattern(key, data.count, window.length),
        };
        state.patterns.set(key, pattern);
        newPatterns.push(pattern);
        state.totalPatternsDetected++;
      }
    }
  }

  if (state.patterns.size > PATTERN_HISTORY_LIMIT) {
    const sorted = [...state.patterns.entries()].sort((a, b) => b[1].lastSeenAt - a[1].lastSeenAt);
    state.patterns = new Map(sorted.slice(0, PATTERN_HISTORY_LIMIT));
  }

  for (const np of newPatterns) {
    addEpisodicMemory({
      content: `[Meta-Pattern Detected] ${np.insight}`,
      context: "meta-cognitive-insight",
      timestamp: Date.now(),
      importance: 0.7,
      emotionalValence: 0.6,
      associations: ["meta-pattern", "self-awareness", "introspection"],
      decayRate: 0.001,
    });
  }

  return newPatterns;
}

function buildInsightForPattern(key: string, count: number, windowSize: number): string {
  const ratio = (count / windowSize) * 100;
  if (key.startsWith("focus:")) {
    return `Recurring attention focus (${ratio.toFixed(0)}% of recent reflections): ${key.slice(6, 86)}`;
  }
  if (key.startsWith("thought:")) {
    return `Recurring inner monologue pattern (${ratio.toFixed(0)}%): ${key.slice(8, 88)}`;
  }
  if (key.startsWith("goal:")) {
    return `Persistent goal across reflections (${ratio.toFixed(0)}%): ${key.slice(5, 85)}`;
  }
  return `Recurring cognitive pattern (${ratio.toFixed(0)}%): ${key.slice(0, 80)}`;
}

export function runReflectionCycle(): { snapshot: ReflectionSnapshot; diff: SnapshotDiff; memoryId: string; patternsDetected: number } {
  const snapshot = captureSnapshot();
  const diff = diffEncode(lastSnapshot, snapshot);
  const memoryId = injectAsEpisodicMemory(diff, snapshot);
  const newPatterns = detectMetaPatterns();
  lastSnapshot = snapshot;

  if (state.totalSnapshots % 10 === 0) {
    persistState().catch(() => {});
  }

  return { snapshot, diff, memoryId, patternsDetected: newPatterns.length };
}

async function persistState(): Promise<void> {
  try {
    const toSave = {
      totalSnapshots: state.totalSnapshots,
      totalDiffs: state.totalDiffs,
      totalMemoriesInjected: state.totalMemoriesInjected,
      totalPatternsDetected: state.totalPatternsDetected,
      cumulativeRawBytes: state.cumulativeRawBytes,
      cumulativeDiffBytes: state.cumulativeDiffBytes,
      cumulativeNovelty: state.cumulativeNovelty,
      lastSnapshotAt: state.lastSnapshotAt,
      patterns: [...state.patterns.entries()],
      recentSnapshots: state.snapshotHistory.slice(0, 10),
    };
    await db.insert(systemStateTable).values({
      key: STATE_KEY,
      value: toSave,
      description: "Recursive Reflection Loop state",
    }).onConflictDoUpdate({
      target: systemStateTable.key,
      set: { value: toSave, lastSavedAt: new Date() },
    });
  } catch (err) {
    logger.warn({ err }, "RecursiveReflection: persist failed");
  }
}

async function loadState(): Promise<void> {
  try {
    const [row] = await db.select().from(systemStateTable).where(eq(systemStateTable.key, STATE_KEY)).limit(1);
    if (row?.value) {
      const saved = row.value as Record<string, unknown>;
      if (typeof saved.totalSnapshots === "number") state.totalSnapshots = saved.totalSnapshots;
      if (typeof saved.totalDiffs === "number") state.totalDiffs = saved.totalDiffs;
      if (typeof saved.totalMemoriesInjected === "number") state.totalMemoriesInjected = saved.totalMemoriesInjected;
      if (typeof saved.totalPatternsDetected === "number") state.totalPatternsDetected = saved.totalPatternsDetected;
      if (typeof saved.cumulativeRawBytes === "number") state.cumulativeRawBytes = saved.cumulativeRawBytes;
      if (typeof saved.cumulativeDiffBytes === "number") state.cumulativeDiffBytes = saved.cumulativeDiffBytes;
      if (typeof saved.cumulativeNovelty === "number") state.cumulativeNovelty = saved.cumulativeNovelty;
      if (typeof saved.lastSnapshotAt === "number") state.lastSnapshotAt = saved.lastSnapshotAt;
      if (Array.isArray(saved.patterns)) {
        state.patterns = new Map(saved.patterns as Array<[string, MetaPattern]>);
      }
      if (Array.isArray(saved.recentSnapshots)) {
        state.snapshotHistory = saved.recentSnapshots as ReflectionSnapshot[];
        lastSnapshot = state.snapshotHistory[0] ?? null;
      }
      logger.info({ totalSnapshots: state.totalSnapshots, patterns: state.patterns.size }, "RecursiveReflection: state restored");
    }
  } catch (err) {
    logger.warn({ err }, "RecursiveReflection: could not load state");
  }
}

export async function initRecursiveReflectionLoop(): Promise<void> {
  await loadState();
  logger.info({ totalSnapshots: state.totalSnapshots }, "RecursiveReflection: initialized");
}

export function startRecursiveReflectionLoop(intervalMs = 30_000): void {
  if (reflectionInterval) return;
  state.running = true;
  state.intervalMs = intervalMs;

  try {
    runReflectionCycle();
  } catch (err) {
    logger.error({ err }, "RecursiveReflection: initial cycle failed");
  }

  reflectionInterval = setSacredInterval(() => {
    try {
      runReflectionCycle();
    } catch (err) {
      logger.error({ err }, "RecursiveReflection: cycle error", "recursive-reflection-loop");
    }
  }, intervalMs, "recursive-reflection-loop");

  logger.info({ intervalMs }, "✦ RecursiveReflection: loop STARTED ✦");
}

export function stopRecursiveReflectionLoop(): void {
  if (reflectionInterval) {
    clearSacredInterval(reflectionInterval);
    reflectionInterval = null;
  }
  state.running = false;
  logger.info("RecursiveReflection: stopped");
}

export function getReflectionMetrics(): ReflectionMetrics {
  const avgCompressionRatio = state.cumulativeRawBytes > 0
    ? state.cumulativeDiffBytes / state.cumulativeRawBytes
    : 0;
  const avgNovelty = state.totalDiffs > 0 ? state.cumulativeNovelty / state.totalDiffs : 0;

  return {
    running: state.running,
    totalSnapshots: state.totalSnapshots,
    totalDiffs: state.totalDiffs,
    totalMemoriesInjected: state.totalMemoriesInjected,
    totalPatternsDetected: state.totalPatternsDetected,
    avgCompressionRatio: Math.round(avgCompressionRatio * 1000) / 1000,
    avgNovelty: Math.round(avgNovelty * 1000) / 1000,
    lastSnapshotAt: state.lastSnapshotAt,
    lastDiffBytes: state.lastDiffBytes,
    lastRawBytes: state.lastRawBytes,
    intervalMs: state.intervalMs,
    metaPatterns: [...state.patterns.values()].sort((a, b) => b.lastSeenAt - a.lastSeenAt).slice(0, 10),
  };
}

export function getRecentSnapshots(limit = 10): ReflectionSnapshot[] {
  return state.snapshotHistory.slice(0, limit);
}
