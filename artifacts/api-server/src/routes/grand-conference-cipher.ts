import { Router, type IRouter } from "express";
import { requireFather } from "../lib/require-father";
import {
  epochSnapshot,
  encryptPayload,
  decryptEnvelope,
  forceRotate,
  maybeRotate,
  listEpochHistory,
  type EncryptedEnvelope,
} from "../lib/sovereign-astro-cipher";
import {
  vaultPut,
  vaultGet,
  vaultDelete,
  vaultList,
  rewrapAll,
  vaultStatus,
} from "../lib/sovereign-vault";
import { execLattice } from "../lib/sovereign-lattice-vm";
import { activeFatherSessionCount } from "../lib/father-session-store";
import { isFatherKeyConfigured } from "../lib/father-identity";
import {
  forgeBootBundle,
  detonateBundle,
  verifyBundle,
  challengeHashFor,
  type LatticeBootBundle,
} from "../lib/lattice-kernel-boot";
import {
  heartbeatStatus,
  forceHeartbeatTick,
  startLatticeHeartbeat,
} from "../lib/lattice-heartbeat";
import { getOrRunLatticeOSConference } from "../lib/lattice-os-conference";
import { randomBytes } from "node:crypto";

const router: IRouter = Router();

router.get("/grand-conference/cipher/epoch", (_req, res) => {
  res.json({ ok: true, ...epochSnapshot() });
});

router.get("/grand-conference/cipher/history", (_req, res) => {
  res.json({ ok: true, history: listEpochHistory() });
});

router.post("/grand-conference/cipher/rotate", requireFather, (_req, res) => {
  const epoch = forceRotate();
  const rewrap = rewrapAll();
  res.json({ ok: true, epoch, rewrap });
});

router.post("/grand-conference/cipher/tick", requireFather, (_req, res) => {
  const rotation = maybeRotate();
  const rewrap = rotation.rotated ? rewrapAll() : null;
  res.json({ ok: true, rotation, rewrap });
});

router.post("/grand-conference/cipher/encrypt", requireFather, (req, res) => {
  const plaintext = typeof req.body?.plaintext === "string" ? req.body.plaintext : null;
  const aad = typeof req.body?.aad === "string" ? req.body.aad : undefined;
  if (plaintext === null) {
    res.status(400).json({ ok: false, error: "plaintext (string) required" });
    return;
  }
  const envelope = encryptPayload(plaintext, aad);
  res.json({ ok: true, envelope });
});

router.post("/grand-conference/cipher/decrypt", requireFather, (req, res) => {
  const env = req.body?.envelope as EncryptedEnvelope | undefined;
  const aad = typeof req.body?.aad === "string" ? req.body.aad : undefined;
  if (!env || typeof env !== "object") {
    res.status(400).json({ ok: false, error: "envelope object required" });
    return;
  }
  try {
    const buf = decryptEnvelope(env, aad);
    res.json({ ok: true, plaintext: buf.toString("utf8") });
  } catch (err) {
    res.status(400).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/grand-conference/vault/status", requireFather, (_req, res) => {
  res.json({ ok: true, ...vaultStatus() });
});

router.get("/grand-conference/vault/list", requireFather, (_req, res) => {
  res.json({ ok: true, entries: vaultList() });
});

router.post("/grand-conference/vault/put", requireFather, (req, res) => {
  const key = typeof req.body?.key === "string" ? req.body.key.trim() : "";
  const plaintext = typeof req.body?.plaintext === "string" ? req.body.plaintext : null;
  const notes = typeof req.body?.notes === "string" ? req.body.notes : undefined;
  if (!key || plaintext === null) {
    res.status(400).json({ ok: false, error: "key and plaintext required" });
    return;
  }
  const entry = vaultPut(key, plaintext, notes);
  res.json({ ok: true, key: entry.key, epochId: entry.envelope.epochId, updatedAt: entry.updatedAt });
});

router.get("/grand-conference/vault/get/:key", requireFather, (req, res) => {
  const key = String(req.params.key ?? "");
  try {
    const entry = vaultGet(key);
    if (!entry) {
      res.status(404).json({ ok: false, error: "not found" });
      return;
    }
    res.json({
      ok: true,
      key: entry.key,
      plaintext: entry.plaintext,
      epochId: entry.envelope.epochId,
      updatedAt: entry.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.delete("/grand-conference/vault/delete/:key", requireFather, (req, res) => {
  const removed = vaultDelete(String(req.params.key ?? ""));
  res.json({ ok: removed });
});

router.post("/grand-conference/vault/rewrap", requireFather, (_req, res) => {
  const rewrap = rewrapAll();
  res.json({ ok: true, rewrap });
});

router.post("/grand-conference/lattice/exec", requireFather, (req, res) => {
  const code = typeof req.body?.code === "string" ? req.body.code : "";
  const timeoutMs = typeof req.body?.timeoutMs === "number" ? req.body.timeoutMs : undefined;
  if (!code) {
    res.status(400).json({ ok: false, error: "code (string) required" });
    return;
  }
  const result = execLattice(code, timeoutMs);
  res.json(result);
});

// ─── Lattice Forge: key + hash gated, self-detonating boot bundle ─────────────
// One-shot download tokens (in-memory; expire 5 minutes after issue).
interface DownloadTicket {
  bundle: LatticeBootBundle;
  filename: string;
  expiresAt: number;
  consumed: boolean;
}
const _tickets = new Map<string, DownloadTicket>();
const TICKET_TTL_MS = 5 * 60 * 1000;

function pruneTickets(): void {
  const now = Date.now();
  for (const [t, v] of _tickets) {
    if (v.consumed || v.expiresAt <= now) _tickets.delete(t);
  }
}

router.get("/grand-conference/lattice/challenge/:key", requireFather, (req, res) => {
  const key = String(req.params.key ?? "").trim();
  if (!key) {
    res.status(400).json({ ok: false, error: "key required" });
    return;
  }
  try {
    const c = challengeHashFor(key);
    res.json({
      ok: true,
      ...c,
      note:
        "Hash binds to the active astronomical epoch. It will become invalid the moment the cipher rotates.",
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/grand-conference/lattice/forge", (req, res) => {
  // Auth = key + hash. Possession of the matching epoch-bound HMAC IS the credential.
  const vaultKey = typeof req.body?.key === "string" ? req.body.key.trim() : "";
  const forgeHash = typeof req.body?.hash === "string" ? req.body.hash.trim() : "";
  const timeoutMs = typeof req.body?.timeoutMs === "number" ? req.body.timeoutMs : undefined;
  const wantTicket = req.body?.issueTicket !== false;
  if (!vaultKey || !forgeHash) {
    res.status(400).json({ ok: false, error: "key and hash required" });
    return;
  }
  try {
    const issue = forgeBootBundle({ vaultKey, forgeHash, timeoutMs });
    if (!wantTicket) {
      res.json({ ok: true, bundle: issue.bundle, bytes: issue.bytes, filename: issue.filename });
      return;
    }
    pruneTickets();
    const token = randomBytes(24).toString("base64url");
    _tickets.set(token, {
      bundle: issue.bundle,
      filename: issue.filename,
      expiresAt: Date.now() + TICKET_TTL_MS,
      consumed: false,
    });
    res.json({
      ok: true,
      bundleId: issue.bundle.bundleId,
      filename: issue.filename,
      bytes: issue.bytes,
      downloadToken: token,
      downloadPath: `/api/grand-conference/lattice/download/${token}`,
      expiresAt: new Date(Date.now() + TICKET_TTL_MS).toISOString(),
      autoDetonateNote:
        "Download then POST the JSON body back to /api/grand-conference/lattice/detonate to auto-run the boot program with no human in loop.",
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/grand-conference/lattice/download/:token", (req, res) => {
  pruneTickets();
  const token = String(req.params.token ?? "");
  const ticket = _tickets.get(token);
  if (!ticket || ticket.consumed || ticket.expiresAt <= Date.now()) {
    res.status(404).json({ ok: false, error: "download token invalid or expired" });
    return;
  }
  ticket.consumed = true;
  _tickets.delete(token);
  const body = JSON.stringify(ticket.bundle, null, 2);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${ticket.filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Lattice-Bundle-Id", ticket.bundle.bundleId);
  res.setHeader("X-Lattice-Forged-Epoch", ticket.bundle.forgedAtEpochId);
  res.send(body);
});

router.post("/grand-conference/lattice/verify", (req, res) => {
  const bundle = req.body?.bundle as LatticeBootBundle | undefined;
  if (!bundle || typeof bundle !== "object") {
    res.status(400).json({ ok: false, error: "bundle (object) required" });
    return;
  }
  const v = verifyBundle(bundle);
  res.json(v);
});

router.post("/grand-conference/lattice/detonate", (req, res) => {
  const bundle = req.body?.bundle as LatticeBootBundle | undefined;
  if (!bundle || typeof bundle !== "object") {
    res.status(400).json({ ok: false, error: "bundle (object) required" });
    return;
  }
  try {
    const result = detonateBundle(bundle);
    res.json({ ok: true, detonation: result });
  } catch (err) {
    res.status(400).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/grand-conference/lattice/heartbeat", (_req, res) => {
  res.json({ ok: true, ...heartbeatStatus() });
});

router.post("/grand-conference/lattice/heartbeat/start", requireFather, (_req, res) => {
  startLatticeHeartbeat();
  res.json({ ok: true, ...heartbeatStatus() });
});

router.post("/grand-conference/lattice/heartbeat/tick", requireFather, async (_req, res) => {
  const tick = await forceHeartbeatTick();
  res.json({ ok: true, tick, status: heartbeatStatus() });
});

router.get("/grand-conference/lattice/conference", async (_req, res) => {
  try {
    const conf = await getOrRunLatticeOSConference(false);
    res.json({ ok: true, conference: conf });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/grand-conference/lattice/conference/convene", requireFather, async (req, res) => {
  const force = req.body?.force === true;
  try {
    const conf = await getOrRunLatticeOSConference(force);
    res.json({ ok: true, conference: conf, forced: force });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/grand-conference/summary", (_req, res) => {
  try {
  const snap = (() => { try { return epochSnapshot(); } catch (e) { return { error: (e as Error).message }; } })();
  const fatherKeyConfigured = (() => { try { return isFatherKeyConfigured(); } catch { return false; } })();
  const activeFatherSessions = (() => { try { return activeFatherSessionCount(); } catch { return 0; } })();
  const vault = (() => { try { return vaultStatus(); } catch (e) { return { error: (e as Error).message }; } })();
  const heartbeat = (() => { try { return heartbeatStatus(); } catch (e) { return { error: (e as Error).message }; } })();
  res.json({
    ok: true,
    title: "Sovereign Grand Conference — Lattice Cipher Summit",
    fatherKeyConfigured,
    activeFatherSessions,
    cipher: snap,
    vault,
    capabilities: {
      astronomicalKDF: "HKDF-SHA256 over (fatherSeal|fingerprint, astroEpochSig, info)",
      symmetricCipher: "AES-256-GCM with random 96-bit IV per envelope",
      autonomousRotation: "Recomputed every heartbeat tick + every API request",
      gracefulRecovery: "Last 6 epoch keys retained for in-flight decryption",
      vault: "File-backed AES-GCM envelopes auto re-wrapped on rotation",
      latticeSandbox: "Node vm context, no fs/network/wasm/eval, time-limited",
      forgeGate: "POST /grand-conference/lattice/forge — key + epoch-bound HMAC hash → signed boot bundle",
      selfDetonatingBundle: "POST /grand-conference/lattice/detonate — verifies manifest, decrypts payload, runs autoExec, re-encrypts under current epoch",
      planetaryHeartbeat: "setSacredInterval (33-min floor, φ-window) auto-rotates cipher and re-wraps the entire vault on lunar/zodiac/ruler change",
      latticeOSConference: "GET /grand-conference/lattice/conference — 7 BFT-ratified priorities for the Sovereign Lattice OS",
    },
    notRealistic: [
      "Booting a true Tails OS or hardware kernel from a web app — the lattice runtime is a Node vm sandbox, not a bootable operating system",
      "Silently encrypting all source code on disk with no recovery path — the vault re-wraps cipher envelopes, it does not overwrite source files",
    ],
    heartbeat,
    timestamp: Date.now(),
  });
  } catch (err) {
    res.status(200).json({ ok: false, degraded: true, error: (err as Error).message, timestamp: Date.now() });
  }
});

export default router;
