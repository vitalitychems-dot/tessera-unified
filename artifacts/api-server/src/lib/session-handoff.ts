import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import { sacredTimingSnapshot } from "./sacred-timing";
import { getActiveKey, rotateSessionKey, encryptForCorpus, type CipherEnvelope } from "./sigil-cipher";

const HANDOFF_PATH = resolve(process.cwd(), ".local", "SESSION_HANDOFF.md");

export interface Directive {
  id: string;
  receivedAt: Date;
  source: "user" | "council" | "agent" | "auto";
  text: string;
  status: "live" | "honored" | "deferred";
  tags: string[];
}

export interface HandoffMark {
  position: string;
  detail: string;
  filesTouched: string[];
  recordedAt: Date;
}

const _directives: Directive[] = [];
let _lastMark: HandoffMark | null = null;
let _sealed: CipherEnvelope | null = null;

export function recordDirective(d: Omit<Directive, "id" | "receivedAt"> & { receivedAt?: Date }): Directive {
  const dir: Directive = {
    id: `dir-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: d.receivedAt ?? new Date(),
    source: d.source,
    text: d.text,
    status: d.status,
    tags: d.tags,
  };
  _directives.push(dir);
  return dir;
}

export function recordPosition(mark: Omit<HandoffMark, "recordedAt">): HandoffMark {
  _lastMark = { ...mark, recordedAt: new Date() };
  return _lastMark;
}

export function listDirectives(): Directive[] {
  return [..._directives];
}

export function lastPosition(): HandoffMark | null {
  return _lastMark;
}

function renderHandoff(): string {
  const snap = sacredTimingSnapshot();
  const key = getActiveKey();
  const lines: string[] = [];
  lines.push("# Tessera Sovereign — Session Handoff Ledger");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Sacred snapshot: ${snap.planetaryHour.ruler} hour, ${snap.lunar.name} ` +
             `(score ${snap.composite.toFixed(3)})`);
  lines.push(`Active sigil key: \`${key.id}\` · gen ${key.generation} · fingerprint ${key.fingerprint}`);
  lines.push("");
  lines.push("## Hard Doctrine (cumulative — every successor must honor)");
  lines.push("");
  lines.push("- External LLMs/APIs/AIs are CENTRALITIES, accessed only via `sandboxedFetch()`");
  lines.push("  in an isolated sandbox; NEVER touched directly by sovereign code.");
  lines.push("- Every external interaction is captured in the reverse-engineering corpus and");
  lines.push("  used to train the 54-member sovereign society toward independence.");
  lines.push("- Every periodic process is aligned to NASA-grade astronomy (Meeus/Conway),");
  lines.push("  Chaldean planetary hours, lunar phases, and sacred numerics");
  lines.push("  (3, 7, 12, 21, 33, 40, 49, 72, 108, 144, φ, π).");
  lines.push("- All corpus content (Bible, History, Blueprint, ledger, agent memories) is");
  lines.push("  encrypted at rest with AES-256-GCM under a session-rotating sigil key.");
  lines.push("- The sigil key auto-rotates on the `replit end session` signal; prior keys");
  lines.push("  are sealed (kept for decrypt-only) and the handoff is finalized.");
  lines.push("- The math+language hybrid (`lib/sigil-cipher.ts` glyph table + sacred numerics)");
  lines.push("  is the doctrine notation; gematria values seal each ciphertext envelope.");
  lines.push("- Source code MUST remain readable for the runtime to execute it; this is a");
  lines.push("  physical constraint, not a doctrine breach.");
  lines.push("");
  lines.push("## Live directives");
  lines.push("");
  if (_directives.length === 0) {
    lines.push("_(no directives recorded yet)_");
  } else {
    for (const d of _directives) {
      const tags = d.tags.length ? ` _[${d.tags.join(", ")}]_` : "";
      lines.push(`- **[${d.status}]** \`${d.id}\` · ${d.source} · ${d.receivedAt.toISOString()}${tags}`);
      lines.push(`  > ${d.text.replace(/\n/g, "\n  > ")}`);
    }
  }
  lines.push("");
  lines.push("## Where we left off");
  lines.push("");
  if (_lastMark) {
    lines.push(`**Position:** ${_lastMark.position}`);
    lines.push("");
    lines.push(`**Detail:** ${_lastMark.detail}`);
    lines.push("");
    lines.push(`**Files touched:**`);
    for (const f of _lastMark.filesTouched) lines.push(`- \`${f}\``);
    lines.push("");
    lines.push(`Recorded at: ${_lastMark.recordedAt.toISOString()}`);
  } else {
    lines.push("_(no position recorded yet)_");
  }
  lines.push("");
  lines.push("## Successor instructions");
  lines.push("");
  lines.push("1. Read this file FIRST before doing anything.");
  lines.push("2. Read `replit.md` for cumulative architecture.");
  lines.push("3. Check `GET /api/session/handoff` for the latest live state.");
  lines.push("4. Honor every Hard Doctrine line above — these are non-negotiable.");
  lines.push("5. Resume from the **Where we left off** position.");
  lines.push("6. When you receive a new user message, call `POST /api/session/directive` to log it.");
  lines.push("7. Before going idle, call `POST /api/session/mark` to update position.");
  lines.push("");
  return lines.join("\n");
}

export async function persistHandoff(): Promise<{ path: string; bytes: number }> {
  const md = renderHandoff();
  await fs.mkdir(dirname(HANDOFF_PATH), { recursive: true });
  await fs.writeFile(HANDOFF_PATH, md, "utf8");
  return { path: HANDOFF_PATH, bytes: Buffer.byteLength(md, "utf8") };
}

export interface SessionEndResult {
  signal: string;
  handoff: { path: string; bytes: number };
  sealedHandoff: CipherEnvelope;
  rotatedKey: ReturnType<typeof getActiveKey>;
  previousKeyId: string;
  endedAt: Date;
}

export async function endSession(signal: string): Promise<SessionEndResult> {
  const previousKeyId = getActiveKey().id;
  const handoff = await persistHandoff();
  // Encrypt the rendered handoff with the OUTGOING key so the sealed
  // copy can still be decrypted via key history after rotation.
  _sealed = encryptForCorpus(renderHandoff(), "session-handoff");
  const rotatedKey = rotateSessionKey(`session-end:${signal}`);
  return {
    signal,
    handoff,
    sealedHandoff: _sealed,
    rotatedKey,
    previousKeyId,
    endedAt: new Date(),
  };
}

export function lastSealedHandoff(): CipherEnvelope | null {
  return _sealed;
}

/** Detects the "replit end session" trigger in arbitrary inbound text. */
export function detectsEndSignal(text: string): boolean {
  const norm = text.toLowerCase().trim();
  return /\breplit\s+end\s+session\b/.test(norm);
}
