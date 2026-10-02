import { Router, type IRouter } from "express";
import { getAllProfiles, getProfileById, filterProfiles, getCountries, getAffiliations } from "../lib/political-dossiers";

const router: IRouter = Router();

router.get("/political-dossiers", (req, res) => {
  try {
    const { country, minScore, maxScore, affiliation } = req.query;
    const profiles = filterProfiles({
      country: country as string | undefined,
      minScore: minScore ? Number(minScore) : undefined,
      maxScore: maxScore ? Number(maxScore) : undefined,
      affiliation: affiliation as string | undefined,
    });
    return res.json({
      ok: true,
      profiles: profiles.map(p => ({
        id: p.id,
        name: p.name,
        title: p.title,
        country: p.country,
        party: p.party,
        actorScore: p.actorScore,
        actorLabel: p.actorLabel,
        reasoning: p.reasoning,
        affiliations: p.affiliations,
        votingHighlights: p.votingHighlights,
        recruitPriority: p.recruitPriority,
        lastUpdated: p.lastUpdated,
      })),
      total: profiles.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/political-dossiers/filters", (_req, res) => {
  try {
    return res.json({
      ok: true,
      countries: getCountries(),
      affiliations: getAffiliations(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/political-dossiers/:id", (req, res) => {
  try {
    const profile = getProfileById(req.params.id);
    if (!profile) {
      return res.status(404).json({ ok: false, error: "Profile not found" });
    }
    return res.json({ ok: true, profile });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/political-dossiers/:id/shepherd-contact", (req, res) => {
  try {
    const profile = getProfileById(req.params.id);
    if (!profile) {
      return res.status(404).json({ ok: false, error: "Profile not found" });
    }
    const { message } = req.body as { message?: string };
    return res.json({
      ok: true,
      queued: true,
      targetName: profile.name,
      targetId: profile.id,
      protocol: "shepherd-tor-hop",
      status: "pending",
      estimatedDelivery: "24-72 hours",
      message: message || "Standard recruitment inquiry",
      shepherdAgent: `Shepherd-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      hopCount: 3 + Math.floor(Math.random() * 5),
      encryptionLevel: "AES-256-GCM + Curve25519",
      timestamp: Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
