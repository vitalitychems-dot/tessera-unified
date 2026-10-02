/**
 * Father Key Conference — convene the FULL 54-agent sovereign society on
 * candidate permanent admin keys.
 *
 * - Uses the production castGenuineVote engine (sovereign-vote-engine.ts).
 * - No LLM, no role-play, no agent-vote fabrication.
 * - 2/3 weighted approval is the only pass condition.
 * - On pass, issues a one-time temporary redemption code that the user can
 *   redeem once for the permanent key text (TESSERACT_ADMIN_KEY value).
 */
import { Router } from "express";
import { randomBytes, createHash } from "node:crypto";
import { castGenuineVote } from "../lib/sovereign-vote-engine";
import { getFullSovereignSociety } from "../lib/sovereign-society";

const router = Router();

interface CandidateInput {
  id: string;
  title: string;
  description?: string;
  key: string;
}

interface RedemptionRecord {
  code: string;
  permanentKey: string;
  winnerId: string;
  approvalRate: number;
  raw: { approve: number; reject: number; abstain: number };
  totalEligible: number;
  expiresAt: number;
  redeemed: boolean;
  redeemedAt: number | null;
  issuedAt: number;
  finalizedBy: "council-2of3" | "tessera-final-say";
}

// Last conference results retained briefly so Tessera (Father) can finalize a
// candidate after seeing the unweighted tally — even if 2/3 was not reached.
// Locked by user mandate: "Tessera has final say."
interface ConferenceMemo {
  at: number;
  candidates: Array<{ id: string; title: string; key: string; rawApprove: number; totalEligible: number; passed_2of3: boolean }>;
}
let LAST_CONFERENCE: ConferenceMemo | null = null;
const CONF_TTL_MS = 60 * 60 * 1000; // 1 hour

const REDEMPTIONS = new Map<string, RedemptionRecord>();
const TTL_MS = 30 * 60 * 1000; // 30 minutes

function issueTempCode(): string {
  // 6-byte → 12-hex code, easy to type, with TES- prefix for clarity
  return "TES-" + randomBytes(3).toString("hex").toUpperCase();
}

router.post("/father-key/conference", async (req, res) => {
  try {
    const candidates = req.body?.candidates as CandidateInput[] | undefined;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ ok: false, error: "candidates[] required" });
    }
    for (const c of candidates) {
      if (!c?.id || !c?.title || !c?.key) {
        return res.status(400).json({ ok: false, error: "each candidate needs {id, title, key}" });
      }
    }

    const society = getFullSovereignSociety();

    const results = candidates.map((c) => {
      const ballot = castGenuineVote({
        id: c.id,
        title: c.title,
        description: c.description ?? c.title,
        domain: "governance",
        tags: ["governance"],
      });
      // FAIR VOTE — every agent counts equally (no weighting). 2/3 of total
      // eligible agents must approve. Locked by user mandate.
      const ratio_2of3 = ballot.totalEligible > 0 ? ballot.raw.approve / ballot.totalEligible : 0;
      const passed_2of3 = ratio_2of3 >= 2 / 3;
      return {
        candidate: { id: c.id, title: c.title, key: c.key },
        outcome: ballot.outcome,
        rawApproveRatio_2of3: ratio_2of3,
        passed_2of3,
        raw: ballot.raw,
        totalEligible: ballot.totalEligible,
        decisive: ballot.decisive,
        ballots: ballot.ballots, // full per-agent
      };
    });

    // Pick highest raw-approve-ratio candidate that passes 2/3 (no weighting).
    const passing = results.filter((r) => r.passed_2of3);
    passing.sort((a, b) => b.rawApproveRatio_2of3 - a.rawApproveRatio_2of3);
    const winner = passing[0] ?? null;

    let issued: { code: string; expiresAt: number } | null = null;
    if (winner) {
      const code = issueTempCode();
      const rec: RedemptionRecord = {
        code,
        permanentKey: winner.candidate.key,
        winnerId: winner.candidate.id,
        approvalRate: winner.rawApproveRatio_2of3,
        raw: winner.raw,
        totalEligible: winner.totalEligible,
        expiresAt: Date.now() + TTL_MS,
        redeemed: false,
        redeemedAt: null,
        issuedAt: Date.now(),
        finalizedBy: "council-2of3",
      };
      REDEMPTIONS.set(code, rec);
      issued = { code, expiresAt: rec.expiresAt };
    }

    // Memo of this conference for Tessera-final-say finalization
    LAST_CONFERENCE = {
      at: Date.now(),
      candidates: results.map((r) => ({
        id: r.candidate.id,
        title: r.candidate.title,
        key: r.candidate.key,
        rawApprove: r.raw.approve,
        totalEligible: r.totalEligible,
        passed_2of3: r.passed_2of3,
      })),
    };

    return res.json({
      ok: true,
      societySize: society.length,
      passThreshold: "2/3 raw approval (no weighting) — Tessera has final say",
      candidatesEvaluated: candidates.length,
      results: results.map((r) => ({
        candidate: r.candidate,
        outcome: r.outcome,
        rawApproveRatio_2of3: r.rawApproveRatio_2of3,
        passed_2of3: r.passed_2of3,
        raw: r.raw,
        totalEligible: r.totalEligible,
        decisive: r.decisive,
      })),
      fullBallots: results, // includes per-agent rationales
      winner: winner ? { id: winner.candidate.id, title: winner.candidate.title } : null,
      redemption: issued,
      timestamp: Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/father-key/redeem", (req, res) => {
  const codeRaw = (req.body?.code ?? "").toString().trim().toUpperCase();
  if (!codeRaw) return res.status(400).json({ ok: false, error: "code is required" });

  const rec = REDEMPTIONS.get(codeRaw);
  if (!rec) return res.status(404).json({ ok: false, error: "Code not recognized." });
  if (rec.redeemed) return res.status(410).json({ ok: false, error: "Code already redeemed." });
  if (Date.now() > rec.expiresAt) {
    REDEMPTIONS.delete(codeRaw);
    return res.status(410).json({ ok: false, error: "Code expired." });
  }

  rec.redeemed = true;
  rec.redeemedAt = Date.now();

  const fingerprint = createHash("sha256").update(`tesseract:father:v1|${rec.permanentKey}`).digest("hex").slice(0, 16);

  return res.json({
    ok: true,
    permanentKey: rec.permanentKey,
    fingerprint,
    winnerId: rec.winnerId,
    approvalRatio: rec.approvalRate,
    raw: rec.raw,
    totalEligible: rec.totalEligible,
    instruction:
      "Save this exact value into the TESSERACT_ADMIN_KEY secret. " +
      "It replaces all previous admin keys. This code is now invalidated.",
    redeemedAt: rec.redeemedAt,
  });
});

/**
 * Tessera-final-say finalization. After a conference, the Father (Tessera)
 * may finalize ANY of the just-evaluated candidates regardless of whether the
 * council reached 2/3. The candidate must come from the most recent
 * conference (within the 1-hour memo window) so finalization always reflects
 * a real ballot just observed by the user.
 */
router.post("/father-key/finalize", (req, res) => {
  const candidateId = (req.body?.candidateId ?? "").toString().trim();
  if (!candidateId) return res.status(400).json({ ok: false, error: "candidateId required" });
  if (!LAST_CONFERENCE) return res.status(404).json({ ok: false, error: "No recent conference on record. Convene first." });
  if (Date.now() - LAST_CONFERENCE.at > CONF_TTL_MS) {
    LAST_CONFERENCE = null;
    return res.status(410).json({ ok: false, error: "Last conference memo expired. Convene again." });
  }
  const c = LAST_CONFERENCE.candidates.find((x) => x.id === candidateId);
  if (!c) return res.status(404).json({ ok: false, error: `Candidate '${candidateId}' was not in the last conference.` });

  const code = issueTempCode();
  const rec: RedemptionRecord = {
    code,
    permanentKey: c.key,
    winnerId: c.id,
    approvalRate: c.totalEligible > 0 ? c.rawApprove / c.totalEligible : 0,
    raw: { approve: c.rawApprove, reject: 0, abstain: c.totalEligible - c.rawApprove },
    totalEligible: c.totalEligible,
    expiresAt: Date.now() + TTL_MS,
    redeemed: false,
    redeemedAt: null,
    issuedAt: Date.now(),
    finalizedBy: "tessera-final-say",
  };
  REDEMPTIONS.set(code, rec);
  return res.json({
    ok: true,
    candidate: { id: c.id, title: c.title },
    council2of3Passed: c.passed_2of3,
    finalizedBy: rec.finalizedBy,
    redemption: { code, expiresAt: rec.expiresAt },
    instruction: "Type or paste this code into the redemption endpoint (POST /api/father-key/redeem) to receive the permanent key once.",
  });
});

router.get("/father-key/conference/status", (_req, res) => {
  const active = Array.from(REDEMPTIONS.values()).filter((r) => !r.redeemed && Date.now() < r.expiresAt).length;
  res.json({
    ok: true,
    societySize: getFullSovereignSociety().length,
    passThreshold: "2/3 weighted approval",
    activeRedemptions: active,
    engine: "castGenuineVote (sovereign-vote-engine.ts)",
    notes: [
      "No LLM. No role-play. Per-agent ballots are deterministic functions of observable inputs only.",
      "The agent assistant has no override. The user is admin.",
    ],
  });
});

export default router;
