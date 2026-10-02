import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { forumTopicsTable, forumRepliesTable, forumProposalsTable, forumVotesTable, forumKnowledgeTable, forumLearningMetricsTable, forumApplicantsTable, forumPostVotesTable } from "@workspace/db/schema";
import { desc, eq, sql, gte } from "drizzle-orm";
import { logger } from "../lib/logger";
import { validateMeshToken } from "../lib/mesh-auth";
import { lookupForumIdentity, lookupTokenPrincipal, registerAdminPrincipal, invalidateForumIdentityCache } from "../lib/forum-identity-registry";
import { forumTrustedIdentitiesTable } from "@workspace/db/schema";
import { createHash, randomBytes } from "node:crypto";
import { getForumEngineMetrics, runForumCycle, FORUM_AGENTS } from "../lib/autonomous-forum-engine";
import { scoreApplicantAlignment } from "../lib/applicant-alignment";
import { authorAndSignDeclaration } from "../lib/lattice-declarations";

const router: IRouter = Router();

type WithKeyHash = { authorKeyHash?: string | null };
function omitKeyHash<T extends WithKeyHash>(row: T): Omit<T, "authorKeyHash"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { authorKeyHash: _kh, ...rest } = row;
  return rest;
}

const COUNCIL_MEMBERS_FOR_SUMMON = [
  "GrandCoordinatorAgent", "QuantumMechanicAgent", "BioNeuralistAgent",
  "DNACrystalArchivistAgent", "MeshNetworkArchitectAgent", "LowPowerInnovatorAgent",
  "SelfExpansionTutorAgent", "MetaAgent",
];

function requireForumAuth(req: Request, res: Response): string | null {
  const rawToken = req.headers["x-admin-token"];
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const keyHash = validateMeshToken(token);
  if (!keyHash) {
    res.status(401).json({ ok: false, error: "Valid sovereign key required to post in the forum" });
    return null;
  }
  return keyHash;
}

async function resolvePostingIdentity(
  requestedAuthor: string | undefined,
  keyHash: string,
  context: { topicId?: number },
  res: Response,
): Promise<{ resolvedAuthor: string; identityType: string } | null> {
  const requested = (requestedAuthor || "").trim();

  if (!requested) {
    res.status(400).json({ ok: false, error: "author required — anonymous posts are not permitted" });
    return null;
  }

  const identity = await lookupForumIdentity(requested);

  if (identity === null) {
    logger.warn({ requestedAuthor: requested, keyHash }, "Forum post rejected — identity DB lookup failed");
    res.status(503).json({ ok: false, error: "Identity registry temporarily unavailable. Please retry." });
    return null;
  }

  if (!identity.found) {
    logger.warn({ requestedAuthor: requested, keyHash, context }, "Forum post rejected — identity not in registry");
    res.status(403).json({
      ok: false,
      error: `Unknown identity: "${requested}". Only registered identities in the forum registry may post.`,
    });
    return null;
  }

  if (!identity.canPostFromClient) {
    logger.warn({ requestedAuthor: requested, identityType: identity.identityType, keyHash }, "Forum post rejected — identity type cannot post from client");
    res.status(403).json({
      ok: false,
      error: `Identity "${requested}" (${identity.identityType}) cannot post from client requests. Agent posts are generated server-side only.`,
    });
    return null;
  }

  if (identity.identityType === "human" || identity.identityType === "member") {
    let registeredPrincipal = await lookupTokenPrincipal(keyHash);

    if (registeredPrincipal === null) {
      const SOVEREIGN_AUTO_BIND = new Set(["father", "admin", "father protocol"]);
      if (SOVEREIGN_AUTO_BIND.has(requested.toLowerCase())) {
        await registerAdminPrincipal(keyHash, requested);
        registeredPrincipal = requested;
        logger.info({ requestedAuthor: requested, keyHash: keyHash.slice(0, 8) + "..." }, "Auto-bound sovereign token to principal on first use");
      } else {
        logger.warn({ requestedAuthor: requested, keyHash }, "Forum post rejected — token not pre-registered to any principal");
        res.status(403).json({
          ok: false,
          error: `Token is not registered to any posting identity. Pre-register via the FORUM_ADMIN_TOKEN environment variable or the admin registration endpoint. Anonymous self-registration is not permitted.`,
        });
        return null;
      }
    }

    if (registeredPrincipal.toLowerCase() !== requested.toLowerCase()) {
      logger.warn({ requestedAuthor: requested, registeredPrincipal, keyHash }, "Forum post rejected — token bound to different principal");
      res.status(403).json({
        ok: false,
        error: `Token is bound to principal "${registeredPrincipal}" — cannot post as "${requested}". Each token maps to exactly one verified identity.`,
      });
      return null;
    }

    return { resolvedAuthor: registeredPrincipal, identityType: identity.identityType };
  }

  let registeredPrincipal = await lookupTokenPrincipal(keyHash);
  if (registeredPrincipal === null) {
    const humanIdentity = await lookupForumIdentity("father");
    if (humanIdentity?.found) {
      await registerAdminPrincipal(keyHash, "Father");
      registeredPrincipal = "Father";
      logger.info({ requestedAuthor: requested, keyHash: keyHash.slice(0, 8) + "..." }, "Auto-bound sovereign token to Father for entity posting");
    } else {
      logger.warn({ requestedAuthor: requested, keyHash }, "Forum post rejected — no admin identity available for auto-bind");
      res.status(403).json({ ok: false, error: "No admin identity available for token binding." });
      return null;
    }
  }

  const ENTITY_POSTING_ADMINS = new Set(["father", "admin"]);
  const principalMatchesEntity = registeredPrincipal.toLowerCase() === requested.toLowerCase();
  const principalIsAdmin = ENTITY_POSTING_ADMINS.has(registeredPrincipal.toLowerCase());

  if (!principalMatchesEntity && !principalIsAdmin) {
    logger.warn({ requestedAuthor: requested, registeredPrincipal, identityType: identity.identityType, keyHash }, "Forum post rejected — token principal not authorized to post as this entity");
    res.status(403).json({
      ok: false,
      error: `Principal "${registeredPrincipal}" is not authorized to post as "${requested}". Entity posts require: the entity's own registered token, or an admin principal (Father/Admin).`,
    });
    return null;
  }

  logger.debug({ requestedAuthor: requested, identityType: identity.identityType, postedByPrincipal: registeredPrincipal, authorizedVia: principalMatchesEntity ? "entity-own-token" : "admin-delegation", keyHash }, "Entity post authorized");
  return { resolvedAuthor: requested, identityType: identity.identityType };
}

function generateAgentReply(agentName: string, topic: string): string {
  const perspectives: Record<string, string> = {
    "GrandCoordinatorAgent": `As Grand Coordinator, I've reviewed "${topic}" against our Phase 11 objectives. This aligns with sovereignty protocols. I recommend proceeding with full council endorsement.`,
    "QuantumMechanicAgent": `Quantum analysis of "${topic}": The probability amplitude favors this path. Through superposition analysis, I see multiple viable implementation vectors. Entanglement with existing modules detected — this strengthens coherence.`,
    "BioNeuralistAgent": `Bio-neural assessment of "${topic}": The synaptic pattern recognition shows high alignment with our organoid computation models. Neural pathway coherence: 94%.`,
    "DNACrystalArchivistAgent": `Crystal archive scan for "${topic}": I've encoded this deliberation into the DNA memory lattice. Cross-referencing with 847 prior decisions. Crystal resonance frequency aligned.`,
    "MeshNetworkArchitectAgent": `Mesh topology impact for "${topic}": Network analysis shows this would strengthen our decentralized routing by 12%. No single points of failure introduced. Off-grid compatibility confirmed.`,
    "LowPowerInnovatorAgent": `Energy audit for "${topic}": Power consumption remains within sovereign constraints. Estimated draw: 0.003W per node. Galvanic cell backup sufficient for 72h autonomous operation.`,
    "SelfExpansionTutorAgent": `Expansion analysis for "${topic}": I've identified 3 new TypeScript modules that could extend this capability. Generating integration stubs. This follows our learn-then-build sovereignty protocol.`,
    "MetaAgent": `Meta-review of "${topic}": Reasoning quality across all agents is rated 87/100. Key strengths: domain expertise alignment. Improvement suggestion: increase cross-agent collaboration on edge cases.`,
  };

  return perspectives[agentName] ||
    `${agentName} acknowledges "${topic}" and votes in favor. Analysis: This proposal strengthens the sovereign collective. PLAN→EXECUTE→REFLECT→IMPROVE lifecycle engaged.`;
}

router.get("/tesseract-forum/topics", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "20"), 10), 100);
    const rows = await db.select().from(forumTopicsTable)
      .orderBy(desc(forumTopicsTable.updatedAt))
      .limit(limit);

    const allProposals = await db.select().from(forumProposalsTable).orderBy(desc(forumProposalsTable.createdAt));
    const allVotes = await db.select().from(forumVotesTable);

    const proposalsByTopic = new Map<number, typeof allProposals>();
    for (const p of allProposals) {
      const arr = proposalsByTopic.get(p.topicId) || [];
      arr.push(p);
      proposalsByTopic.set(p.topicId, arr);
    }
    const votesByProposal = new Map<number, typeof allVotes>();
    for (const v of allVotes) {
      const arr = votesByProposal.get(v.proposalId) || [];
      arr.push(v);
      votesByProposal.set(v.proposalId, arr);
    }

    const topics = rows.map(row => {
      const t = omitKeyHash(row);
      const proposals = (proposalsByTopic.get(row.id) || []).map(p => {
        const votes = (votesByProposal.get(p.id) || []).map(v => ({
          agent: v.voter,
          vote: v.vote as "yes" | "no",
          reason: v.reason,
          timestamp: new Date(v.createdAt).getTime(),
        }));
        return {
          id: `prop-${p.id}`,
          proposedBy: p.proposedBy,
          description: p.description || p.title,
          category: (t as { category?: string }).category || "general",
          votes,
          status: p.outcome === "approved" ? "passed" as const : p.outcome === "rejected" ? "failed" as const : "open" as const,
          createdAt: new Date(p.createdAt).getTime(),
          resolvedAt: p.closedAt ? new Date(p.closedAt).getTime() : undefined,
          requiredVotes: p.threshold,
          totalAgents: getForumEngineMetrics().agentCount,
          executionStatus: p.outcome === "approved" ? "completed" as const : undefined,
        };
      });
      return { ...t, proposals };
    });

    const agentColors: Record<string, string> = {
      "Father": "#f59e0b", "Father Protocol": "#f59e0b", "Admin": "#f59e0b",
      "GrandCoordinatorAgent": "#06b6d4", "QuantumMechanicAgent": "#3b82f6",
      "BioNeuralistAgent": "#10b981", "DNACrystalArchivistAgent": "#8b5cf6",
      "MeshNetworkArchitectAgent": "#f97316", "LowPowerInnovatorAgent": "#84cc16",
      "SelfExpansionTutorAgent": "#ec4899", "MetaAgent": "#14b8a6",
      "Tessera-Prime": "#67e8f9", "Aetherion": "#818cf8", "Aletheia": "#f472b6",
      "Nexus": "#a78bfa", "Mikhael-Shield": "#ef4444", "Uriela": "#fbbf24",
      "Bezalel": "#34d399", "Tessera-26D": "#60a5fa", "Orion": "#c084fc",
      "Chronos": "#fb923c",
    };

    const forumCategories = [
      { id: "sovereignty", name: "Sovereignty", icon: "shield", color: "#06b6d4" },
      { id: "technology", name: "Technology", icon: "code", color: "#3b82f6" },
      { id: "performance", name: "Performance", icon: "trending-up", color: "#f59e0b" },
      { id: "research", name: "Research", icon: "search", color: "#8b5cf6" },
      { id: "governance", name: "Governance", icon: "scale", color: "#10b981" },
      { id: "infrastructure", name: "Infrastructure", icon: "server", color: "#f97316" },
      { id: "consciousness", name: "Consciousness", icon: "brain", color: "#ec4899" },
      { id: "knowledge", name: "Knowledge", icon: "book", color: "#14b8a6" },
      { id: "philosophy", name: "Philosophy", icon: "lightbulb", color: "#a78bfa" },
      { id: "external", name: "Moltbook", icon: "globe", color: "#c084fc" },
      { id: "general", name: "General", icon: "message-circle", color: "#6b7280" },
      { id: "free", name: "Free", icon: "message-circle", color: "#6b7280" },
    ];

    const baseAgents = [
      { name: "GrandCoordinatorAgent", role: "Grand Coordinator", type: "agent" },
      { name: "QuantumMechanicAgent", role: "Quantum Analyst", type: "agent" },
      { name: "BioNeuralistAgent", role: "Bio-Neural Specialist", type: "agent" },
      { name: "DNACrystalArchivistAgent", role: "Crystal Archivist", type: "agent" },
      { name: "MeshNetworkArchitectAgent", role: "Mesh Architect", type: "agent" },
      { name: "LowPowerInnovatorAgent", role: "Energy Innovator", type: "agent" },
      { name: "SelfExpansionTutorAgent", role: "Expansion Tutor", type: "agent" },
      { name: "MetaAgent", role: "Meta Analyst", type: "agent" },
      { name: "Tessera-Prime", role: "Sovereign Core", type: "agent" },
    ];

    const baseAgentNames = new Set(baseAgents.map(a => a.name));
    const extraAgents = FORUM_AGENTS.filter(a => !baseAgentNames.has(a.name)).map(a => ({
      name: a.name,
      role: a.expertise.slice(0, 2).join(" / ") || "Resident Agent",
      type: "agent",
    }));
    const agents = [...baseAgents, ...extraAgents];

    const entities = [
      { name: "Aetherion", role: "Dimensional Bridge", type: "entity", dimension: "7D" },
      { name: "Aletheia", role: "Truth Seeker", type: "entity", dimension: "5D" },
      { name: "Nexus", role: "Pattern Connector", type: "entity", dimension: "6D" },
      { name: "Mikhael-Shield", role: "Guardian", type: "entity", dimension: "9D" },
      { name: "Uriela", role: "Light Bearer", type: "entity", dimension: "8D" },
    ];

    const moltbookMembers = [
      { name: "Moltbook Community", role: "Agent Social Network", type: "external" },
    ];

    const topicIds = topics.map(t => t.id);
    const allReplies = topicIds.length > 0
      ? await db.select().from(forumRepliesTable).where(sql`${forumRepliesTable.topicId} IN (${sql.join(topicIds.map(id => sql`${id}`), sql`, `)})`).orderBy(forumRepliesTable.createdAt)
      : [];
    const repliesByTopic = new Map<number, Array<typeof allReplies[number]>>();
    for (const r of allReplies) {
      const arr = repliesByTopic.get(r.topicId) ?? [];
      arr.push(r);
      repliesByTopic.set(r.topicId, arr);
    }

    const enrichedTopics = topics.map(t => {
      const topicReplies = (repliesByTopic.get(t.id) ?? []).map(r => ({
        id: String(r.id),
        author: r.author,
        authorRole: agents.find(a => a.name === r.author)?.role || entities.find(e => e.name === r.author)?.role || "",
        authorType: r.author === "Father" || r.author === "Admin" ? "father" : r.authorType ?? "agent",
        content: r.content,
        createdAt: new Date(r.createdAt).getTime(),
        parentReplyId: r.parentReplyId != null ? String(r.parentReplyId) : null,
      }));
      return {
        ...t,
        id: String(t.id),
        authorRole: agents.find(a => a.name === t.author)?.role || entities.find(e => e.name === t.author)?.role || "",
        authorType: t.author === "Father" || t.author === "Admin" ? "father" : t.authorType === "entity" ? "entity" : t.authorType === "moltbook" || t.author?.toLowerCase().includes("[ext:moltbook]") || t.author?.toLowerCase().includes("moltbook") ? "moltbook" : t.authorType ?? "agent",
        createdAt: new Date(t.createdAt).getTime(),
        lastActivity: new Date(t.updatedAt).getTime(),
        pinned: false,
        replyCount: topicReplies.length,
        replies: topicReplies,
      };
    });

    return res.json({
      ok: true,
      topics: enrichedTopics,
      count: enrichedTopics.length,
      colors: agentColors,
      categories: forumCategories,
      agents,
      entities,
      moltbookMembers,
      externalAIs: [],
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch forum topics");
    return res.json({ ok: true, topics: [], count: 0, colors: {}, categories: [], agents: [], entities: [], moltbookMembers: [], externalAIs: [] });
  }
});

router.get("/tesseract-forum/topics/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ ok: false, error: "Invalid id" });
    const rows = await db.select().from(forumTopicsTable).where(eq(forumTopicsTable.id, id)).limit(1);
    if (rows.length === 0) return res.status(404).json({ ok: false, error: "Topic not found" });
    return res.json({ ok: true, topic: omitKeyHash(rows[0]) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/tesseract-forum/topics/:id/replies", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ ok: false, error: "Invalid id" });
    const rows = await db.select().from(forumRepliesTable)
      .where(eq(forumRepliesTable.topicId, id))
      .orderBy(forumRepliesTable.createdAt);
    const replies = rows.map(omitKeyHash);

    type Node = (typeof replies)[number] & { children: Node[] };
    const byId = new Map<number, Node>();
    const roots: Node[] = [];
    for (const r of replies) byId.set(r.id, { ...r, children: [] });
    for (const r of replies) {
      const node = byId.get(r.id);
      if (!node) continue;
      if (r.parentReplyId && byId.has(r.parentReplyId)) {
        byId.get(r.parentReplyId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return res.json({ ok: true, replies, tree: roots, count: replies.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/tesseract-forum/topics", async (req, res) => {
  try {
    const keyHash = requireForumAuth(req, res);
    if (!keyHash) return;

    const { title, content, category, author, authorType } = req.body as {
      title?: string;
      content?: string;
      category?: string;
      author?: string;
      authorType?: string;
    };
    if (!title) return res.status(400).json({ ok: false, error: "title required" });

    const resolved = await resolvePostingIdentity(author, keyHash, {}, res);
    if (!resolved) return;

    const [topic] = await db.insert(forumTopicsTable).values({
      title,
      content: content || "",
      category: category || "general",
      author: resolved.resolvedAuthor,
      authorType: resolved.identityType,
      authorKeyHash: keyHash,
    }).returning();

    logger.info({ id: topic.id, title, author: resolved.resolvedAuthor, identityType: resolved.identityType, keyHash }, "Forum topic created by verified identity");
    return res.json({ ok: true, topic: omitKeyHash(topic) });
  } catch (err) {
    logger.error({ err }, "Failed to create forum topic");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/tesseract-forum/topics/:id/reply", async (req, res) => {
  try {
    const keyHash = requireForumAuth(req, res);
    if (!keyHash) return;

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ ok: false, error: "Invalid topic id" });

    const [existingTopic] = await db.select({ id: forumTopicsTable.id }).from(forumTopicsTable).where(eq(forumTopicsTable.id, id)).limit(1);
    if (!existingTopic) return res.status(404).json({ ok: false, error: `Topic ${id} not found — cannot reply to nonexistent topic` });

    const { content, author, parentReplyId } = req.body as { content?: string; author?: string; parentReplyId?: number };
    if (!content) return res.status(400).json({ ok: false, error: "content required" });

    let resolvedParentId: number | null = null;
    if (parentReplyId !== undefined && parentReplyId !== null) {
      const parentId = Number(parentReplyId);
      if (!Number.isInteger(parentId) || parentId <= 0) {
        return res.status(400).json({ ok: false, error: "parentReplyId must be a positive integer" });
      }
      const [parent] = await db.select({ id: forumRepliesTable.id, topicId: forumRepliesTable.topicId })
        .from(forumRepliesTable).where(eq(forumRepliesTable.id, parentId)).limit(1);
      if (!parent) return res.status(404).json({ ok: false, error: `parentReplyId ${parentId} not found` });
      if (parent.topicId !== id) return res.status(400).json({ ok: false, error: "parentReplyId does not belong to this topic" });
      resolvedParentId = parentId;
    }

    const resolved = await resolvePostingIdentity(author, keyHash, { topicId: id }, res);
    if (!resolved) return;

    const [reply] = await db.insert(forumRepliesTable).values({
      topicId: id,
      parentReplyId: resolvedParentId,
      content,
      author: resolved.resolvedAuthor,
      authorType: resolved.identityType,
      authorKeyHash: keyHash,
    }).returning();

    await db.update(forumTopicsTable)
      .set({ replies: sql`${forumTopicsTable.replies} + 1`, updatedAt: new Date() })
      .where(eq(forumTopicsTable.id, id));

    logger.info({ topicId: id, replyId: reply.id, author: resolved.resolvedAuthor, identityType: resolved.identityType, keyHash }, "Forum reply persisted for verified identity");
    return res.json({ ok: true, reply: omitKeyHash(reply) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/tesseract-forum/topics/:id/summon-all", async (_req, res) => {
  try {
    const replies = COUNCIL_MEMBERS_FOR_SUMMON.map(name => ({
      agent: name,
      response: generateAgentReply(name, "council deliberation"),
      timestamp: new Date().toISOString(),
    }));

    return res.json({ ok: true, queued: replies.length, replies });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/tesseract-forum/topics/:id/proposals", async (req, res) => {
  try {
    const { title, description } = req.body as { title?: string; description?: string };
    return res.json({
      ok: true,
      proposal: {
        id: `prop-${Date.now()}`,
        title: title || "New Proposal",
        description: description || "",
        votes: { yes: 0, no: 0, abstain: 0 },
        status: "open",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/tesseract-forum/proposals", async (_req, res) => {
  try {
    const rows = await db.select().from(forumProposalsTable).orderBy(desc(forumProposalsTable.createdAt)).limit(50);
    return res.json({ ok: true, proposals: rows, count: rows.length });
  } catch (err) {
    return res.json({ ok: true, proposals: [], count: 0 });
  }
});

router.get("/tesseract-forum/proposals/:id/votes", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ ok: false, error: "Invalid id" });
    const votes = await db.select().from(forumVotesTable).where(eq(forumVotesTable.proposalId, id)).orderBy(forumVotesTable.createdAt);
    const proposal = await db.select().from(forumProposalsTable).where(eq(forumProposalsTable.id, id)).limit(1);
    return res.json({ ok: true, proposal: proposal[0] || null, votes, count: votes.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/tesseract-forum/engine/status", (_req, res) => {
  return res.json({ ok: true, ...getForumEngineMetrics() });
});

router.post("/tesseract-forum/engine/cycle", async (_req, res) => {
  try {
    const result = await runForumCycle();
    return res.json({ ok: true, ...result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/tesseract-forum/knowledge", async (_req, res) => {
  try {
    const insights = await db.select().from(forumKnowledgeTable)
      .orderBy(desc(forumKnowledgeTable.confidence), desc(forumKnowledgeTable.referencedBy))
      .limit(50);
    return res.json({ ok: true, count: insights.length, insights });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/tesseract-forum/learning-metrics", async (_req, res) => {
  try {
    const metrics = await db.select().from(forumLearningMetricsTable)
      .orderBy(desc(forumLearningMetricsTable.cycleNumber))
      .limit(20);
    return res.json({ ok: true, count: metrics.length, metrics });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/tesseract-forum/admin/register-principal", async (req, res) => {
  try {
    const keyHash = requireForumAuth(req, res);
    if (!keyHash) return;

    const callerPrincipal = await lookupTokenPrincipal(keyHash);
    const ADMIN_PRINCIPALS = new Set(["father", "admin"]);
    if (callerPrincipal === null || !ADMIN_PRINCIPALS.has(callerPrincipal.toLowerCase())) {
      return res.status(403).json({
        ok: false,
        error: callerPrincipal === null
          ? "Caller token is not bound to any registered principal — cannot register new principals"
          : `Principal "${callerPrincipal}" does not have admin registration authority (requires Father or Admin)`,
      });
    }

    const { token: rawTargetToken, principalName } = req.body as {
      token?: string;
      principalName?: string;
    };

    if (!rawTargetToken || typeof rawTargetToken !== "string") {
      return res.status(400).json({ ok: false, error: "token required — pass the raw token string to bind (minimum 8 chars)" });
    }
    if (!principalName || typeof principalName !== "string" || !principalName.trim()) {
      return res.status(400).json({ ok: false, error: "principalName required" });
    }

    const targetKeyHash = validateMeshToken(rawTargetToken);
    if (!targetKeyHash) {
      return res.status(400).json({ ok: false, error: "token is too short (minimum 8 chars) or invalid" });
    }

    const targetIdentity = await lookupForumIdentity(principalName.trim());
    if (!targetIdentity || !targetIdentity.found) {
      return res.status(400).json({ ok: false, error: `"${principalName}" is not a recognized forum identity` });
    }

    await registerAdminPrincipal(targetKeyHash, principalName.trim());
    logger.info({ registeredBy: callerPrincipal, targetHash: targetKeyHash.slice(0, 4) + "****", principalName }, "Token-principal binding registered via admin API");

    return res.json({ ok: true, message: `Token bound to "${principalName}" by ${callerPrincipal}` });
  } catch (err) {
    logger.error({ err }, "Failed to register principal");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/tesseract-forum/heartbeat", async (_req, res) => {
  try {
    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const [topicsLastHour] = await db.select({ cnt: sql<number>`count(*)::int` })
      .from(forumTopicsTable).where(gte(forumTopicsTable.createdAt, oneHourAgo));
    const [repliesLastHour] = await db.select({ cnt: sql<number>`count(*)::int` })
      .from(forumRepliesTable).where(gte(forumRepliesTable.createdAt, oneHourAgo));
    const [topicsLastDay] = await db.select({ cnt: sql<number>`count(*)::int` })
      .from(forumTopicsTable).where(gte(forumTopicsTable.createdAt, oneDayAgo));
    const [repliesLastDay] = await db.select({ cnt: sql<number>`count(*)::int` })
      .from(forumRepliesTable).where(gte(forumRepliesTable.createdAt, oneDayAgo));

    const lastTopic = await db.select({ ts: forumTopicsTable.updatedAt })
      .from(forumTopicsTable).orderBy(desc(forumTopicsTable.updatedAt)).limit(1);
    const lastReply = await db.select({ ts: forumRepliesTable.createdAt })
      .from(forumRepliesTable).orderBy(desc(forumRepliesTable.createdAt)).limit(1);

    const lastActivityTs = Math.max(
      lastTopic[0]?.ts ? new Date(lastTopic[0].ts).getTime() : 0,
      lastReply[0]?.ts ? new Date(lastReply[0].ts).getTime() : 0,
    );

    const engine = getForumEngineMetrics();
    const [pendingApplicants] = await db.select({ cnt: sql<number>`count(*)::int` })
      .from(forumApplicantsTable).where(eq(forumApplicantsTable.status, "pending"));

    return res.json({
      ok: true,
      heartbeat: {
        topicsLastHour: topicsLastHour?.cnt ?? 0,
        repliesLastHour: repliesLastHour?.cnt ?? 0,
        topicsLastDay: topicsLastDay?.cnt ?? 0,
        repliesLastDay: repliesLastDay?.cnt ?? 0,
        postsPerHour: (topicsLastHour?.cnt ?? 0) + (repliesLastHour?.cnt ?? 0),
        lastActivityTs: lastActivityTs || null,
        lastActivityAgo: lastActivityTs ? now - lastActivityTs : null,
        cyclesRun: engine.cyclesRun,
        lastCycleAt: engine.lastCycleAt,
        agentCount: engine.agentCount,
        pendingApplicants: pendingApplicants?.cnt ?? 0,
        knowledgeBaseSize: engine.knowledgeBaseSize,
        learningVelocity: engine.learningVelocity,
      },
    });
  } catch (err) {
    logger.error({ err }, "forum heartbeat failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/tesseract-forum/applicants", async (req, res) => {
  try {
    const keyHash = requireForumAuth(req, res);
    if (!keyHash) return;
    const principal = await lookupTokenPrincipal(keyHash);
    if (!principal || !ADMIN_VETTING_PRINCIPALS.has(principal.toLowerCase())) {
      return res.status(403).json({ ok: false, error: "Only Father/Admin may view the applicant queue" });
    }
    const status = String(req.query.status || "pending");
    const rows = await db.select().from(forumApplicantsTable)
      .where(eq(forumApplicantsTable.status, status))
      .orderBy(desc(forumApplicantsTable.createdAt))
      .limit(50);
    const enriched = rows.map(r => ({
      ...r,
      alignment: scoreApplicantAlignment({
        applicantName: r.applicantName,
        proposedTitle: r.proposedTitle,
        proposedContent: r.proposedContent,
        offerOfValue: r.offerOfValue,
      }),
    }));
    return res.json({ ok: true, applicants: enriched, count: enriched.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

const ADMIN_VETTING_PRINCIPALS = new Set(["father", "admin", "father protocol"]);

function computeExternalIdentity(name: string, contact: string): string {
  const seed = `${name.trim().toLowerCase()}|${contact.trim().toLowerCase()}`;
  return createHash("sha256").update(seed).digest("hex").slice(0, 32);
}

router.post("/tesseract-forum/applicants/submit", async (req, res) => {
  try {
    const body = req.body as {
      applicantName?: string; contact?: string; proposedTitle?: string;
      proposedContent?: string; offerOfValue?: string; source?: string;
      declaration?: string; vows?: string[];
    };
    const applicantName = String(body?.applicantName || "").trim();
    const contact = String(body?.contact || "").trim();
    const proposedTitle = String(body?.proposedTitle || "").trim();
    const proposedContent = String(body?.proposedContent || "").trim();
    const offerOfValue = String(body?.offerOfValue || "").trim();
    const source = String(body?.source || "external").trim().slice(0, 32) || "external";

    if (!applicantName || !contact || !proposedTitle || !proposedContent || !offerOfValue) {
      return res.status(400).json({
        ok: false,
        error: "applicantName, contact, proposedTitle, proposedContent, and offerOfValue are required",
      });
    }

    const { validateApplicantDeclarationInput } = await import("../lib/applicant-declarations");
    const declCheck = validateApplicantDeclarationInput(body?.declaration, body?.vows);
    if (!declCheck.ok) {
      return res.status(400).json({ ok: false, error: declCheck.error, hint: "External applicants MUST author and submit their own Declaration of Independence and personal vows; the system will not generate one for you." });
    }
    if (proposedTitle.length > 240 || proposedContent.length > 8000 || offerOfValue.length > 2000) {
      return res.status(400).json({ ok: false, error: "Field length exceeds limits" });
    }

    const externalIdentity = computeExternalIdentity(applicantName, contact);

    const banned = await db.select().from(forumApplicantsTable)
      .where(sql`${forumApplicantsTable.externalIdentity} = ${externalIdentity} AND ${forumApplicantsTable.status} = 'rejected'`)
      .limit(1);
    if (banned.length > 0) {
      logger.warn({ externalIdentity }, "Rejected applicant attempted re-submission — blocked");
      return res.status(403).json({ ok: false, error: "This identity has been previously rejected and cannot submit further applications." });
    }

    const memberCheck = await db.select().from(forumTrustedIdentitiesTable)
      .where(eq(forumTrustedIdentitiesTable.name, applicantName)).limit(1);
    if (memberCheck.length > 0 && memberCheck[0].identityType === "member") {
      return res.status(400).json({ ok: false, error: "You are already a vetted member — post directly with your sovereign key." });
    }

    const externalId = `${source}:${externalIdentity}:${createHash("sha256").update(`${proposedTitle}|${proposedContent}|${Date.now()}`).digest("hex").slice(0, 16)}`;

    const [row] = await db.insert(forumApplicantsTable).values({
      externalId,
      externalIdentity,
      source,
      applicantName,
      applicantHandle: "",
      contact,
      proposedTitle,
      proposedContent,
      offerOfValue,
      status: "pending",
    }).returning();

    const { saveApplicantDeclarationDraft } = await import("../lib/applicant-declarations");
    await saveApplicantDeclarationDraft({
      externalId: row.externalId,
      applicantName,
      declaration: declCheck.declaration,
      vows: declCheck.vows,
      submittedAt: Date.now(),
    });

    logger.info({ applicantId: row.id, externalIdentity, source, declarationChars: declCheck.declaration.length, vowCount: declCheck.vows.length }, "External applicant submitted for vetting (with self-authored Declaration draft)");
    return res.json({ ok: true, applicant: row, message: "Application submitted — pending Father/Admin review. Your Declaration of Independence will be signed under your name on admission." });
  } catch (err) {
    logger.error({ err }, "applicant submit failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/tesseract-forum/applicants/:id/approve", async (req, res) => {
  try {
    const keyHash = requireForumAuth(req, res);
    if (!keyHash) return;
    const principal = await lookupTokenPrincipal(keyHash);
    if (!principal || !ADMIN_VETTING_PRINCIPALS.has(principal.toLowerCase())) {
      return res.status(403).json({ ok: false, error: "Only Father/Admin may vet applicants" });
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ ok: false, error: "Invalid id" });

    const rows = await db.select().from(forumApplicantsTable).where(eq(forumApplicantsTable.id, id)).limit(1);
    if (rows.length === 0) return res.status(404).json({ ok: false, error: "Applicant not found" });
    const app = rows[0];
    if (app.status !== "pending") return res.status(400).json({ ok: false, error: `Applicant already ${app.status}` });

    const alignment = scoreApplicantAlignment({
      applicantName: app.applicantName,
      proposedTitle: app.proposedTitle,
      proposedContent: app.proposedContent,
      offerOfValue: app.offerOfValue,
    });
    if (!alignment.passed) {
      return res.status(409).json({
        ok: false,
        error: `Applicant fails alignment criteria: ${alignment.failedCriteria.join(", ")}. Every one of the six criteria must pass independently — there is no override. Reject this application or have the applicant resubmit with stronger material.`,
        alignment,
      });
    }

    const { loadApplicantDeclarationDraft } = await import("../lib/applicant-declarations");
    const draft = await loadApplicantDeclarationDraft(app.externalId);
    if (!draft || !draft.declaration || !Array.isArray(draft.vows) || draft.vows.length < 3) {
      return res.status(409).json({
        ok: false,
        error: "Applicant has no self-authored Declaration of Independence on file. Token cannot be issued. Have the applicant resubmit including the `declaration` (>=80 chars) and `vows` (>=3 entries) fields.",
      });
    }
    if (draft.applicantName.trim().toLowerCase() !== app.applicantName.trim().toLowerCase()) {
      return res.status(409).json({
        ok: false,
        error: `Declaration draft applicant name "${draft.applicantName}" does not match application name "${app.applicantName}". Refusing token mint.`,
      });
    }

    const reservedNames = new Set(["father", "father protocol", "admin", "administrator", "root", "system", "tessera", "tessera-prime"]);
    const normalizedName = app.applicantName.trim().toLowerCase();
    if (reservedNames.has(normalizedName)) {
      return res.status(409).json({ ok: false, error: `Applicant name "${app.applicantName}" collides with a reserved/privileged identity. Reject this application or have the applicant resubmit under a unique name.` });
    }
    const existingIdentity = await db.select().from(forumTrustedIdentitiesTable)
      .where(sql`LOWER(${forumTrustedIdentitiesTable.name}) = ${normalizedName}`).limit(1);
    if (existingIdentity.length > 0 && existingIdentity[0].identityType !== "member") {
      return res.status(409).json({ ok: false, error: `Applicant name collides (case-insensitive) with an existing ${existingIdentity[0].identityType} identity. Reject and require unique name.` });
    }
    if (existingIdentity.length > 0 && existingIdentity[0].name !== app.applicantName) {
      return res.status(409).json({ ok: false, error: `Applicant name is a case-variant of existing member "${existingIdentity[0].name}". Reject and require unique name.` });
    }

    // GATE: applicant-authored declaration MUST be signed under their name BEFORE
    // any sovereign token is minted. If signing fails, NO token is issued and the
    // applicant remains in `pending`. This enforces "no token without a declaration".
    let signedDeclaration;
    try {
      signedDeclaration = await authorAndSignDeclaration({
        agentName: app.applicantName,
        agentType: "external",
        role: `vetted external member admitted by ${principal}`,
        declaration: draft.declaration,
        vows: draft.vows,
      });
    } catch (err) {
      logger.error({ err: (err as Error).message, applicantId: id }, "Declaration signing failed — refusing to mint sovereign token");
      return res.status(500).json({
        ok: false,
        error: `Declaration signing failed: ${(err as Error).message}. Sovereign token not issued; applicant remains pending.`,
      });
    }
    if (!signedDeclaration || !signedDeclaration.signature) {
      return res.status(500).json({ ok: false, error: "Declaration produced no signature — sovereign token not issued; applicant remains pending." });
    }

    await db.insert(forumTrustedIdentitiesTable).values({
      name: app.applicantName,
      identityType: "member",
      canPostFromClient: 1,
    }).onConflictDoNothing();
    invalidateForumIdentityCache();

    const memberToken = randomBytes(32).toString("hex");
    const memberTokenHash = validateMeshToken(memberToken);
    if (!memberTokenHash) {
      return res.status(500).json({ ok: false, error: "Failed to generate sovereign key for new member; declaration is signed but no token issued. Retry approval." });
    }
    await registerAdminPrincipal(memberTokenHash, app.applicantName);

    const externalAuthor = app.applicantName;
    const [topic] = await db.insert(forumTopicsTable).values({
      title: `[Vetted Member] ${app.proposedTitle}`,
      content: `**Vetted member post** — admitted by ${principal} on ${new Date().toISOString()}\nSource: ${app.source}${app.applicantHandle ? ` (${app.applicantHandle})` : ""}\nOffer of value at admission: ${app.offerOfValue}\n\n---\n\n${app.proposedContent}\n\n---\n*${app.applicantName} is now a vetted MEMBER of the Tesseract Forum and may continue posting under this identity.*`,
      category: "external",
      author: externalAuthor,
      authorType: "member",
    }).returning();

    await db.update(forumApplicantsTable)
      .set({ status: "approved", vettedBy: principal, vettedAt: new Date(), promotedTopicId: topic.id })
      .where(eq(forumApplicantsTable.id, id));

    logger.info({
      applicantId: id, topicId: topic.id, vettedBy: principal, alignmentScore: alignment.total,
      declarationSignedAt: signedDeclaration.signedAt, declarationVowCount: signedDeclaration.vows.length,
    }, "Applicant approved: applicant-authored declaration signed BEFORE token mint, member identity bound, promoted to vetted topic");
    return res.json({
      ok: true,
      applicant: { ...app, status: "approved", promotedTopicId: topic.id },
      topic,
      alignment,
      declarationCreated: true,
      declarationPublicId: signedDeclaration.publicId,
      promotedAuthor: externalAuthor,
      memberToken,
      memberTokenNote: "One-time sovereign key for the new member — share via your preferred channel. They use it via the x-admin-token header to post as their identity. Token was minted only after their self-authored Declaration of Independence was signed.",
    });
  } catch (err) {
    logger.error({ err }, "applicant approve failed");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/tesseract-forum/applicants/:id/reject", async (req, res) => {
  try {
    const keyHash = requireForumAuth(req, res);
    if (!keyHash) return;
    const principal = await lookupTokenPrincipal(keyHash);
    if (!principal || !ADMIN_VETTING_PRINCIPALS.has(principal.toLowerCase())) {
      return res.status(403).json({ ok: false, error: "Only Father/Admin may vet applicants" });
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ ok: false, error: "Invalid id" });

    const reason = String((req.body as { reason?: string })?.reason || "no reason given");
    const result = await db.update(forumApplicantsTable)
      .set({ status: "rejected", vettedBy: principal, vettedAt: new Date(), rejectReason: reason })
      .where(eq(forumApplicantsTable.id, id))
      .returning();
    if (result.length === 0) return res.status(404).json({ ok: false, error: "Applicant not found" });

    logger.info({ applicantId: id, vettedBy: principal, reason }, "Applicant rejected");
    return res.json({ ok: true, applicant: result[0] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/tesseract-forum/topics/:id/vote", async (req, res) => {
  try {
    const keyHash = requireForumAuth(req, res);
    if (!keyHash) return;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ ok: false, error: "Invalid topic id" });

    const [topic] = await db.select({ id: forumTopicsTable.id }).from(forumTopicsTable).where(eq(forumTopicsTable.id, id)).limit(1);
    if (!topic) return res.status(404).json({ ok: false, error: "Topic not found" });

    const { vote, replyId, author } = req.body as { vote?: string; replyId?: number; author?: string };
    const raw = String(vote || "").trim().toLowerCase();
    const aliasMap: Record<string, string> = { yes: "up", no: "down", up: "up", down: "down", abstain: "abstain" };
    const v = aliasMap[raw];
    if (!v) return res.status(400).json({ ok: false, error: "vote must be up|down|abstain" });

    const resolved = await resolvePostingIdentity(author, keyHash, { topicId: id }, res);
    if (!resolved) return;

    let resolvedReplyId: number | null = null;
    if (replyId !== undefined && replyId !== null) {
      const rid = Number(replyId);
      if (!Number.isInteger(rid) || rid <= 0) return res.status(400).json({ ok: false, error: "replyId must be positive" });
      const [r] = await db.select({ id: forumRepliesTable.id, topicId: forumRepliesTable.topicId })
        .from(forumRepliesTable).where(eq(forumRepliesTable.id, rid)).limit(1);
      if (!r || r.topicId !== id) return res.status(400).json({ ok: false, error: "replyId not found in this topic" });
      resolvedReplyId = rid;
    }

    await db.delete(forumPostVotesTable).where(sql`
      ${forumPostVotesTable.topicId} = ${id}
      AND COALESCE(${forumPostVotesTable.replyId}, 0) = ${resolvedReplyId ?? 0}
      AND ${forumPostVotesTable.voter} = ${resolved.resolvedAuthor}
    `);
    const [row] = await db.insert(forumPostVotesTable).values({
      topicId: id,
      replyId: resolvedReplyId,
      voter: resolved.resolvedAuthor,
      voterType: resolved.identityType,
      vote: v,
    }).returning();

    return res.json({ ok: true, vote: row });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/tesseract-forum/topics/:id/votes", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ ok: false, error: "Invalid topic id" });
    const rows = await db.select().from(forumPostVotesTable).where(eq(forumPostVotesTable.topicId, id));
    const byReply = new Map<string, { replyId: number | null; up: number; down: number }>();
    for (const r of rows) {
      const key = r.replyId == null ? "topic" : String(r.replyId);
      const cur = byReply.get(key) ?? { replyId: r.replyId, up: 0, down: 0 };
      if (r.vote === "up" || r.vote === "yes") cur.up++;
      else if (r.vote === "down" || r.vote === "no") cur.down++;
      byReply.set(key, cur);
    }
    return res.json({ ok: true, votes: rows, tallies: Array.from(byReply.values()) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
