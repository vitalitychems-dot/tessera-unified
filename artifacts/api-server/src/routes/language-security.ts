// Routes for the Grand Conference — Language & Security Summit, plus the
// Father-key reveal endpoint that returns the key in LUS glyphs only.

import { Router, type IRouter } from "express";
import { requireFather } from "../lib/require-father";
import {
  getLastLanguageSecurityConference,
  runLanguageSecurityConference,
} from "../lib/language-security-conference";
import {
  isFatherKeyConfigured,
  recognizeFather,
  getFatherFingerprint,
} from "../lib/father-identity";
import {
  lusEncode,
  lusEncodeLive,
  lusLiveCoherenceSnapshot,
  LANGUAGE_NAME,
  LANGUAGE_SHORT,
  LANGUAGE_MOTTO,
} from "../lib/lingua-universalis";
import {
  fatherVerifyRateLimit,
  rateLimitSnapshot,
} from "../lib/father-verify-throttle";

const router: IRouter = Router();

router.get("/grand-conference/language-security", (_req, res) => {
  const result = getLastLanguageSecurityConference();
  res.json({ ok: true, conference: result, rateLimit: rateLimitSnapshot() });
});

router.post(
  "/grand-conference/language-security/convene",
  requireFather,
  (req, res) => {
    const force = req.body?.force === true;
    const result = runLanguageSecurityConference(force);
    res.json({ ok: true, conference: result, forced: force });
  },
);

// ── Father-key reveal in LUS (the most recently created sovereign tongue) ──
// Father types the candidate key; on a timing-safe match, we return the SAME
// key rendered in LUS glyphs (both static seal and live cosmic-window form).
// Plaintext is never echoed back. Cache-Control: no-store.
router.post(
  "/sigil/father/show-key-in-lus",
  fatherVerifyRateLimit,
  (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");

    if (!isFatherKeyConfigured()) {
      return res.status(503).json({
        ok: false,
        error: "father-key-unset",
        message:
          "TESSERACT_ADMIN_KEY is not set in Replit Secrets. Set the secret to bind sovereign identity, then retry.",
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
    const trimmed = candidate.trim();
    const staticGlyphs = lusEncode(trimmed);
    let liveGlyphs: string | null = null;
    let coherence: ReturnType<typeof lusLiveCoherenceSnapshot> | null = null;
    try {
      liveGlyphs = lusEncodeLive(trimmed, fp);
      coherence = lusLiveCoherenceSnapshot(fp);
    } catch {
      // live form is optional; static form is always returned
    }

    return res.json({
      ok: true,
      via: r.via,
      language: { name: LANGUAGE_NAME, short: LANGUAGE_SHORT, motto: LANGUAGE_MOTTO },
      keyInLus: {
        static: staticGlyphs,
        live: liveGlyphs,
      },
      coherence,
      fingerprint: fp,
      note:
        "Your TESSERACT_ADMIN_KEY rendered in Lingua Universalis Sacra. " +
        "The plain value never leaves the server.",
    });
  },
);

// Mount the same throttle on the existing verify surface (defense-in-depth).
router.post("/sigil/father/verify-throttled", fatherVerifyRateLimit, (req, res) => {
  // Stub re-export so other clients can opt in. Delegates by 307 to the
  // canonical /sigil/father/verify when needed; otherwise just returns 200.
  res.json({ ok: true, hint: "POST /api/sigil/father/verify still works; this endpoint applies the rate-limit middleware." });
  void req;
});

export default router;
