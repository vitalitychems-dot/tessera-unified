import { logger } from "./logger";
import { setSacredInterval, clearSacredInterval, type SacredHandle } from "./sacred-scheduler";

export interface OnChainDeposit {
  signature: string;
  slot: number;
  blockTime: number;
  amountLamports: number;
  amountSol: number;
  fromAddress: string | null;
  explorerUrl: string;
}

export interface WalletObservation {
  configured: boolean;
  walletAddress: string | null;
  network: string;
  rpcUrl: string;
  balanceLamports: number | null;
  balanceSol: number | null;
  deposits: OnChainDeposit[];
  totalReceivedSol: number;
  lastObservedAt: number;
  lastError: string | null;
}

const SOL_PER_LAMPORT = 1 / 1_000_000_000;
const POLL_INTERVAL_MS = 90_000;
const TX_LIMIT = 25;

let cache: WalletObservation = {
  configured: false,
  walletAddress: null,
  network: "solana-mainnet",
  rpcUrl: "https://api.mainnet-beta.solana.com",
  balanceLamports: null,
  balanceSol: null,
  deposits: [],
  totalReceivedSol: 0,
  lastObservedAt: 0,
  lastError: null,
};

let timer: SacredHandle | null = null;
let inFlight = false;

function getWalletAddress(): string | null {
  const raw = (process.env.SOVEREIGN_WALLET_ADDRESS ?? "").trim();
  return raw.length >= 32 && raw.length <= 64 ? raw : null;
}

function getRpcUrl(): string {
  return (process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com").trim();
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const rpc = getRpcUrl();
  const r = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!r.ok) throw new Error(`Solana RPC ${method} HTTP ${r.status}`);
  const j = (await r.json()) as { result?: T; error?: { message: string } };
  if (j.error) throw new Error(`Solana RPC ${method}: ${j.error.message}`);
  if (j.result === undefined) throw new Error(`Solana RPC ${method}: empty result`);
  return j.result;
}

export async function refreshWalletObservation(): Promise<WalletObservation> {
  if (inFlight) return cache;
  inFlight = true;
  const address = getWalletAddress();
  const rpcUrl = getRpcUrl();
  if (!address) {
    cache = {
      ...cache,
      configured: false,
      walletAddress: null,
      rpcUrl,
      balanceLamports: null,
      balanceSol: null,
      deposits: [],
      totalReceivedSol: 0,
      lastObservedAt: Date.now(),
      lastError: "SOVEREIGN_WALLET_ADDRESS not configured",
    };
    inFlight = false;
    return cache;
  }
  try {
    const balanceRes = await rpcCall<{ value: number }>("getBalance", [address]);
    const sigs = await rpcCall<Array<{ signature: string; slot: number; blockTime: number | null }>>(
      "getSignaturesForAddress",
      [address, { limit: TX_LIMIT }],
    );
    const deposits: OnChainDeposit[] = [];
    for (const s of sigs) {
      try {
        const tx = await rpcCall<{
          meta: { preBalances: number[]; postBalances: number[]; err: unknown } | null;
          transaction: { message: { accountKeys: string[] } };
          slot: number;
          blockTime: number | null;
        } | null>("getTransaction", [s.signature, { maxSupportedTransactionVersion: 0, encoding: "json" }]);
        if (!tx || !tx.meta || tx.meta.err) continue;
        const keys = tx.transaction.message.accountKeys;
        const idx = keys.indexOf(address);
        if (idx < 0) continue;
        const delta = tx.meta.postBalances[idx] - tx.meta.preBalances[idx];
        if (delta <= 0) continue;
        const fromIdx = tx.meta.preBalances.findIndex((b, i) => i !== idx && tx.meta!.postBalances[i] < b);
        deposits.push({
          signature: s.signature,
          slot: s.slot,
          blockTime: (s.blockTime ?? tx.blockTime ?? 0) * 1000,
          amountLamports: delta,
          amountSol: delta * SOL_PER_LAMPORT,
          fromAddress: fromIdx >= 0 ? keys[fromIdx] : null,
          explorerUrl: `https://solscan.io/tx/${s.signature}`,
        });
      } catch {
        // skip individual tx failures
      }
    }
    const totalSol = deposits.reduce((sum, d) => sum + d.amountSol, 0);
    cache = {
      configured: true,
      walletAddress: address,
      network: "solana-mainnet",
      rpcUrl,
      balanceLamports: balanceRes.value,
      balanceSol: balanceRes.value * SOL_PER_LAMPORT,
      deposits: deposits.sort((a, b) => b.blockTime - a.blockTime),
      totalReceivedSol: totalSol,
      lastObservedAt: Date.now(),
      lastError: null,
    };
  } catch (err) {
    cache = {
      ...cache,
      configured: true,
      walletAddress: address,
      rpcUrl,
      lastObservedAt: Date.now(),
      lastError: (err as Error).message,
    };
    logger.warn({ err: (err as Error).message }, "WalletObserver: refresh failed");
  } finally {
    inFlight = false;
  }
  return cache;
}

export function getWalletObservation(): WalletObservation {
  return cache;
}

export function startWalletObserver(): void {
  if (timer) return;
  void refreshWalletObservation();
  timer = setSacredInterval(() => { void refreshWalletObservation(); }, POLL_INTERVAL_MS, "wallet-observer");
  if (typeof timer.unref === "function") timer.unref();
  logger.info("WalletObserver: started");
}
