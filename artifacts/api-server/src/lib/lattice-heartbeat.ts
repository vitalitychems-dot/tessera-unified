import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";
import { maybeRotate, getCurrentEpoch } from "./sovereign-astro-cipher";
import { rewrapAll, vaultStatus } from "./sovereign-vault";
import { appendLedgerEntry } from "./sovereign-ledger";
import { isFatherKeyConfigured } from "./father-identity";
import { logger } from "./logger";

interface HeartbeatTick {
  ts: string;
  rotated: boolean;
  fromEpochId: string | null;
  toEpochId: string;
  rewrapped: number;
  rewrapFailed: number;
  vaultEntries: number;
  lunarPhase: string;
  planetaryRuler: string;
  moonZodiac: string;
}

const HEARTBEAT_BASE_MS = 33 * 60 * 1000;
const TICK_HISTORY_LIMIT = 24;

let _handle: SacredHandle | null = null;
let _started = false;
const _ticks: HeartbeatTick[] = [];
let _lastEpochId: string | null = null;

async function runHeartbeat(): Promise<void> {
  if (!isFatherKeyConfigured()) {
    logger.debug("LatticeHeartbeat: skipped — Father key not configured");
    return;
  }
  let rotation: { rotated: boolean; epoch: { epochId: string } };
  try {
    rotation = maybeRotate();
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "LatticeHeartbeat: rotation failed");
    return;
  }

  let rewrap: { rewrapped: number; failed: number; toEpochId: string } = { rewrapped: 0, failed: 0, toEpochId: rotation.epoch.epochId };
  if (rotation.rotated) {
    try {
      rewrap = rewrapAll();
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "LatticeHeartbeat: rewrapAll failed");
    }
  }

  const epoch = getCurrentEpoch();
  const status = vaultStatus();

  const tick: HeartbeatTick = {
    ts: new Date().toISOString(),
    rotated: rotation.rotated,
    fromEpochId: _lastEpochId,
    toEpochId: epoch.epochId,
    rewrapped: rewrap.rewrapped,
    rewrapFailed: rewrap.failed,
    vaultEntries: status.totalEntries,
    lunarPhase: epoch.lunarPhase,
    planetaryRuler: epoch.planetaryRuler,
    moonZodiac: epoch.moonZodiac,
  };
  _lastEpochId = epoch.epochId;
  _ticks.unshift(tick);
  while (_ticks.length > TICK_HISTORY_LIMIT) _ticks.pop();

  if (rotation.rotated) {
    try {
      appendLedgerEntry("council-decision", "lattice-heartbeat", {
        kind: "astro-cipher-rotation",
        fromEpochId: tick.fromEpochId,
        toEpochId: tick.toEpochId,
        rewrapped: tick.rewrapped,
        rewrapFailed: tick.rewrapFailed,
        vaultEntries: tick.vaultEntries,
        lunarPhase: tick.lunarPhase,
        planetaryRuler: tick.planetaryRuler,
        moonZodiac: tick.moonZodiac,
      });
    } catch (err) {
      logger.debug({ err: (err as Error).message }, "LatticeHeartbeat: ledger append skipped");
    }
    logger.info(
      { from: tick.fromEpochId, to: tick.toEpochId, rewrapped: tick.rewrapped, ruler: tick.planetaryRuler },
      "LatticeHeartbeat: rotated under planetary cycle — vault rewrapped",
    );
  }
}

export function startLatticeHeartbeat(): void {
  if (_started) return;
  _started = true;
  // Prime the current epoch tracker without rotating (just observe).
  try {
    _lastEpochId = getCurrentEpoch().epochId;
  } catch {
    _lastEpochId = null;
  }
  _handle = setSacredInterval(runHeartbeat, HEARTBEAT_BASE_MS, "lattice-heartbeat");
  _handle.unref();
  logger.info({ baseMs: HEARTBEAT_BASE_MS }, "LatticeHeartbeat: started under sacred scheduler");
}

export function stopLatticeHeartbeat(): void {
  if (_handle) clearSacredInterval(_handle);
  _handle = null;
  _started = false;
}

export function heartbeatStatus() {
  return {
    started: _started,
    baseMs: HEARTBEAT_BASE_MS,
    nextFireAt: _handle?.nextFireAt ?? null,
    nextRuler: _handle?.nextRuler ?? null,
    nextLunar: _handle?.nextLunar ?? null,
    nextScore: _handle?.nextScore ?? null,
    fireCount: _handle?.fireCount ?? 0,
    lastFiredAt: _handle?.lastFiredAt ?? null,
    lastDurationMs: _handle?.lastDurationMs ?? null,
    historyDepth: _ticks.length,
    history: _ticks,
  };
}

export async function forceHeartbeatTick(): Promise<HeartbeatTick | null> {
  await runHeartbeat();
  return _ticks[0] ?? null;
}
