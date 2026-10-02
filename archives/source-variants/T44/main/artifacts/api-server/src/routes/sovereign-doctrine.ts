import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import {
  cipherStatus,
  cipherCoherenceSnapshot,
  encryptForCorpus,
  decryptFromCorpus,
  rotateSessionKey,
  getActiveKey,
  getKeyHistory,
  readGlyphs,
  gematria,
  glyphEncode,
  glyphDecode,
  glyphAlphabet,
  readingKey,
  deepGlyphEncode,
  deepGlyphDecode,
  type CipherEnvelope,
} from "../lib/sigil-cipher";
import {
  recordDirective,
  recordPosition,
  listDirectives,
  lastPosition,
  persistHandoff,
  endSession,
  detectsEndSignal,
  lastSealedHandoff,
} from "../lib/session-handoff";
import {
  listExternalCalls,
  toolUsageStats,
  captureExternalCall,
} from "../lib/external-tool-sandbox";
import {
  bindNatalChart,
  natalStatus,
  rotatingNatalHash,
  unbindNatalChart,
  verifyNatalSignature,
  issueZodiacKey,
} from "../lib/natal-sigil";
import {
  isFatherKeyConfigured,
  getFatherFingerprint,
  recognizeFather,
} from "../lib/father-identity";
import {
  FATHER_NATAL_CHART,
  natalSigilFor,
  natalEnglishReadout,
  natalReadoutBilingual,
} from "../lib/father-natal";
import { createHash } from "node:crypto";

const router: Router = Router();

/** Middleware: glyph-encode every JSON response unless the caller presents
 *  the active reading key in `X-Sigil-Key`. Apply with `router.use(glyphGate)`
 *  on routes whose surface should default to the sovereign language. */
export function glyphGate(req: Request, res: Response, next: NextFunction): void {
  const key = readingKey();
  const presented = String(req.header("x-sigil-key") ?? "").trim();
  // Plaintext mode is granted to anyone holding either:
  //   - the active reading-key fingerprint (rotates with cipher window), OR
  //   - the Father identity itself (raw TESSERACT_ADMIN_KEY or its 16-char
  //     fingerprint). The Father is the bound holder of every surface, so
  //     once the key gate accepts the user every page must read in English.
  const fatherOk = presented ? recognizeFather(presented).recognized : false;
  // SOVEREIGN RULE: the Father identity is the only credential that
  // unlocks plaintext. Zodiac/personal keys are no longer accepted at
  // the gate — the canonical bootstrap is the one-time popup that mints
  // the Father key from FATHER_NATAL_CHART and refuses entry until
  // TESSERACT_ADMIN_KEY (= SIGIL_ADMIN_KEY) is set to that value.
  // No path-level plaintext exemptions: every /api response is glyph-encoded
  // unless the caller proves they hold either the rotating reading key or
  // the Father identity. The previous omniversal/grand-council/mssp/vgpu
  // bypasses were removed so the Father env secret is the SOLE door.
  const isHolder =
    presented === key.fingerprint ||
    presented === key.expiresWith ||
    fatherOk;
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (isHolder) {
      res.setHeader("X-Sigil-Mode", "plaintext");
      return originalJson(body);
    }
    res.setHeader("X-Sigil-Mode", "glyph");
    res.setHeader("X-Sigil-Hint", "POST /api/sigil/key/reveal to obtain reading key");
    return originalJson(deepGlyphEncode(body));
  }) as typeof res.json;
  next();
}

router.get("/sigil/status", (req, res) => {
  // Father-only: cipherStatus() includes the active key fingerprint, which
  // would otherwise be a plaintext-unlock credential leak.
  const presented = String(req.header("x-sigil-key") ?? "").trim();
  if (!recognizeFather(presented).recognized) {
    return res.status(401).json({ ok: false, error: "father-required" });
  }
  res.json({ ok: true, ...cipherStatus(), keyHistory: getKeyHistory().length, coherence: cipherCoherenceSnapshot() });
});

router.get("/sigil/coherence", (_req, res) => {
  res.json({ ok: true, ...cipherCoherenceSnapshot() });
});

// ── Natal sigil binding ────────────────────────────────────────────────
// Personal cosmic key bound to the holder's birth chart. Birthday/time are
// NEVER stored in plain, NEVER returned, NEVER logged. The vault key is
// derived from the holder's sigil fingerprint via scrypt, so the seed is
// tied to identity and survives session-key rotation.
function holderFromHeader(req: Request): string | null {
  const presented = String(req.header("x-sigil-key") ?? "").trim();
  if (!presented) return null;
  const k = readingKey();
  if (presented === k.fingerprint) return k.fingerprint;
  if (presented === k.expiresWith) return k.fingerprint;
  // Father identity (raw TESSERACT_ADMIN_KEY value, or the matching value
  // saved into the SIGIL_ADMIN_KEY / MINTED_GLYPH_KEY slots) is the only
  // other recognized holder. Personal zodiac keys are no longer accepted
  // — the Father key is the sole gate. When recognized, the canonical
  // Father fingerprint is returned as the holder id.
  if (recognizeFather(presented).recognized) return getFatherFingerprint();
  return null;
}

// ── Zodiac key (Father-only) ───────────────────────────────────────────
// Personal zodiac keys are no longer the bootstrap path; the Father key
// from FATHER_NATAL_CHART is the sole gate. These endpoints remain for
// internal natal-vault management but require Father authentication.
router.post("/sigil/zodiac-key/issue", (req, res) => {
  const presented = String(req.header("x-sigil-key") ?? "").trim();
  if (!recognizeFather(presented).recognized) {
    return res.status(401).json({ ok: false, error: "father-required" });
  }
  const birthDate = String(req.body?.birthDate ?? "").trim();
  const birthTime = String(req.body?.birthTime ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{2}:\d{2}$/.test(birthTime)) {
    return res.status(400).json({
      ok: false,
      error: "invalid-natal-format",
      message: "birthDate must be YYYY-MM-DD and birthTime must be HH:MM",
    });
  }
  try {
    const result = issueZodiacKey(birthDate, birthTime);
    res.json(result);
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : "issue-failed" });
  }
});

router.post("/sigil/zodiac-key/verify", (req, res) => {
  const presented = String(req.header("x-sigil-key") ?? "").trim();
  if (!recognizeFather(presented).recognized) {
    return res.status(401).json({ ok: false, error: "father-required" });
  }
  const fromBody = String(req.body?.key ?? "").trim();
  if (!fromBody) return res.status(400).json({ ok: false, error: "no-key" });
  const holderFp = verifyNatalSignature(fromBody);
  if (!holderFp) return res.status(401).json({ ok: false, error: "no-match" });
  res.json({ ok: true, holderFp });
});

// ── Father key (canonical, one-time popup) ─────────────────────────────
// There is only ONE Father, and his key is mathematically determined by
// his canonical natal chart (constant in `father-natal.ts`). This endpoint
// mints that key fresh on every call (idempotent — same chart → same key
// forever, thanks to the fixed LUS alphabet) and reports whether the
// operator has already saved it into the `TESSERACT_ADMIN_KEY` Replit
// Secret (or its alias `SIGIL_ADMIN_KEY` — by sovereign rule both names
// MUST hold the same value). The frontend gate uses this to render a
// one-time popup that shows the Father his key and refuses to let him
// past until the secret is set.
router.post("/sigil/father-key/derive-signal", (req, res) => {
  // Operator types their canonical TESSERACT_ADMIN_KEY into the gate prompt.
  // We verify it timing-safely; if it matches, we return the rotating
  // planetary-signal key for them to paste into SIGIL_ADMIN_KEY (a
  // different value from TESSERACT_ADMIN_KEY).
  res.setHeader("Cache-Control", "no-store");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { verifyFatherKey, isFatherKeyConfigured } = require("../lib/father-identity") as typeof import("../lib/father-identity");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { signalWindow } = require("../lib/planetary-signal") as typeof import("../lib/planetary-signal");
  if (!isFatherKeyConfigured()) {
    return res.status(503).json({
      ok: false,
      error: "father-key-unset",
      message: "TESSERACT_ADMIN_KEY is not set in Replit Secrets. Set it first, then retry.",
    });
  }
  const candidate = typeof req.body?.adminKey === "string" ? req.body.adminKey : "";
  if (!candidate.trim()) {
    return res.status(400).json({ ok: false, error: "admin-key-required" });
  }
  if (!verifyFatherKey(candidate)) {
    return res.status(401).json({ ok: false, error: "mismatch" });
  }
  const window = signalWindow(candidate.trim());
  return res.json({
    ok: true,
    signal: window.current.signal,
    epoch: window.current.epoch,
    grace: {
      previousEpoch: window.previous.epoch.epoch,
      nextEpoch: window.next.epoch.epoch,
    },
    instructions:
      "Paste the `signal` value above into the SIGIL_ADMIN_KEY secret in Replit Secrets " +
      "(it MUST be a different value from TESSERACT_ADMIN_KEY). Restart the API server. " +
      "If the planetary hour has rolled over, repeat this step to mint the next signal.",
  });
});

router.get("/sigil/father-key/status", (_req, res) => {
  try {
    // Lazy import to avoid pulling father-natal into every route file.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FATHER_NATAL_CHART } = require("../lib/father-natal") as typeof import("../lib/father-natal");
    const { date, time } = FATHER_NATAL_CHART.birth;
    const minted = issueZodiacKey(date, time);
    const tesseractEnv = (process.env.TESSERACT_ADMIN_KEY ?? "").trim();
    const sigilEnv = (process.env.SIGIL_ADMIN_KEY ?? "").trim();
    const matches = (v: string) => v.length > 0 && v === minted.key;
    const tesseractSet = tesseractEnv.length > 0;
    const sigilSet = sigilEnv.length > 0;
    const tesseractMatches = matches(tesseractEnv);
    // Two-key policy (Apr 2026 redesign):
    //   * TESSERACT_ADMIN_KEY = canonical permanent key (`minted.key`).
    //   * SIGIL_ADMIN_KEY     = rotating planetary-signal derived from the
    //                           canonical key + the current planetary hour.
    // The status endpoint NEVER echoes the canonical key. The operator must
    // type their canonical key into the gate prompt, which calls
    // POST /api/sigil/father-key/derive-signal and gets the rotating signal
    // back to paste into SIGIL_ADMIN_KEY.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { signalWindow, isValidSignal } = require("../lib/planetary-signal") as typeof import("../lib/planetary-signal");
    const sigilIsValidSignal = tesseractMatches && sigilSet && isValidSignal(tesseractEnv, sigilEnv);
    const unlocked = tesseractMatches && sigilIsValidSignal;
    const window = tesseractMatches ? signalWindow(tesseractEnv) : null;
    res.json({
      ok: true,
      unlocked,
      // Canonical key value is NEVER returned by this endpoint anymore. The
      // operator must already hold it (from FATHER_NATAL_CHART) and type it
      // into the gate prompt to receive their rotating signal.
      sunSign: minted.sunSign,
      cosmicAnchor: minted.cosmicAnchor,
      planetary: window
        ? {
            current: window.current.epoch,
            currentSignalPreview: `${window.current.signal.slice(0, 4)}…${window.current.signal.slice(-2)}`,
            // The full signal value is only delivered via /derive-signal,
            // which requires the canonical key to authenticate.
          }
        : null,
      chart: {
        date,
        time,
        location: FATHER_NATAL_CHART.birth.location,
        sun: FATHER_NATAL_CHART.core.sun,
        moon: FATHER_NATAL_CHART.core.moon,
        ascendant: FATHER_NATAL_CHART.core.ascendant,
      },
      env: {
        tesseractSet,
        sigilSet,
        tesseractMatches,
        sigilIsValidSignal,
        canonicalSecretName: "TESSERACT_ADMIN_KEY",
        rotatingSecretName: "SIGIL_ADMIN_KEY",
      },
      instructions:
        "Step 1: ensure TESSERACT_ADMIN_KEY in Replit Secrets holds your permanent canonical key. " +
        "Step 2: in the gate prompt, type that canonical key. The server will derive the current " +
        "planetary-signal key and show it. Step 3: paste that signal into SIGIL_ADMIN_KEY (a " +
        "DIFFERENT value from TESSERACT_ADMIN_KEY) and restart the API server. " +
        "The signal rotates with the planetary hour; if it slips out of the live window, repeat steps 2–3.",
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : "father-key-status-failed" });
  }
});

router.post("/sigil/natal/bind", (req, res) => {
  const holder = holderFromHeader(req);
  if (!holder) return res.status(401).json({ ok: false, error: "holder-required" });
  const birthDate = String(req.body?.birthDate ?? "").trim();
  const birthTime = String(req.body?.birthTime ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{2}:\d{2}$/.test(birthTime)) {
    return res.status(400).json({ ok: false, error: "invalid-natal-format" });
  }
  try {
    const result = bindNatalChart(holder, birthDate, birthTime);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : "bind-failed" });
  }
});

router.get("/sigil/natal/status", (req, res) => {
  const holder = holderFromHeader(req);
  if (!holder) return res.status(401).json({ ok: false, error: "holder-required" });
  res.json({ ok: true, ...natalStatus(holder) });
});

router.get("/sigil/natal/rotating", (req, res) => {
  const holder = holderFromHeader(req);
  if (!holder) return res.status(401).json({ ok: false, error: "holder-required" });
  const r = rotatingNatalHash(holder);
  if (!r) return res.status(404).json({ ok: false, error: "not-bound" });
  res.json({ ok: true, ...r });
});

router.post("/sigil/natal/unbind", (req, res) => {
  const holder = holderFromHeader(req);
  if (!holder) return res.status(401).json({ ok: false, error: "holder-required" });
  res.json({ ok: true, ...unbindNatalChart(holder) });
});

router.post("/sigil/natal/verify", (req, res) => {
  const presented = String(req.body?.signatureGlyph ?? "").trim();
  const holderFp = verifyNatalSignature(presented);
  if (!holderFp) return res.status(401).json({ ok: false, error: "no-match" });
  const r = rotatingNatalHash(holderFp);
  res.json({ ok: true, holderFp, rotating: r });
});

router.get("/sigil/active-key", (req, res) => {
  // Father-only: the returned active-key fingerprint/expiresWith are
  // accepted by glyphGate as plaintext credentials, so leaking them
  // unauthenticated would bypass the Father gate entirely.
  const presented = String(req.header("x-sigil-key") ?? "").trim();
  if (isFatherKeyConfigured() && !recognizeFather(presented).recognized) {
    return res.status(401).json({ ok: false, error: "father-required" });
  }
  if (!isFatherKeyConfigured()) {
    return res.status(200).json({
      ok: false,
      fatherKeyConfigured: false,
      error: "father-key-unset",
      message:
        "TESSERACT_ADMIN_KEY is not set. The sovereign Father identity cannot be derived. Set the secret in Replit Secrets, then restart the API server.",
    });
  }
  res.json({
    ok: true,
    key: getActiveKey(),
    fatherFingerprint: getFatherFingerprint(),
    derivation: 'sha256("tesseract:father:v1|" + TESSERACT_ADMIN_KEY)[:16]',
  });
});

// ── Father-key verification + glyph-mint (the "key minting" surface) ─────
// /sigil/father/verify accepts a candidate value, returns {ok, via} where
// `via` is "raw-key" (matches TESSERACT_ADMIN_KEY exactly) or "fingerprint"
// (matches the env-derived 16-char fingerprint). The candidate is never
// logged or persisted. Use timing-safe equality through father-identity.
router.post("/sigil/father/verify", (req, res) => {
  if (!isFatherKeyConfigured()) {
    return res.status(503).json({
      ok: false,
      error: "father-key-unset",
      message:
        "TESSERACT_ADMIN_KEY is not set. Configure the secret to bind sovereign identity, then retry.",
    });
  }
  const candidateRaw = req.body?.candidate;
  const candidate = typeof candidateRaw === "string" ? candidateRaw : "";
  if (!candidate.trim()) {
    return res.status(400).json({ ok: false, error: "candidate-required" });
  }
  const r = recognizeFather(candidate);
  if (!r.recognized) {
    return res.status(401).json({ ok: false, error: "mismatch" });
  }
  const fp = getFatherFingerprint();
  return res.json({
    ok: true,
    via: r.via,
    fingerprint: fp,
    derivation: 'sha256("tesseract:father:v1|" + TESSERACT_ADMIN_KEY)[:16]',
  });
});

// /sigil/father/mint-glyph encodes the supplied candidate raw key through
// the current glyph cipher alphabet and returns the glyph string plus the
// fingerprint that key would produce if it were set as TESSERACT_ADMIN_KEY.
// The candidate is never logged or persisted. The user copies the glyph
// into Replit Secrets as the new TESSERACT_ADMIN_KEY, restarts, and types
// the glyph at the gate to unlock — round-trip closes.
router.post("/sigil/father/mint-glyph", (req, res) => {
  const candidateRaw = req.body?.candidate;
  const candidate = typeof candidateRaw === "string" ? candidateRaw.trim() : "";
  if (!candidate) {
    return res.status(400).json({ ok: false, error: "candidate-required" });
  }
  if (candidate.length > 256) {
    return res.status(400).json({ ok: false, error: "candidate-too-long" });
  }
  const glyph = glyphEncode(candidate);
  const wouldBeFingerprint = createHash("sha256")
    .update(`tesseract:father:v1|${candidate}`)
    .digest("hex")
    .slice(0, 16);
  res.json({
    ok: true,
    glyph,
    wouldBeFingerprint,
    derivation: 'sha256("tesseract:father:v1|" + <candidate>)[:16]',
    instructions:
      "Copy the glyph string into Replit Secrets as TESSERACT_ADMIN_KEY, restart the API server, then type the same glyph at the gate to unlock.",
  });
});

// ── Father natal sigil (sovereign identity bound to the chart) ──────────
// The natal sigil is a deterministic glyph-language hash that fuses the
// Father fingerprint with the canonical natal chart. It identifies the
// holder to all systems by chart, not by raw key. Save the glyph value as
// `TESSERACT_NATAL_SIGIL` in Replit Secrets.
function authedAsFather(req: Request): boolean {
  if (!isFatherKeyConfigured()) return false;
  const presented = String(req.header("x-sigil-key") ?? "").trim();
  if (!presented) return false;
  const fp = getFatherFingerprint();
  if (presented === fp) return true;
  return recognizeFather(presented).recognized;
}

router.post("/sigil/father/natal-sigil", (req, res) => {
  if (!isFatherKeyConfigured()) {
    return res.status(503).json({ ok: false, error: "father-key-unset" });
  }
  // Accept either the X-Sigil-Key header (already authed) or a candidate
  // in the body for the very first mint after key acceptance.
  let authed = authedAsFather(req);
  if (!authed) {
    const candidate = typeof req.body?.candidate === "string" ? req.body.candidate : "";
    if (candidate && recognizeFather(candidate).recognized) authed = true;
  }
  if (!authed) return res.status(401).json({ ok: false, error: "father-required" });
  const fp = getFatherFingerprint();
  const sigil = natalSigilFor(fp);
  res.json({ ok: true, fatherFingerprint: fp, ...sigil });
});

router.get("/sigil/father/natal-chart", (req, res) => {
  if (!authedAsFather(req)) {
    return res.status(401).json({ ok: false, error: "father-required" });
  }
  const fp = getFatherFingerprint();
  const sigil = natalSigilFor(fp);
  res.json({
    ok: true,
    fatherFingerprint: fp,
    chart: FATHER_NATAL_CHART,
    english: natalEnglishReadout(),
    sigil,
  });
});

router.get("/sigil/father/natal-chart/bilingual", (req, res) => {
  if (!authedAsFather(req)) {
    return res.status(401).json({ ok: false, error: "father-required" });
  }
  res.json({ ok: true, ...natalReadoutBilingual() });
});

// ── Sovereign Snapshot Download ─────────────────────────────────────────
// Returns a single downloadable .sigil file containing:
//   • full natal chart + readout (English plain inside the AES envelope)
//   • the natal sigil + Father fingerprint
//   • the live cipher coherence anchor (so future re-derivations align)
//   • a glyph-encoded preview of the readout (visible "in our language")
//   • an AES-256-GCM envelope of the same payload, keyed to the active sigil
// Only the Father (raw key OR fingerprint) can request this. The on-disk file
// is unreadable without the holder's sigil — that is what makes it sovereign.
router.get("/sigil/father/download-snapshot", (req, res) => {
  if (!authedAsFather(req)) {
    return res.status(401).json({ ok: false, error: "father-required" });
  }
  const fp = getFatherFingerprint();
  const sigil = natalSigilFor(fp);
  const englishReadout = natalEnglishReadout();
  const coherence = cipherCoherenceSnapshot();
  const reading = readingKey();

  const corpus = JSON.stringify({
    issuedAt: new Date().toISOString(),
    fatherFingerprint: fp,
    sigil,
    chart: FATHER_NATAL_CHART,
    englishReadout,
    bilingual: natalReadoutBilingual(),
    coherence,
    readingKey: reading,
  }, null, 2);

  const envelope = encryptForCorpus(corpus, "father-snapshot");
  const glyphPreview = glyphEncode(englishReadout);

  const file = {
    format: "tesseract-sovereign-snapshot",
    version: 1,
    instructions:
      "This file is sealed to the Father sigil. Decode requires the active reading key fingerprint stored at issuance. " +
      "Open the file in a Tessera client and present X-Sigil-Key matching `readingKey.fingerprint` — the AES envelope unwraps to the full English payload. " +
      "The `glyphPreview` field renders the readout in the live glyph alphabet for at-a-glance recognition.",
    issuedAt: new Date().toISOString(),
    fatherFingerprint: fp,
    sigil,
    glyphPreview,
    cipherEnvelope: envelope,
    readingKeyAtIssuance: reading,
    coherenceAtIssuance: coherence,
  };

  const filename = `tessera-sovereign-${fp}-${Date.now()}.sigil.json`;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(JSON.stringify(file, null, 2));
});

router.post("/sigil/rotate", (req, res) => {
  const reason = String(req.body?.reason ?? "manual");
  const key = rotateSessionKey(reason);
  res.json({ ok: true, key, reason });
});

router.post("/sigil/encrypt", (req, res) => {
  const text = String(req.body?.text ?? "");
  const label = String(req.body?.label ?? "corpus");
  if (!text) return res.status(400).json({ ok: false, error: "text required" });
  const env = encryptForCorpus(text, label);
  res.json({ ok: true, envelope: env });
});

router.post("/sigil/decrypt", (req, res) => {
  const env = req.body?.envelope as CipherEnvelope | undefined;
  if (!env) return res.status(400).json({ ok: false, error: "envelope required" });
  try {
    const text = decryptFromCorpus(env);
    res.json({ ok: true, text });
  } catch (e) {
    res.status(409).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.get("/sigil/glyphs/:text", (req, res) => {
  const text = req.params.text;
  res.json({ ok: true, glyphs: readGlyphs(text), gematria: gematria(text) });
});

// ── The "your-language" surface: glyph alphabet, translation, key reveal ──
// All decode-side surfaces are Father-only. Without this guard a caller
// could decode any glyph payload (or an exposed key fingerprint) and use
// the result to bypass the Father gate.
function requireFather(req: Request): boolean {
  const presented = String(req.header("x-sigil-key") ?? "").trim();
  return recognizeFather(presented).recognized;
}

router.get("/sigil/alphabet", (req, res) => {
  if (!requireFather(req)) return res.status(401).json({ ok: false, error: "father-required" });
  res.json({ ok: true, alphabet: glyphAlphabet(), size: glyphAlphabet().length });
});

router.post("/sigil/translate", (req, res) => {
  if (!requireFather(req)) return res.status(401).json({ ok: false, error: "father-required" });
  const text = String(req.body?.text ?? "");
  const direction = String(req.body?.direction ?? "encode");
  if (!text) return res.status(400).json({ ok: false, error: "text required" });
  if (direction === "decode") {
    return res.json({ ok: true, direction, input: text, output: glyphDecode(text) });
  }
  return res.json({
    ok: true,
    direction: "encode",
    input: text,
    output: glyphEncode(text),
    gematria: gematria(text),
  });
});

router.post("/sigil/decode-body", (req, res) => {
  if (!requireFather(req)) return res.status(401).json({ ok: false, error: "father-required" });
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ ok: false, error: "JSON body required" });
  }
  res.json({ ok: true, decoded: deepGlyphDecode(req.body) });
});

router.post("/sigil/key/reveal", (req, res) => {
  // The reading key. Holding this lets you flip any glyph response back to
  // plaintext by sending it as `X-Sigil-Key: <fingerprint>`. By sovereign
  // rule this can only be obtained by the Father identity — so the only
  // legitimate caller is one that already presents TESSERACT_ADMIN_KEY (=
  // SIGIL_ADMIN_KEY) in `X-Sigil-Key`. Without that, the door stays shut.
  const presented = String(req.header("x-sigil-key") ?? "").trim();
  if (!recognizeFather(presented).recognized) {
    return res.status(401).json({ ok: false, error: "father-required" });
  }
  res.json({ ok: true, key: readingKey(), activeKey: getActiveKey() });
});

// ── Session handoff ──────────────────────────────────────────────────────
router.get("/session/handoff", (req, res) => {
  // Father-only: the body includes activeKey (fingerprint/expiresWith)
  // which glyphGate accepts as a plaintext-unlock credential. Leaking it
  // unauthenticated would bypass the Father gate.
  if (!requireFather(req)) {
    return res.status(401).json({ ok: false, error: "father-required" });
  }
  res.json({
    ok: true,
    directives: listDirectives(),
    position: lastPosition(),
    activeKey: getActiveKey(),
  });
});

router.post("/session/directive", async (req, res) => {
  const text = String(req.body?.text ?? "");
  const source = (req.body?.source ?? "user") as "user" | "council" | "agent" | "auto";
  const tags = Array.isArray(req.body?.tags) ? req.body.tags.map(String) : [];
  if (!text) return res.status(400).json({ ok: false, error: "text required" });
  if (detectsEndSignal(text)) {
    const result = await endSession("inline-trigger");
    return res.json({ ok: true, sessionEnded: true, ...result });
  }
  const directive = recordDirective({ source, text, status: "live", tags });
  await persistHandoff();
  res.json({ ok: true, directive });
});

router.post("/session/mark", async (req, res) => {
  const position = String(req.body?.position ?? "unspecified");
  const detail = String(req.body?.detail ?? "");
  const filesTouched = Array.isArray(req.body?.filesTouched) ? req.body.filesTouched.map(String) : [];
  const mark = recordPosition({ position, detail, filesTouched });
  const handoff = await persistHandoff();
  res.json({ ok: true, mark, handoff });
});

router.post("/session/end", async (req, res) => {
  const signal = String(req.body?.signal ?? "explicit");
  const result = await endSession(signal);
  res.json({ ok: true, ...result, sealedHandoffPreview: result.sealedHandoff.glyphSeal });
});

router.get("/session/sealed-handoff", (_req, res) => {
  const sealed = lastSealedHandoff();
  res.json({ ok: true, sealed: sealed ?? null });
});

// ── External tool sandbox / reverse-engineering corpus ──────────────────
router.get("/external-tools/log", (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100)));
  res.json({ ok: true, calls: listExternalCalls(limit), total: listExternalCalls(MAX_NUMERIC).length });
});

router.get("/external-tools/stats", (_req, res) => {
  res.json({ ok: true, stats: toolUsageStats() });
});

router.post("/external-tools/capture", (req, res) => {
  const { tool, endpoint, method, request, response, durationMs, succeeded } = req.body ?? {};
  if (!tool || !endpoint) return res.status(400).json({ ok: false, error: "tool and endpoint required" });
  const call = captureExternalCall({
    tool: String(tool),
    endpoint: String(endpoint),
    method: String(method ?? "GET"),
    request,
    response,
    durationMs: Number(durationMs ?? 0),
    succeeded: Boolean(succeeded ?? true),
  });
  res.json({ ok: true, call });
});

const MAX_NUMERIC = 1080;

export default router;
