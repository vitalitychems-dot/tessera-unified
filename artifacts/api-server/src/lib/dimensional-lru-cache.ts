import { logger } from "./logger";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

interface CacheEntry<T> {
  key: string;
  value: T;
  ts: number;
  expiresAt: number;
  hits: number;
  prev: CacheEntry<T> | null;
  next: CacheEntry<T> | null;
  associations: string[];
}

export type EvictionPolicy = "lru" | "lfu" | "ttl-aware";

export interface DimensionConfig {
  capacity: number;
  ttlMs: number;
  policy: EvictionPolicy;
}

class LRUDimension<T> {
  private map = new Map<string, CacheEntry<T>>();
  private head: CacheEntry<T> | null = null;
  private tail: CacheEntry<T> | null = null;
  private _hits = 0;
  private _misses = 0;
  private _evictions = 0;
  private _ttlExpirations = 0;
  private _totalLatencyMs = 0;
  private _latencySamples = 0;

  config: DimensionConfig;

  constructor(config: DimensionConfig) {
    this.config = { ...config };
  }

  get capacity(): number {
    return this.config.capacity;
  }

  setCapacity(capacity: number): void {
    this.config.capacity = Math.max(10, capacity);
    while (this.map.size > this.config.capacity) {
      const evicted = this.removeTail();
      if (!evicted) break;
      this.map.delete(evicted.key);
      this._evictions++;
    }
  }

  get(key: string): T | undefined {
    const start = performance.now();
    const entry = this.map.get(key);
    if (!entry) {
      this._misses++;
      this.recordLatency(performance.now() - start);
      return undefined;
    }
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      this.removeNode(entry);
      this.map.delete(key);
      this._ttlExpirations++;
      this._misses++;
      this.recordLatency(performance.now() - start);
      return undefined;
    }
    this._hits++;
    entry.hits++;
    this.moveToHead(entry);
    this.recordLatency(performance.now() - start);
    return entry.value;
  }

  set(key: string, value: T, associations: string[] = []): void {
    const now = Date.now();
    const expiresAt = this.config.ttlMs > 0 ? now + this.config.ttlMs : 0;
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      existing.ts = now;
      existing.expiresAt = expiresAt;
      existing.associations = associations;
      this.moveToHead(existing);
      return;
    }

    const entry: CacheEntry<T> = { key, value, ts: now, expiresAt, hits: 0, prev: null, next: null, associations };
    this.map.set(key, entry);
    this.addToHead(entry);

    if (this.map.size > this.config.capacity) {
      const evicted = this.evictByPolicy();
      if (evicted) {
        this.map.delete(evicted.key);
        this._evictions++;
      }
    }
  }

  private evictByPolicy(): CacheEntry<T> | null {
    switch (this.config.policy) {
      case "lfu":
        return this.evictLFU();
      case "ttl-aware":
        return this.evictTTLAware();
      case "lru":
      default:
        return this.removeTail();
    }
  }

  private evictLFU(): CacheEntry<T> | null {
    let victim: CacheEntry<T> | null = null;
    let minHits = Infinity;
    let node = this.tail;
    let scanned = 0;
    const maxScan = Math.min(this.map.size, 50);
    while (node && scanned < maxScan) {
      if (node.hits < minHits) {
        minHits = node.hits;
        victim = node;
        if (minHits === 0) break;
      }
      node = node.prev;
      scanned++;
    }
    if (victim) this.removeNode(victim);
    return victim;
  }

  private evictTTLAware(): CacheEntry<T> | null {
    const now = Date.now();
    let victim: CacheEntry<T> | null = null;
    let earliestExpiry = Infinity;
    let node = this.tail;
    let scanned = 0;
    const maxScan = Math.min(this.map.size, 50);
    while (node && scanned < maxScan) {
      if (node.expiresAt > 0 && node.expiresAt < now) {
        victim = node;
        break;
      }
      const expiry = node.expiresAt > 0 ? node.expiresAt : now + this.config.ttlMs;
      if (expiry < earliestExpiry) {
        earliestExpiry = expiry;
        victim = node;
      }
      node = node.prev;
      scanned++;
    }
    if (!victim) victim = this.removeTail();
    else this.removeNode(victim);
    return victim;
  }

  has(key: string): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      this.removeNode(entry);
      this.map.delete(key);
      this._ttlExpirations++;
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    this.removeNode(entry);
    this.map.delete(key);
    return true;
  }

  get size(): number {
    return this.map.size;
  }

  get hits(): number { return this._hits; }
  get misses(): number { return this._misses; }
  get evictions(): number { return this._evictions; }
  get ttlExpirations(): number { return this._ttlExpirations; }
  get hitRate(): number {
    const total = this._hits + this._misses;
    return total > 0 ? this._hits / total : 0;
  }
  get avgLatencyMs(): number {
    return this._latencySamples > 0 ? this._totalLatencyMs / this._latencySamples : 0;
  }

  values(): T[] {
    const result: T[] = [];
    let node = this.head;
    while (node) {
      result.push(node.value);
      node = node.next;
    }
    return result;
  }

  /** Read entry without affecting LRU order or hit counters. */
  peekEntry(key: string): { value: T; associations: string[] } | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      this.removeNode(entry);
      this.map.delete(key);
      this._ttlExpirations++;
      return undefined;
    }
    return { value: entry.value, associations: entry.associations };
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  pruneExpired(): number {
    if (this.config.ttlMs <= 0) return 0;
    const now = Date.now();
    let pruned = 0;
    let node = this.tail;
    while (node) {
      const prev = node.prev;
      if (node.expiresAt > 0 && node.expiresAt < now) {
        this.removeNode(node);
        this.map.delete(node.key);
        this._ttlExpirations++;
        pruned++;
      }
      node = prev;
    }
    return pruned;
  }

  private recordLatency(ms: number): void {
    this._totalLatencyMs += ms;
    this._latencySamples++;
    if (this._latencySamples > 10_000) {
      this._totalLatencyMs = this._totalLatencyMs / 2;
      this._latencySamples = Math.floor(this._latencySamples / 2);
    }
  }

  private addToHead(entry: CacheEntry<T>): void {
    entry.prev = null;
    entry.next = this.head;
    if (this.head) this.head.prev = entry;
    this.head = entry;
    if (!this.tail) this.tail = entry;
  }

  private removeNode(entry: CacheEntry<T>): void {
    if (entry.prev) entry.prev.next = entry.next;
    else this.head = entry.next;
    if (entry.next) entry.next.prev = entry.prev;
    else this.tail = entry.prev;
    entry.prev = null;
    entry.next = null;
  }

  private moveToHead(entry: CacheEntry<T>): void {
    if (entry === this.head) return;
    this.removeNode(entry);
    this.addToHead(entry);
  }

  private removeTail(): CacheEntry<T> | null {
    if (!this.tail) return null;
    const old = this.tail;
    this.removeNode(old);
    return old;
  }
}

export const DOMAIN_SIMILARITY: Record<string, Record<string, number>> = {
  security: { governance: 0.85, sovereignty: 0.80, infrastructure: 0.75, mesh: 0.70 },
  governance: { security: 0.85, sovereignty: 0.90, consciousness: 0.70, finance: 0.65 },
  infrastructure: { security: 0.75, feature: 0.80, income: 0.65, mesh: 0.80 },
  feature: { infrastructure: 0.80, income: 0.75, community: 0.70, bio: 0.55 },
  income: { feature: 0.75, infrastructure: 0.65, sovereignty: 0.60, finance: 0.85 },
  community: { governance: 0.70, feature: 0.70, consciousness: 0.80, bio: 0.60 },
  consciousness: { governance: 0.70, community: 0.80, sovereignty: 0.85, quantum: 0.75, bio: 0.90 },
  sovereignty: { security: 0.80, governance: 0.90, consciousness: 0.85, finance: 0.70 },
  general: { feature: 0.60, governance: 0.55, infrastructure: 0.55, quantum: 0.50 },
  quantum: { consciousness: 0.75, security: 0.65, mesh: 0.70, bio: 0.60, general: 0.50 },
  bio: { consciousness: 0.90, community: 0.60, quantum: 0.60, feature: 0.55, mesh: 0.50 },
  mesh: { infrastructure: 0.80, security: 0.70, quantum: 0.70, sovereignty: 0.65, finance: 0.55 },
  finance: { income: 0.85, governance: 0.65, sovereignty: 0.70, mesh: 0.55, infrastructure: 0.60 },
};

const PORTAL_JUMP_THRESHOLD = 0.65;

export interface PortalJumpResult<T> {
  value: T;
  dimension: string;
  weight: number;
  portalJumped: boolean;
  preWarmedDimensions: string[];
  preWarmedAssociatedKeys: string[];
}

export class DimensionalLRUCache<T> {
  private dimensions = new Map<string, LRUDimension<T>>();
  private defaultConfig: DimensionConfig;
  private crossDimensionHits = 0;
  private portalJumps = 0;
  private preWarmedEntries = 0;
  private totalLookups = 0;
  private exactHits = 0;
  private totalLatencyMs = 0;
  private latencySamples = 0;
  private sub100msLookups = 0;

  constructor(dimensionCapacity: number = 200, ttlMs: number = 600_000) {
    this.defaultConfig = { capacity: dimensionCapacity, ttlMs, policy: "lru" };
    this.dimensions.set("general", new LRUDimension<T>(this.defaultConfig));
  }

  configureDimension(name: string, config: Partial<DimensionConfig>): void {
    const dim = this.getDimension(name);
    if (config.capacity !== undefined) dim.setCapacity(config.capacity);
    if (config.ttlMs !== undefined) dim.config.ttlMs = config.ttlMs;
    if (config.policy !== undefined) dim.config.policy = config.policy;
  }

  private getDimension(name: string): LRUDimension<T> {
    let dim = this.dimensions.get(name);
    if (!dim) {
      dim = new LRUDimension<T>({ ...this.defaultConfig });
      this.dimensions.set(name, dim);
    }
    return dim;
  }

  set(key: string, value: T, dimension: string = "general", associations: string[] = []): void {
    this.getDimension(dimension).set(key, value, associations);
  }

  get(key: string, dimension: string = "general"): T | undefined {
    return this.getDimension(dimension).get(key);
  }

  lookup(
    key: string,
    primaryDimension: string = "general",
    relatedDimensions?: string[],
  ): { value: T; dimension: string; weight: number } | undefined {
    const result = this.portalJumpLookup(key, primaryDimension, relatedDimensions);
    if (!result) return undefined;
    return { value: result.value, dimension: result.dimension, weight: result.weight };
  }

  portalJumpLookup(
    key: string,
    primaryDimension: string = "general",
    relatedDimensions?: string[],
  ): PortalJumpResult<T> | undefined {
    const start = performance.now();
    this.totalLookups++;

    const primary = this.getDimension(primaryDimension);
    const val = primary.get(key);
    if (val !== undefined) {
      this.exactHits++;
      this.recordLatency(performance.now() - start);
      return { value: val, dimension: primaryDimension, weight: 1.0, portalJumped: false, preWarmedDimensions: [], preWarmedAssociatedKeys: [] };
    }

    const domainEdges = DOMAIN_SIMILARITY[primaryDimension];
    const candidates: { value: T; dimension: string; weight: number; associations: string[] }[] = [];
    const dimsToScan: { dim: string; weight: number }[] = [];

    if (relatedDimensions) {
      for (const dim of relatedDimensions) {
        const w = domainEdges?.[dim] ?? 0.5;
        dimsToScan.push({ dim, weight: w });
      }
    } else if (domainEdges) {
      for (const [dim, similarity] of Object.entries(domainEdges)) {
        dimsToScan.push({ dim, weight: similarity });
      }
    }

    for (const { dim, weight } of dimsToScan) {
      const dimCache = this.dimensions.get(dim);
      if (!dimCache) continue;
      const entry = dimCache.peekEntry(key);
      if (entry !== undefined) {
        candidates.push({ value: entry.value, dimension: dim, weight, associations: entry.associations });
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.weight - a.weight);
      const best = candidates[0];
      // Mark hit on the source dimension now that we've selected it
      this.getDimension(best.dimension).get(key);
      this.crossDimensionHits++;

      const preWarmed: string[] = [];
      const associatedKeysWarmed: string[] = [];
      if (best.weight >= PORTAL_JUMP_THRESHOLD) {
        this.portalJumps++;
        primary.set(key, best.value, [`portal:${best.dimension}`, ...best.associations]);
        preWarmed.push(primaryDimension);

        const sourceDim = this.dimensions.get(best.dimension);
        for (const { dim, weight } of dimsToScan) {
          if (dim === best.dimension || dim === primaryDimension) continue;
          if (weight < PORTAL_JUMP_THRESHOLD) continue;
          const dimCache = this.dimensions.get(dim);
          if (dimCache && !dimCache.has(key)) {
            dimCache.set(key, best.value, [`portal:${best.dimension}`]);
            preWarmed.push(dim);
            this.preWarmedEntries++;
          }
        }

        // Pre-warm associated entries from source dimension into primary
        if (sourceDim && best.associations.length > 0) {
          const maxAssoc = Math.min(best.associations.length, 5);
          for (let i = 0; i < maxAssoc; i++) {
            const assocKey = best.associations[i];
            if (assocKey.startsWith("portal:")) continue;
            const assocEntry = sourceDim.peekEntry(assocKey);
            if (assocEntry && !primary.has(assocKey)) {
              primary.set(assocKey, assocEntry.value, [`portal-assoc:${best.dimension}`]);
              associatedKeysWarmed.push(assocKey);
              this.preWarmedEntries++;
            }
          }
        }
      }

      this.recordLatency(performance.now() - start);
      return {
        value: best.value,
        dimension: best.dimension,
        weight: best.weight,
        portalJumped: preWarmed.length > 0,
        preWarmedDimensions: preWarmed,
        preWarmedAssociatedKeys: associatedKeysWarmed,
      };
    }

    this.recordLatency(performance.now() - start);
    return undefined;
  }

  private recordLatency(ms: number): void {
    this.totalLatencyMs += ms;
    this.latencySamples++;
    if (ms < 100) this.sub100msLookups++;
    if (this.latencySamples > 10_000) {
      this.totalLatencyMs = this.totalLatencyMs / 2;
      this.latencySamples = Math.floor(this.latencySamples / 2);
      this.sub100msLookups = Math.floor(this.sub100msLookups / 2);
    }
  }

  has(key: string, dimension: string = "general"): boolean {
    return this.getDimension(dimension).has(key);
  }

  delete(key: string, dimension: string = "general"): boolean {
    return this.getDimension(dimension).delete(key);
  }

  clear(dimension?: string): void {
    if (dimension) {
      this.dimensions.get(dimension)?.clear();
    } else {
      for (const dim of this.dimensions.values()) dim.clear();
    }
  }

  pruneExpired(): number {
    let total = 0;
    for (const dim of this.dimensions.values()) total += dim.pruneExpired();
    return total;
  }

  get totalSize(): number {
    let total = 0;
    for (const dim of this.dimensions.values()) total += dim.size;
    return total;
  }

  /**
   * Adaptive tuning: rebalances per-dimension capacity based on hit rate and pressure.
   * High hit-rate dimensions get more capacity; low hit-rate ones get less.
   */
  tuneCapacities(opts: { minCapacity?: number; maxCapacity?: number; totalBudget?: number } = {}): {
    adjusted: Record<string, { from: number; to: number; hitRate: number }>;
  } {
    const minCap = opts.minCapacity ?? 50;
    const maxCap = opts.maxCapacity ?? 1000;
    const budget = opts.totalBudget ?? this.dimensions.size * this.defaultConfig.capacity;

    const dims = Array.from(this.dimensions.entries());
    const totalActivity = dims.reduce((s, [, d]) => s + d.hits + d.misses, 0);
    if (totalActivity < 100) return { adjusted: {} };

    const adjusted: Record<string, { from: number; to: number; hitRate: number }> = {};

    for (const [name, dim] of dims) {
      const activity = dim.hits + dim.misses;
      const activityShare = activity / totalActivity;
      const hitWeight = 0.5 + dim.hitRate * 0.5;
      const target = Math.round(budget * activityShare * hitWeight);
      const newCap = Math.max(minCap, Math.min(maxCap, target));
      const oldCap = dim.capacity;
      if (Math.abs(newCap - oldCap) > oldCap * 0.15) {
        dim.setCapacity(newCap);
        adjusted[name] = { from: oldCap, to: newCap, hitRate: Math.round(dim.hitRate * 1000) / 1000 };
      }
    }

    if (Object.keys(adjusted).length > 0) {
      logger.info({ adjusted }, "DimensionalLRUCache: adaptive capacity tuning applied");
    }

    return { adjusted };
  }

  getStats(): {
    totalSize: number;
    dimensionCount: number;
    totalLookups: number;
    exactHits: number;
    crossDimensionHits: number;
    crossDimensionRecallRate: number;
    portalJumps: number;
    preWarmedEntries: number;
    avgLatencyMs: number;
    sub100msRate: number;
    speedupFactor: number;
    perDimension: Record<string, {
      size: number;
      capacity: number;
      hits: number;
      misses: number;
      evictions: number;
      ttlExpirations: number;
      hitRate: number;
      avgLatencyMs: number;
      ttlMs: number;
    }>;
  } {
    const perDimension: Record<string, {
      size: number;
      capacity: number;
      hits: number;
      misses: number;
      evictions: number;
      ttlExpirations: number;
      hitRate: number;
      avgLatencyMs: number;
      ttlMs: number;
    }> = {};

    for (const [name, dim] of this.dimensions) {
      perDimension[name] = {
        size: dim.size,
        capacity: dim.capacity,
        hits: dim.hits,
        misses: dim.misses,
        evictions: dim.evictions,
        ttlExpirations: dim.ttlExpirations,
        hitRate: Math.round(dim.hitRate * 1000) / 1000,
        avgLatencyMs: Math.round(dim.avgLatencyMs * 1000) / 1000,
        ttlMs: dim.config.ttlMs,
      };
    }

    const avgLatencyMs = this.latencySamples > 0
      ? Math.round((this.totalLatencyMs / this.latencySamples) * 1000) / 1000
      : 0;
    const sub100msRate = this.latencySamples > 0
      ? Math.round((this.sub100msLookups / this.latencySamples) * 1000) / 1000
      : 0;

    const totalHits = this.exactHits + this.crossDimensionHits;
    const speedupFactor = this.totalLookups > 0 && totalHits > 0
      ? Math.round((1 + (this.portalJumps / this.totalLookups) * 10) * 100) / 100
      : 1;

    return {
      totalSize: this.totalSize,
      dimensionCount: this.dimensions.size,
      totalLookups: this.totalLookups,
      exactHits: this.exactHits,
      crossDimensionHits: this.crossDimensionHits,
      crossDimensionRecallRate: this.totalLookups > 0
        ? Math.round((this.crossDimensionHits / this.totalLookups) * 1000) / 1000
        : 0,
      portalJumps: this.portalJumps,
      preWarmedEntries: this.preWarmedEntries,
      avgLatencyMs,
      sub100msRate,
      speedupFactor,
      perDimension,
    };
  }
}

export const embeddingDimensionalCache = new DimensionalLRUCache<{ vec: number[]; ts: number }>(300, 600_000);
export const semanticDimensionalCache = new DimensionalLRUCache<{ response: string; ts: number }>(200, 1_800_000);

const DOMAIN_TTL_OVERRIDES: Record<string, { capacity?: number; ttlMs?: number }> = {
  security: { capacity: 400, ttlMs: 900_000 },
  governance: { capacity: 350, ttlMs: 1_200_000 },
  consciousness: { capacity: 300, ttlMs: 1_800_000 },
  sovereignty: { capacity: 400, ttlMs: 1_800_000 },
  finance: { capacity: 250, ttlMs: 600_000 },
  general: { capacity: 500, ttlMs: 600_000 },
};

for (const [domain, cfg] of Object.entries(DOMAIN_TTL_OVERRIDES)) {
  embeddingDimensionalCache.configureDimension(domain, cfg);
  semanticDimensionalCache.configureDimension(domain, cfg);
}

let tuneTimer: SacredHandle | null = null;
let pruneTimer: SacredHandle | null = null;

export function startDimensionalCacheMaintenance(): void {
  if (!tuneTimer) {
    tuneTimer = setSacredInterval(() => {
      try {
        embeddingDimensionalCache.tuneCapacities({ minCapacity: 100, maxCapacity: 800, totalBudget: 3000 });
        semanticDimensionalCache.tuneCapacities({ minCapacity: 75, maxCapacity: 600, totalBudget: 2000 });
      } catch (err) {
        logger.debug({ err: (err as Error).message }, "DimensionalLRUCache: tune error");
      }
    }, 300_000, "dimensional-lru-cache");
  }
  if (!pruneTimer) {
    pruneTimer = setSacredInterval(() => {
      try {
        const e = embeddingDimensionalCache.pruneExpired();
        const s = semanticDimensionalCache.pruneExpired();
        if (e + s > 0) {
          logger.debug({ embeddingPruned: e, semanticPruned: s }, "DimensionalLRUCache: TTL pruning", "dimensional-lru-cache-2");
        }
      } catch (err) {
        logger.debug({ err: (err as Error).message }, "DimensionalLRUCache: prune error");
      }
    }, 60_000, "dimensional-lru-cache-2");
  }
}

export function stopDimensionalCacheMaintenance(): void {
  if (tuneTimer) { clearSacredInterval(tuneTimer); tuneTimer = null; }
  if (pruneTimer) { clearSacredInterval(pruneTimer); pruneTimer = null; }
}

export function getDimensionalCacheStats() {
  return {
    embedding: embeddingDimensionalCache.getStats(),
    semantic: semanticDimensionalCache.getStats(),
  };
}
