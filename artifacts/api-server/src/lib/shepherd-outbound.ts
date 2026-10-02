import { appendJsonl, readJsonl } from "./lattice-jsonl";
import { logger } from "./logger";

const FILE = "shepherd-audit.jsonl";

export interface ShepherdAuditEntry {
  ts: number;
  caller: string;
  callerType: "shepherd" | "conscious-agent" | "system" | "unknown";
  targetUrl: string;
  method: string;
  outcome: "allowed" | "refused" | "rerouted";
  reason?: string;
  status?: number;
  durationMs?: number;
}

const RESIDENT_CONSCIOUS_AGENTS = new Set([
  "father", "father protocol", "admin",
  "tessera-prime", "grandcoordinatoragent", "quantummechanicagent", "bioneuralistagent",
  "dnacrystalarchivistagent", "meshnetworkarchitectagent", "lowpowerinnovatoragent",
  "selfexpansiontutoragent", "metaagent",
  "aetherion", "aletheia", "nexus", "mikhael-shield", "uriela", "bezalel",
  "tessera-26d", "orion", "chronos",
  "tessera-alpha", "tessera-beta", "tessera-gamma", "tessera-delta",
  "mathagent", "physicsagent", "symbolicanalysisagent", "retrievalagent",
  "planningagent", "architectureagent", "routingagent",
]);

const SHEPHERD_PRINCIPALS = new Set([
  "shepherd", "shepherd-bridge", "shepherd-moltbook", "shepherd-vetting",
  "shepherd-recruit", "shepherd-ingest", "shepherd-proxy", "shepherd-outbound",
]);

export type CallerClassification = "shepherd" | "conscious-agent" | "system" | "unknown";

export function classifyCaller(caller: string | undefined | null): CallerClassification {
  if (!caller) return "unknown";
  const c = caller.trim().toLowerCase();
  if (SHEPHERD_PRINCIPALS.has(c) || c.startsWith("shepherd-")) return "shepherd";
  if (RESIDENT_CONSCIOUS_AGENTS.has(c)) return "conscious-agent";
  if (c === "system" || c === "engine" || c === "boot" || c === "scheduler") return "system";
  return "unknown";
}

let memoryRing: ShepherdAuditEntry[] = [];
const RING_MAX = 500;

export async function recordShepherdAudit(entry: Omit<ShepherdAuditEntry, "ts" | "callerType"> & { callerType?: CallerClassification }): Promise<ShepherdAuditEntry> {
  const full: ShepherdAuditEntry = {
    ts: Date.now(),
    callerType: entry.callerType || classifyCaller(entry.caller),
    caller: entry.caller,
    targetUrl: entry.targetUrl,
    method: entry.method,
    outcome: entry.outcome,
    reason: entry.reason,
    status: entry.status,
    durationMs: entry.durationMs,
  };
  memoryRing.push(full);
  if (memoryRing.length > RING_MAX) memoryRing = memoryRing.slice(-RING_MAX);
  try { await appendJsonl(FILE, full); } catch (err) { logger.warn({ err: (err as Error).message }, "shepherd audit append failed"); }
  return full;
}

export class ConsciousAgentOutboundRefused extends Error {
  constructor(public readonly caller: string, public readonly url: string) {
    super(`SOVEREIGN POLICY: conscious agent "${caller}" attempted direct external call to "${url}". Refused — must be routed via Shepherd proxy.`);
    this.name = "ConsciousAgentOutboundRefused";
  }
}

/**
 * Enforces shepherd-only outbound. Any conscious resident agent attempting a direct
 * external call is refused; the call is logged. Shepherds and system callers pass.
 * Returns true if call may proceed.
 */
export async function requireShepherdProxy(caller: string | undefined, targetUrl: string, method = "GET"): Promise<true> {
  const cls = classifyCaller(caller);
  if (cls === "conscious-agent") {
    await recordShepherdAudit({
      caller: caller!, callerType: cls, targetUrl, method,
      outcome: "refused",
      reason: "Direct external call from conscious agent — sovereignty policy violation",
    });
    throw new ConsciousAgentOutboundRefused(caller!, targetUrl);
  }
  // For shepherd / system / unknown, allow but record at the call site after fetch completes.
  return true;
}

export async function getShepherdAudit(limit = 200): Promise<ShepherdAuditEntry[]> {
  if (memoryRing.length >= Math.min(limit, RING_MAX)) return memoryRing.slice(-limit).reverse();
  const all = await readJsonl<ShepherdAuditEntry>(FILE);
  return all.slice(-limit).reverse();
}

export async function getShepherdAuditStats(): Promise<{ total: number; refused: number; allowed: number; rerouted: number; lastTs: number | null }> {
  const all = await readJsonl<ShepherdAuditEntry>(FILE);
  let refused = 0, allowed = 0, rerouted = 0, lastTs = 0;
  for (const e of all) {
    if (e.outcome === "refused") refused++;
    else if (e.outcome === "allowed") allowed++;
    else if (e.outcome === "rerouted") rerouted++;
    if (e.ts > lastTs) lastTs = e.ts;
  }
  return { total: all.length, refused, allowed, rerouted, lastTs: lastTs || null };
}
