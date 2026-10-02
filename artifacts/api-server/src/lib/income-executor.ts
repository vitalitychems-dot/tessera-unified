import { logger } from "./logger";
import { getWalletObservation, refreshWalletObservation } from "./wallet-observer";
import { loadJson, saveJson } from "./disk-persistence";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export interface IncomeSnapshot {
  ts: number;
  network: string;
  balanceSol: number | null;
  totalReceivedSol: number;
  depositCount: number;
  newDepositSignatures: string[];
}

const SNAPSHOT_FILE = "income-snapshots.json";
const MAX_SNAPSHOTS = 720;
const TICK_MS = 60 * 60 * 1000;

let snapshots: IncomeSnapshot[] = [];
let loaded = false;
let timer: SacredHandle | null = null;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;
  snapshots = await loadJson<IncomeSnapshot[]>(SNAPSHOT_FILE, []);
}

async function tick(): Promise<void> {
  await ensureLoaded();
  try {
    await refreshWalletObservation();
    const obs = getWalletObservation();
    const lastSigs = new Set(snapshots[snapshots.length - 1]?.newDepositSignatures ?? []);
    const knownSigs = new Set(snapshots.flatMap(s => s.newDepositSignatures));
    const newSigs = obs.deposits.filter(d => !knownSigs.has(d.signature)).map(d => d.signature);
    const snap: IncomeSnapshot = {
      ts: Date.now(),
      network: obs.network,
      balanceSol: obs.balanceSol,
      totalReceivedSol: obs.totalReceivedSol,
      depositCount: obs.deposits.length,
      newDepositSignatures: newSigs,
    };
    snapshots.push(snap);
    if (snapshots.length > MAX_SNAPSHOTS) snapshots = snapshots.slice(-MAX_SNAPSHOTS);
    saveJson(SNAPSHOT_FILE, snapshots);
    if (newSigs.length > 0) {
      logger.info({ newSigs: newSigs.length, balanceSol: obs.balanceSol }, "income-executor: new deposits observed");
    }
    void lastSigs;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "income-executor: tick failed");
  }
}

export function startIncomeExecutor(): void {
  if (timer) return;
  void tick();
  timer = setSacredInterval(() => { void tick(); }, TICK_MS, "income-executor");
  if (typeof timer.unref === "function") timer.unref();
}

export function getIncomeSnapshots(): IncomeSnapshot[] { return [...snapshots]; }
