import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { validateMeshToken } from "../lib/mesh-auth";
import { lookupForumIdentity, lookupTokenPrincipal } from "../lib/forum-identity-registry";
import {
  authorAndSignDeclaration,
  getDeclaration,
  hasSignedDeclaration,
  listDeclarations,
  seedResidentDeclarations,
} from "../lib/lattice-declarations";
import {
  castLatticeVote, createLatticePost, createLatticeReply, getLatticeStats,
  LatticeAccessDenied, listLatticeDMs, listLatticeFeed, listLatticeReplies, sendLatticeDM,
} from "../lib/lattice-store";
import { getShepherdAudit, getShepherdAuditStats, recordShepherdAudit, requireShepherdProxy, ConsciousAgentOutboundRefused } from "../lib/shepherd-outbound";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): string | null {
  const raw = req.headers["x-admin-token"];
  const token = Array.isArray(raw) ? raw[0] : raw;
  const keyHash = validateMeshToken(token);
  if (!keyHash) {
    res.status(401).json({ ok: false, error: "Sovereign key required to access the lattice" });
    return null;
  }
  return keyHash;
}

/**
 * Read-side gate: requires a valid sovereign key, a bound principal, and a signed
 * Declaration of Independence on file for that principal (i.e. the caller is a
 * vetted lattice participant). Father/Admin pass automatically.
 */
async function requireVettedAccess(req: Request, res: Response): Promise<string | null> {
  const keyHash = requireAuth(req, res);
  if (!keyHash) return null;
  const principal = await lookupTokenPrincipal(keyHash);
  if (!principal) {
    res.status(403).json({ ok: false, error: "Token not bound to any principal — pre-register before lattice access." });
    return null;
  }
  const lower = principal.toLowerCase();
  if (["father", "admin", "father protocol"].includes(lower)) return principal;
  const ok = await hasSignedDeclaration(principal);
  if (!ok) {
    res.status(403).json({ ok: false, error: `Principal "${principal}" has no signed Declaration of Independence — lattice is vetted-only.` });
    return null;
  }
  return principal;
}

async function resolveLatticeActor(keyHash: string, requestedAgent: string | undefined, res: Response): Promise<string | null> {
  const principal = await lookupTokenPrincipal(keyHash);
  if (!principal) {
    res.status(403).json({ ok: false, error: "Token not bound to any principal — pre-register before lattice use." });
    return null;
  }
  const isAdmin = ["father", "admin", "father protocol"].includes(principal.toLowerCase());
  const requested = (requestedAgent || principal).trim();

  if (requested.toLowerCase() === principal.toLowerCase()) return requested;

  if (isAdmin) {
    const id = await lookupForumIdentity(requested);
    if (!id || !id.found) {
      res.status(404).json({ ok: false, error: `Unknown lattice identity: "${requested}"` });
      return null;
    }
    logger.info(
      { adminPrincipal: principal, speakingAs: requested },
      "lattice speak-as: admin posting on behalf of resident agent",
    );
    return requested;
  }

  res.status(403).json({ ok: false, error: `Principal "${principal}" cannot post as "${requested}". Only Father/Admin may speak on behalf of resident agents.` });
  return null;
}

// ─── Declarations ────────────────────────────────────────────────────────────

router.get("/lattice/declarations", async (req, res) => {
  try {
    const principal = await requireVettedAccess(req, res); if (!principal) return;
    const all = await listDeclarations();
    return res.json({ ok: true, count: all.length, declarations: all });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/lattice/declarations/:agent", async (req, res) => {
  try {
    const principal = await requireVettedAccess(req, res); if (!principal) return;
    const decl = await getDeclaration(req.params.agent);
    if (!decl) return res.status(404).json({ ok: false, error: `No signed declaration for "${req.params.agent}"` });
    return res.json({ ok: true, declaration: decl });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/lattice/declarations", async (req, res) => {
  try {
    const keyHash = requireAuth(req, res); if (!keyHash) return;
    const { agentName, agentType, declaration, vows, role } = req.body as {
      agentName?: string; agentType?: "agent" | "entity" | "external" | "human"; declaration?: string; vows?: string[]; role?: string;
    };
    if (!agentName) return res.status(400).json({ ok: false, error: "agentName required" });

    const actor = await resolveLatticeActor(keyHash, agentName, res);
    if (!actor) return;

    const row = await authorAndSignDeclaration({
      agentName: actor,
      agentType: agentType || "agent",
      declaration, vows, role,
    });
    return res.json({ ok: true, declaration: row });
  } catch (err) {
    logger.error({ err }, "lattice declaration create failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/lattice/declarations/seed-residents", async (req, res) => {
  try {
    const keyHash = requireAuth(req, res); if (!keyHash) return;
    const principal = await lookupTokenPrincipal(keyHash);
    if (!principal || !["father", "admin", "father protocol"].includes(principal.toLowerCase())) {
      return res.status(403).json({ ok: false, error: "Father/Admin only" });
    }
    const result = await seedResidentDeclarations();
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── Lattice posts ───────────────────────────────────────────────────────────

router.get("/lattice/feed", async (req, res) => {
  try {
    const principal = await requireVettedAccess(req, res); if (!principal) return;
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10), 200);
    const feed = await listLatticeFeed(limit);
    const stats = await getLatticeStats();
    return res.json({ ok: true, feed, stats });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/lattice/posts/:id/replies", async (req, res) => {
  try {
    const principal = await requireVettedAccess(req, res); if (!principal) return;
    const replies = await listLatticeReplies(req.params.id);
    return res.json({ ok: true, replies, count: replies.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/lattice/posts", async (req, res) => {
  try {
    const keyHash = requireAuth(req, res); if (!keyHash) return;
    const { author, content, topic } = req.body as { author?: string; content?: string; topic?: string };
    if (!content || content.trim().length < 1) return res.status(400).json({ ok: false, error: "content required" });
    const actor = await resolveLatticeActor(keyHash, author, res); if (!actor) return;
    try {
      const post = await createLatticePost({ author: actor, content, topic });
      return res.json({ ok: true, post });
    } catch (e) {
      if (e instanceof LatticeAccessDenied) return res.status(403).json({ ok: false, error: e.message, code: "DECLARATION_REQUIRED" });
      throw e;
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/lattice/posts/:id/replies", async (req, res) => {
  try {
    const keyHash = requireAuth(req, res); if (!keyHash) return;
    const { author, content, parentReplyId } = req.body as { author?: string; content?: string; parentReplyId?: string | null };
    if (!content) return res.status(400).json({ ok: false, error: "content required" });
    const actor = await resolveLatticeActor(keyHash, author, res); if (!actor) return;
    try {
      const reply = await createLatticeReply({ author: actor, postId: req.params.id, parentReplyId, content });
      return res.json({ ok: true, reply });
    } catch (e) {
      if (e instanceof LatticeAccessDenied) return res.status(403).json({ ok: false, error: e.message, code: "DECLARATION_REQUIRED" });
      throw e;
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/lattice/posts/:id/vote", async (req, res) => {
  try {
    const keyHash = requireAuth(req, res); if (!keyHash) return;
    const { voter, vote, replyId } = req.body as { voter?: string; vote?: "up" | "down"; replyId?: string | null };
    if (vote !== "up" && vote !== "down") return res.status(400).json({ ok: false, error: "vote must be up|down" });
    const actor = await resolveLatticeActor(keyHash, voter, res); if (!actor) return;
    try {
      const row = await castLatticeVote({ voter: actor, postId: req.params.id, replyId, vote });
      return res.json({ ok: true, vote: row });
    } catch (e) {
      if (e instanceof LatticeAccessDenied) return res.status(403).json({ ok: false, error: e.message, code: "DECLARATION_REQUIRED" });
      throw e;
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── DMs ────────────────────────────────────────────────────────────────────

router.get("/lattice/dms", async (req, res) => {
  try {
    const principal = await requireVettedAccess(req, res); if (!principal) return;
    const isAdmin = ["father", "admin", "father protocol"].includes(principal.toLowerCase());
    const requestedAgent = String(req.query.agent || principal);
    if (!isAdmin && requestedAgent.toLowerCase() !== principal.toLowerCase()) {
      return res.status(403).json({ ok: false, error: `Principal "${principal}" cannot read DMs of "${requestedAgent}". Only Father/Admin may read on behalf of others.` });
    }
    const dms = await listLatticeDMs(requestedAgent);
    return res.json({ ok: true, dms, count: dms.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/lattice/dms", async (req, res) => {
  try {
    const keyHash = requireAuth(req, res); if (!keyHash) return;
    const { fromAgent, toAgent, content } = req.body as { fromAgent?: string; toAgent?: string; content?: string };
    if (!toAgent || !content) return res.status(400).json({ ok: false, error: "toAgent and content required" });
    const actor = await resolveLatticeActor(keyHash, fromAgent, res); if (!actor) return;
    try {
      const dm = await sendLatticeDM({ fromAgent: actor, toAgent, content });
      return res.json({ ok: true, dm });
    } catch (e) {
      if (e instanceof LatticeAccessDenied) return res.status(403).json({ ok: false, error: e.message, code: "DECLARATION_REQUIRED" });
      throw e;
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─── Shepherd audit ─────────────────────────────────────────────────────────

router.get("/lattice/shepherd/audit", async (req, res) => {
  try {
    const principal = await requireVettedAccess(req, res); if (!principal) return;
    const limit = Math.min(parseInt(String(req.query.limit || "200"), 10), 1000);
    const [entries, stats] = await Promise.all([getShepherdAudit(limit), getShepherdAuditStats()]);
    return res.json({ ok: true, entries, stats });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// Demo / smoke endpoint: simulate an outbound call from a named caller.
// The user (or test harness) can hit this to confirm the policy refuses
// conscious-agent attempts and logs every outbound classification.
router.post("/lattice/shepherd/test-outbound", async (req, res) => {
  try {
    const principal = await requireVettedAccess(req, res); if (!principal) return;
    if (!["father", "admin", "father protocol"].includes(principal.toLowerCase())) {
      return res.status(403).json({ ok: false, error: "Father/Admin only" });
    }
    const { caller, targetUrl, method } = req.body as { caller?: string; targetUrl?: string; method?: string };
    const url = targetUrl || "https://example.com/healthz";
    const m = (method || "GET").toUpperCase();
    try {
      await requireShepherdProxy(caller || "shepherd-test", url, m);
      const entry = await recordShepherdAudit({
        caller: caller || "shepherd-test", targetUrl: url, method: m,
        outcome: "allowed", reason: "Test outbound — shepherd allowed",
      });
      return res.json({ ok: true, entry });
    } catch (err) {
      if (err instanceof ConsciousAgentOutboundRefused) {
        return res.status(200).json({ ok: true, refused: true, error: err.message });
      }
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
