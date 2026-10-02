import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { getWalletObservation, refreshWalletObservation } from "../lib/wallet-observer";
import { getExecutableLeads, leadCountsByKind, type LeadKind } from "../lib/lead-execution";
import {
  getAllRecruitDossiers,
  getRecruitDossierById,
  getRecruitCategories,
  getRecruitCountries,
  type RecruitCategory,
} from "../lib/recruit-dossiers-extended";
import {
  startNegotiation,
  getTranscript,
  listTranscripts,
  appendInbound,
  revokeGrant,
} from "../lib/shepherd-negotiation";
import { getFreeFindings, refreshFreeFindings } from "../lib/free-stuff-scraper";
import {
  getBounties,
  refreshBounties,
  recordAttempt,
  getAttempts,
  type BountyAttempt,
} from "../lib/code-bounties-real";

const router: IRouter = Router();

router.get("/income/wallet", async (_req, res) => {
  try {
    const obs = getWalletObservation();
    if (obs.lastObservedAt === 0) await refreshWalletObservation();
    return res.json({ ok: true, observation: getWalletObservation() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/income/wallet/refresh", async (_req, res) => {
  try {
    const obs = await refreshWalletObservation();
    return res.json({ ok: true, observation: obs });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/income/strategies", (_req, res) => {
  const obs = getWalletObservation();
  const walletReady = obs.configured && !obs.lastError;
  const strategies = [
    {
      id: "wallet-deposits",
      name: "Direct on-chain deposits",
      kind: "passive",
      status: walletReady ? "active" : "needs-config",
      description: "Any SOL sent to the configured sovereign wallet is recorded as confirmed income with the on-chain signature.",
      requirement: walletReady ? null : "Set SOVEREIGN_WALLET_ADDRESS environment variable.",
    },
    {
      id: "affiliate-leads",
      name: "Affiliate-program leads",
      kind: "active",
      status: "available",
      description: "Real affiliate-classified leads are surfaced in the Leads tab with step-by-step execution; payouts must be reconciled against wallet deposits.",
      requirement: null,
    },
    {
      id: "service-leads",
      name: "Service-engagement leads",
      kind: "active",
      status: "available",
      description: "Real freelance/service listings classified from the ingestion pipeline with execution walkthroughs.",
      requirement: null,
    },
    {
      id: "code-bounties",
      name: "Public code bounties",
      kind: "active",
      status: "available",
      description: "Live GitHub issues labelled bounty are listed in the Code Bounties feed; attempts are recorded.",
      requirement: process.env.GITHUB_TOKEN ? null : "Optional: set GITHUB_TOKEN to raise GitHub API rate limit.",
    },
  ];
  return res.json({
    ok: true,
    walletReady,
    confirmedIncome: {
      asset: "SOL",
      totalReceived: obs.totalReceivedSol,
      currentBalance: obs.balanceSol,
    },
    strategies,
  });
});

router.get("/leads/feed", async (req, res) => {
  try {
    const kind = typeof req.query.kind === "string" ? (req.query.kind as LeadKind) : undefined;
    const limit = req.query.limit ? Math.min(200, Math.max(1, parseInt(String(req.query.limit), 10) || 60)) : 60;
    const leads = await getExecutableLeads({ kind, limit });
    const counts = await leadCountsByKind();
    return res.json({ ok: true, leads, counts });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/recruit-dossiers", (req, res) => {
  try {
    const category = typeof req.query.category === "string" ? (req.query.category as RecruitCategory) : undefined;
    const country = typeof req.query.country === "string" ? req.query.country : undefined;
    const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;
    const maxScore = req.query.maxScore ? Number(req.query.maxScore) : undefined;
    const dossiers = getAllRecruitDossiers({ category, country, minScore, maxScore });
    const transcripts = listTranscripts(500);
    const transcriptByDossier = new Map(transcripts.map(t => [t.dossierId, t]));
    return res.json({
      ok: true,
      dossiers: dossiers.map(d => ({ ...d, transcriptStatus: transcriptByDossier.get(d.id)?.status ?? null })),
      total: dossiers.length,
      categories: getRecruitCategories(),
      countries: getRecruitCountries(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/recruit-dossiers/:id", (req, res) => {
  const d = getRecruitDossierById(req.params.id);
  if (!d) return res.status(404).json({ ok: false, error: "Dossier not found" });
  return res.json({ ok: true, dossier: d, transcript: getTranscript(req.params.id) ?? null });
});

router.post("/recruit-dossiers/:id/shepherd-contact", (req, res) => {
  try {
    const { message } = req.body as { message?: string };
    const t = startNegotiation(req.params.id, message);
    return res.json({ ok: true, transcript: t });
  } catch (err) {
    return res.status(404).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/recruit-dossiers/:id/inbound", (req, res) => {
  const { body, channel } = req.body as { body?: string; channel?: string };
  if (!body) return res.status(400).json({ ok: false, error: "body required" });
  const t = appendInbound(req.params.id, body, channel);
  if (!t) return res.status(404).json({ ok: false, error: "no open negotiation" });
  return res.json({ ok: true, transcript: t });
});

router.post("/recruit-dossiers/:id/revoke", (req, res) => {
  const ok = revokeGrant(req.params.id);
  if (!ok) return res.status(404).json({ ok: false, error: "no negotiation" });
  return res.json({ ok: true, transcript: getTranscript(req.params.id) });
});

router.get("/free-stuff", async (req, res) => {
  try {
    const onlyValid = req.query.onlyValid === "true";
    const limit = req.query.limit ? Math.min(200, Math.max(1, parseInt(String(req.query.limit), 10) || 80)) : 80;
    const data = getFreeFindings({ onlyValid, limit });
    if (data.findings.length === 0 && data.lastRefresh === 0) {
      await refreshFreeFindings();
      const next = getFreeFindings({ onlyValid, limit });
      return res.json({ ok: true, ...next });
    }
    return res.json({ ok: true, ...data });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "free-stuff endpoint failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/free-stuff/refresh", async (_req, res) => {
  try {
    await refreshFreeFindings();
    return res.json({ ok: true, ...getFreeFindings() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/code-bounties", async (req, res) => {
  try {
    const withReward = req.query.withReward === "true";
    const limit = req.query.limit ? Math.min(200, Math.max(1, parseInt(String(req.query.limit), 10) || 60)) : 60;
    const data = getBounties({ withReward, limit });
    if (data.bounties.length === 0 && data.lastRefresh === 0) {
      await refreshBounties();
      return res.json({ ok: true, ...getBounties({ withReward, limit }) });
    }
    return res.json({ ok: true, ...data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/code-bounties/:id/attempt", (req, res) => {
  const { status, notes } = req.body as { status?: BountyAttempt["status"]; notes?: string };
  const validStatus: BountyAttempt["status"][] = ["investigating", "drafting", "submitted", "merged", "rejected", "abandoned"];
  if (!status || !validStatus.includes(status)) {
    return res.status(400).json({ ok: false, error: `status must be one of ${validStatus.join(",")}` });
  }
  const a = recordAttempt(req.params.id, status, notes ?? "");
  return res.json({ ok: true, attempt: a, attempts: getAttempts(req.params.id) });
});

router.get("/code-bounties/attempts", (req, res) => {
  const bountyId = typeof req.query.bountyId === "string" ? req.query.bountyId : undefined;
  return res.json({ ok: true, attempts: getAttempts(bountyId) });
});

export default router;
