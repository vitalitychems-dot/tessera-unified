/**
 * Causal World Model.
 *
 * Records (action, preState, postState) tuples and estimates the causal
 * effect of each action on each observed metric using simple before/after
 * differencing with time-decayed averaging.
 *
 * The Synthesis Engine queries this to prefer tunable changes whose past
 * applications actually moved metrics in the desired direction, replacing
 * blind heuristics with learned effect estimates.
 */

export interface MetricSnapshot {
  at: number;
  metrics: Record<string, number>;
}

export interface CausalEvent {
  id: string;
  at: number;
  actionKey: string;      // e.g. "tunable:buildsPerTick"
  actionDelta: number;    // signed change magnitude
  preState: MetricSnapshot;
  postState?: MetricSnapshot;
  postStateAt?: number;
  windowMs: number;       // how long after the action we wait to sample postState
}

export interface CausalEffect {
  actionKey: string;
  metric: string;
  samples: number;
  effectPerUnit: number;   // average ΔMetric per unit ΔAction
  lastSampleAt: number;
  confidence: number;      // 0..1 based on sample count
}

const events: CausalEvent[] = [];
const effects = new Map<string, CausalEffect>(); // key = `${actionKey}|${metric}`
const EVENTS_CAP = 500;
const EFFECTS_CAP = 300;

function pruneEffects(): void {
  if (effects.size <= EFFECTS_CAP) return;
  // Evict least-confident, least-recently-sampled first.
  const sorted = [...effects.entries()].sort(
    (a, b) => (a[1].confidence - b[1].confidence) || (a[1].lastSampleAt - b[1].lastSampleAt),
  );
  const toRemove = sorted.slice(0, effects.size - EFFECTS_CAP);
  for (const [k] of toRemove) effects.delete(k);
}

export function recordAction(
  actionKey: string,
  actionDelta: number,
  preState: MetricSnapshot,
  windowMs = 5 * 60 * 1000,
): CausalEvent {
  const evt: CausalEvent = {
    id: `causal-${Date.now().toString(36)}-${events.length}`,
    at: Date.now(),
    actionKey,
    actionDelta,
    preState,
    windowMs,
  };
  events.push(evt);
  if (events.length > EVENTS_CAP) events.splice(0, events.length - EVENTS_CAP);
  return evt;
}

/**
 * Close the loop: for every event past its window with no postState, sample
 * the provided metrics snapshot as its post-state and update effect estimates.
 */
export function samplePostStates(nowSnapshot: MetricSnapshot): number {
  let closed = 0;
  for (const evt of events) {
    if (evt.postState) continue;
    if (nowSnapshot.at - evt.at < evt.windowMs) continue;
    evt.postState = nowSnapshot;
    evt.postStateAt = nowSnapshot.at;
    if (evt.actionDelta === 0) continue;
    for (const metric of Object.keys(evt.preState.metrics)) {
      const pre = evt.preState.metrics[metric];
      const post = nowSnapshot.metrics[metric];
      if (typeof pre !== "number" || typeof post !== "number") continue;
      const deltaMetric = post - pre;
      const effectPerUnit = deltaMetric / evt.actionDelta;
      const key = `${evt.actionKey}|${metric}`;
      const e = effects.get(key);
      if (!e) {
        effects.set(key, {
          actionKey: evt.actionKey,
          metric,
          samples: 1,
          effectPerUnit,
          lastSampleAt: Date.now(),
          confidence: 0.1,
        });
      } else {
        // Exponential moving average with decay toward recent evidence.
        const alpha = 0.35;
        e.effectPerUnit = e.effectPerUnit * (1 - alpha) + effectPerUnit * alpha;
        e.samples += 1;
        e.lastSampleAt = Date.now();
        e.confidence = Math.min(1, e.samples / 12);
      }
    }
    pruneEffects();
    closed += 1;
  }
  return closed;
}

/**
 * For a given actionKey, return the predicted effect on each known metric.
 * Used by the Synthesis Engine to pick changes with proven positive impact.
 */
export function predictedEffects(actionKey: string): CausalEffect[] {
  return [...effects.values()]
    .filter((e) => e.actionKey === actionKey)
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Recommend direction for a tunable given a target metric to maximize.
 * Returns { direction: "up"|"down"|"unknown", confidence: 0..1 }.
 */
export function recommendDirection(
  actionKey: string,
  metric: string,
  targetDirection: "up" | "down" = "up",
): { direction: "up" | "down" | "unknown"; confidence: number; effectPerUnit: number } {
  const key = `${actionKey}|${metric}`;
  const e = effects.get(key);
  if (!e) return { direction: "unknown", confidence: 0, effectPerUnit: 0 };
  if (Math.abs(e.effectPerUnit) < 1e-9) return { direction: "unknown", confidence: e.confidence, effectPerUnit: e.effectPerUnit };
  // If increasing the action moves the metric in the target direction, go up.
  const favorableUp = (targetDirection === "up" && e.effectPerUnit > 0) || (targetDirection === "down" && e.effectPerUnit < 0);
  return { direction: favorableUp ? "up" : "down", confidence: e.confidence, effectPerUnit: e.effectPerUnit };
}

export function allEffects(): CausalEffect[] {
  return [...effects.values()].sort((a, b) => b.confidence - a.confidence);
}

export function causalModelSnapshot() {
  return {
    totalEvents: events.length,
    openEvents: events.filter((e) => !e.postState).length,
    totalEffects: effects.size,
    topEffects: allEffects().slice(0, 20),
    recentEvents: events.slice(-10).reverse(),
  };
}
