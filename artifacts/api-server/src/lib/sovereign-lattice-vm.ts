import vm from "node:vm";
import { performance } from "node:perf_hooks";
import { getCurrentEpoch, macForEpoch } from "./sovereign-astro-cipher";

const DEFAULT_TIMEOUT_MS = 250;
const DEFAULT_MEM_BYTES = 4 * 1024 * 1024;

export interface LatticeExecResult {
  ok: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
  outputLength: number;
  truncated: boolean;
  epochId: string;
  epochHash: string;
  mac: string;
  logs: string[];
}

function buildLattice(logs: string[]) {
  const epoch = getCurrentEpoch();
  return Object.freeze({
    epoch: Object.freeze({ ...epoch }),
    log: (...args: unknown[]) => {
      if (logs.length >= 64) return;
      const line = args.map((a) => (typeof a === "string" ? a : safeStringify(a))).join(" ");
      logs.push(line.length > 512 ? line.slice(0, 512) + "…[truncated]" : line);
    },
    mac: (msg: string) => macForEpoch(String(msg)),
    now: () => Date.now(),
    math: Object.freeze({
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      sqrt: Math.sqrt,
      pow: Math.pow,
      pi: Math.PI,
      tau: Math.PI * 2,
      phi: (1 + Math.sqrt(5)) / 2,
    }),
  });
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function execLattice(code: string, timeoutMs = DEFAULT_TIMEOUT_MS): LatticeExecResult {
  const epoch = getCurrentEpoch();
  const logs: string[] = [];
  const start = performance.now();
  if (typeof code !== "string") {
    return failure("code must be a string", logs, start, epoch);
  }
  if (code.length > DEFAULT_MEM_BYTES) {
    return failure("code exceeds size limit", logs, start, epoch);
  }
  const sandbox = {
    lattice: buildLattice(logs),
    result: undefined as unknown,
  };
  const context = vm.createContext(sandbox, {
    name: `lattice-${epoch.epochId}`,
    codeGeneration: { strings: false, wasm: false },
  });
  const wrapped = `result = (function () { 'use strict'; ${code}\n })();`;
  let script: vm.Script;
  try {
    script = new vm.Script(wrapped, { filename: `lattice-${epoch.epochId}.js`, lineOffset: 0 });
  } catch (err) {
    return failure(`compile error: ${(err as Error).message}`, logs, start, epoch);
  }
  try {
    script.runInContext(context, { timeout: Math.min(timeoutMs, 2000), breakOnSigint: true });
  } catch (err) {
    return failure((err as Error).message, logs, start, epoch);
  }
  const durationMs = performance.now() - start;
  const out = sandbox.result;
  const serialized = safeStringify(out ?? null);
  const truncated = serialized.length > 16_384;
  const finalOut = truncated ? serialized.slice(0, 16_384) : serialized;
  const mac = macForEpoch(finalOut).mac;
  return {
    ok: true,
    result: truncated ? finalOut : out,
    durationMs: Math.round(durationMs * 100) / 100,
    outputLength: serialized.length,
    truncated,
    epochId: epoch.epochId,
    epochHash: epoch.epochHash,
    mac,
    logs,
  };
}

function failure(error: string, logs: string[], start: number, epoch: ReturnType<typeof getCurrentEpoch>): LatticeExecResult {
  return {
    ok: false,
    error,
    durationMs: Math.round((performance.now() - start) * 100) / 100,
    outputLength: 0,
    truncated: false,
    epochId: epoch.epochId,
    epochHash: epoch.epochHash,
    mac: macForEpoch(error).mac,
    logs,
  };
}
