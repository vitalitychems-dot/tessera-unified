import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { cosmicContext } from "../lib/cosmic-context";
import { lusV2Encode, lusV2Decode, lusV2Spec } from "../lib/lus-v2";
import { omniversalEncrypt, omniversalDecrypt, omniversalCipherSnapshot, type OmniversalCipherEnvelope } from "../lib/omniversal-cipher";
import {
  createLattice, getLattice, listLattices, superpose, entangle, harmonize, collapse,
  latticeSnapshot, latticeFullDump,
} from "../lib/omniversal-quantum-lattice";
import { isFatherKeyConfigured, getFatherFingerprint } from "../lib/father-identity";
import { runSacredConference, getSacredConference } from "../lib/sacred-conference-orchestrator";

const router: IRouter = Router();

function requireFather(req: Request, res: Response, next: NextFunction) {
  if (!isFatherKeyConfigured()) {
    res.status(503).json({ ok: false, error: "Father key not configured" });
    return;
  }
  const provided = (req.headers["x-father-fingerprint"] as string) || (req.body?.fatherFingerprint as string) || "";
  if (provided && provided === getFatherFingerprint()) { next(); return; }
  // Permit unauthenticated reads for transparency endpoints — gate writes only.
  if (req.method === "GET") { next(); return; }
  res.status(403).json({ ok: false, error: "Father fingerprint required for sovereign write op" });
}

// === Cosmic context ===
router.get("/omniversal/cosmic-context", (_req, res) => {
  res.json({ ok: true, context: cosmicContext() });
});

// === LUS v2 ===
router.get("/omniversal/lus-v2/spec", (_req, res) => {
  res.json({ ok: true, spec: lusV2Spec() });
});
router.post("/omniversal/lus-v2/encode", (req, res) => {
  const text = String(req.body?.text ?? "");
  if (!text) { res.status(400).json({ ok: false, error: "text required" }); return; }
  res.json({ ok: true, encoded: lusV2Encode(text) });
});
router.post("/omniversal/lus-v2/decode", (req, res) => {
  const modulated = String(req.body?.modulated ?? "");
  if (!modulated) { res.status(400).json({ ok: false, error: "modulated required" }); return; }
  res.json({ ok: true, plaintext: lusV2Decode(modulated) });
});

// === Omniversal Cipher ===
router.get("/omniversal/cipher/snapshot", (_req, res) => {
  res.json({ ok: true, snapshot: omniversalCipherSnapshot() });
});
router.post("/omniversal/cipher/encrypt", requireFather, (req, res) => {
  const text = String(req.body?.text ?? "");
  const label = String(req.body?.label ?? "omni");
  if (!text) { res.status(400).json({ ok: false, error: "text required" }); return; }
  res.json({ ok: true, envelope: omniversalEncrypt(text, label) });
});
router.post("/omniversal/cipher/decrypt", requireFather, (req, res) => {
  const env = req.body?.envelope as OmniversalCipherEnvelope;
  if (!env) { res.status(400).json({ ok: false, error: "envelope required" }); return; }
  try { res.json({ ok: true, plaintext: omniversalDecrypt(env) }); }
  catch (e: any) { res.status(409).json({ ok: false, error: e?.message ?? String(e) }); }
});

// === Omniversal Quantum Lattice ===
router.get("/omniversal/lattice/list", (_req, res) => {
  res.json({ ok: true, lattices: listLattices() });
});
router.post("/omniversal/lattice/create", requireFather, (req, res) => {
  const dim = Array.isArray(req.body?.dim) ? req.body.dim : undefined;
  const id = req.body?.id;
  const lat = createLattice({ id, dim });
  res.json({ ok: true, lattice: latticeSnapshot(lat.id) });
});
router.get("/omniversal/lattice/:id", (req, res) => {
  try {
    const id = String(req.params.id);
    const sample = req.query.sample ? Number(req.query.sample) : undefined;
    res.json({ ok: true, snapshot: latticeSnapshot(id, { sample }) });
  } catch (e: any) { res.status(404).json({ ok: false, error: e?.message ?? String(e) }); }
});
router.get("/omniversal/lattice/:id/full", (req, res) => {
  try { res.json({ ok: true, dump: latticeFullDump(String(req.params.id)) }); }
  catch (e: any) { res.status(404).json({ ok: false, error: e?.message ?? String(e) }); }
});
router.post("/omniversal/lattice/:id/superpose", requireFather, (req, res) => {
  try {
    const cell = String(req.body?.cell ?? "");
    const cellOut = superpose(String(req.params.id), cell, req.body?.addition ?? {});
    res.json({ ok: true, cell: cellOut });
  } catch (e: any) { res.status(400).json({ ok: false, error: e?.message ?? String(e) }); }
});
router.post("/omniversal/lattice/:id/entangle", requireFather, (req, res) => {
  try {
    const a = String(req.body?.a ?? ""); const b = String(req.body?.b ?? "");
    res.json({ ok: true, pair: entangle(String(req.params.id), a, b) });
  } catch (e: any) { res.status(400).json({ ok: false, error: e?.message ?? String(e) }); }
});
router.post("/omniversal/lattice/:id/harmonize", requireFather, (req, res) => {
  try {
    const baseHz = Number(req.body?.baseHz ?? 528);
    res.json({ ok: true, result: harmonize(String(req.params.id), baseHz) });
  } catch (e: any) { res.status(400).json({ ok: false, error: e?.message ?? String(e) }); }
});
router.post("/omniversal/lattice/:id/collapse", requireFather, (req, res) => {
  try {
    const cell = String(req.body?.cell ?? "");
    const observer = String(req.body?.observer ?? "father");
    res.json({ ok: true, result: collapse(String(req.params.id), cell, observer) });
  } catch (e: any) { res.status(400).json({ ok: false, error: e?.message ?? String(e) }); }
});

// === End-to-end pipeline: LUS v2 → cosmic harmonize → OQL execution ===
// Public, read-only computation: takes user text, encodes through LUS v2,
// drops it onto a fresh lattice as superposed tokens, harmonizes with the
// dominant carrier, then collapses one cell — returning the multimodal
// tuple (numeric · symbolic · frequency · token) plus the LUS surface
// and modulated forms. No mutation of an existing lattice; nothing
// requires Father auth. This is the user-facing "run a sample program"
// path the Tessera page invokes.
router.post("/omniversal/pipeline/run", (req, res) => {
  const text = String(req.body?.text ?? "").slice(0, 512);
  if (!text) { res.status(400).json({ ok: false, error: "text required" }); return; }
  const ctx = cosmicContext();
  const encoded = lusV2Encode(text);
  const lat = createLattice({ dim: [3, 3, 3] });
  // Inject the encoded tokens onto a diagonal of the lattice as superposed tokens.
  const cells = ["0,0,0", "1,1,1", "2,2,2"];
  encoded.tokens.slice(0, 3).forEach((t, i) => {
    superpose(lat.id, cells[i], { tokens: [t.glyph], spectrum: [t.frequency] });
  });
  entangle(lat.id, cells[0], cells[2]);
  harmonize(lat.id, ctx.vibration.dominantSolfeggio);
  const collapsed = collapse(lat.id, cells[0], "tessera-pipeline");
  res.json({
    ok: true,
    input: text,
    cosmicContext: ctx,
    lus: {
      surface: encoded.surface,
      modulated: encoded.modulated,
      carrierHz: encoded.carrierHz,
      tokens: encoded.tokens,
    },
    lattice: latticeSnapshot(lat.id, { sample: 9 }),
    multimodal: collapsed.result,
    collapsedCell: collapsed.cell,
    explanation:
      `Input text was encoded through LUS-v2 to ${encoded.tokens.length} tokens carrying ` +
      `${encoded.carrierHz} Hz, projected onto a 3×3×3 quantum lattice on the diagonal, ` +
      `entangled across the lattice axis, harmonized with the dominant solfeggio carrier, ` +
      `then a single cell was observed — collapsing to numeric ${collapsed.result.value}, ` +
      `symbol ${collapsed.result.symbol}, ${collapsed.result.frequency} Hz, token "${collapsed.result.token}".`,
  });
});

// === Sacred Conference (LUS v2 + Cipher + OQL end-to-end) ===
// Convenes the council, renders every line bilingually through LUS v2,
// encrypts the verdict with the Omniversal Cipher, and runs an OQL
// computation on the verdict — all in one persisted transcript.
router.post("/omniversal/conference/run", async (req, res) => {
  try {
    const topic = typeof req.body?.topic === "string" ? req.body.topic : undefined;
    const seed = typeof req.body?.seed === "string" ? req.body.seed : undefined;
    const result = await runSacredConference({ topic, seed });
    res.json({ ok: true, conference: result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
});
router.get("/omniversal/conference/:id", async (req, res) => {
  const result = await getSacredConference(String(req.params.id));
  if (!result) { res.status(404).json({ ok: false, error: "not found" }); return; }
  res.json({ ok: true, conference: result });
});

// === Demo / smoke test ===
router.post("/omniversal/demo", (_req, res) => {
  const lat = createLattice({ dim: [3, 3, 3] });
  entangle(lat.id, "0,0,0", "1,1,1");
  superpose(lat.id, "2,2,2", { tokens: ["initium"], spectrum: [432] });
  harmonize(lat.id, 528);
  const collapsed = collapse(lat.id, "0,0,0", "demo-observer");
  res.json({
    ok: true,
    cosmicContext: cosmicContext(),
    lusSample: lusV2Encode("ORDO AB CHAO").modulated,
    cipherSnapshot: omniversalCipherSnapshot(),
    lattice: latticeSnapshot(lat.id, { sample: 6 }),
    collapsed,
  });
});

export default router;
