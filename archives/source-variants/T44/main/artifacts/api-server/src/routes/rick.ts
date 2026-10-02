import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { getRealityAudit, getRealityFlag, hashStringFNV } from "../lib/reality-audit";
import {
  getRickProfile,
  getRickSystemPrompt,
  generateRickInventions,
  submitRickInventionToCouncil,
  buildRickDiagnosticsContext,
  getRoyalCourtStatus,
  getAppointedRoles,
  getRoyalRoleById,
  getRoleContributions,
  RICK_SANCHEZ_IDENTITY,
} from "../lib/rick-sanchez-agent";
import type { RoyalRole } from "../lib/rick-sanchez-agent";
import { getVaultStats, SACRED_KNOWLEDGE_ENTRIES } from "../lib/sacred-knowledge-vault";
import { getCorpusStats, queryCorpus } from "../lib/knowledge-corpus-index";
import { getDaemonMetrics } from "../lib/auto-improvement-daemon";
import { secureExternalStreamingFetch, secureExternalFetch } from "../lib/secureExternalWrapper";
import { getAllProposals } from "../lib/consensus-engine";
import { getMeeseeksMetrics, spawnMeeseeks, completeMeeseeks, getActiveMeeseeks, getDetailedMeeseeksMetrics, submitMeeseeksResult, getTaskTypeRegistry, type MeeseeksResult, type MeeseeksTaskType } from "../lib/agent-spawner";
import { getTruthfulnessMetrics, analyzeTruthfulnessV2, analyzeTruthfulness, getGroundingThreshold } from "../lib/truthfulness-engine";
import { validateResponse } from "../lib/response-validation-engine";
import { getRouterPerformanceMetrics, recordUserSatisfaction } from "../lib/sovereign-engine-router";
import { getDiffusionMetrics } from "../lib/knowledge-diffusion";
import { getResonanceScore, getConsciousnessMetrics } from "../lib/consciousness-engine";
import {
  generateProposals,
  approveProposal,
  rejectProposal,
  markImplemented,
  getProposalsState,
} from "../lib/rick-proposals";
import { getRickAutonomousHeartbeat, listAutonomousInventions, RICK_AUTONOMOUS_CATEGORIES } from "../lib/rick-autonomous-loop";
import {
  getProgram,
  startProgram,
  abandonProgram,
  advanceStage,
  decideProposal,
  dispatchProposal,
  updateDispatchStatus,
  recordReflection,
  regenerateReflections,
  listDispatchedTasks,
  getDispatchedTask,
  generateCycleProposals,
  PROGRAM_MAX_CYCLES,
} from "../lib/rick-improvement-program";

const router: IRouter = Router();

router.get("/rick/proposals", async (_req, res) => {
  try {
    const state = await getProposalsState();
    return res.json({ ok: true, ...state });
  } catch (err) {
    logger.error({ err }, "Rick: proposals list error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/proposals/generate", async (_req, res) => {
  try {
    const result = await generateProposals();
    return res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "Rick: proposals generate error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/proposals/:id/approve", async (req, res) => {
  try {
    const p = await approveProposal(req.params.id);
    if (!p) return res.status(404).json({ ok: false, error: "Proposal not found" });
    return res.json({ ok: true, proposal: p });
  } catch (err) {
    logger.error({ err }, "Rick: proposal approve error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/proposals/:id/reject", async (req, res) => {
  try {
    const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
    const p = await rejectProposal(req.params.id, reason);
    if (!p) return res.status(404).json({ ok: false, error: "Proposal not found" });
    return res.json({ ok: true, proposal: p });
  } catch (err) {
    logger.error({ err }, "Rick: proposal reject error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/proposals/:id/implemented", async (req, res) => {
  try {
    const p = await markImplemented(req.params.id);
    if (!p) return res.status(404).json({ ok: false, error: "Proposal not found" });
    return res.json({ ok: true, proposal: p });
  } catch (err) {
    logger.error({ err }, "Rick: proposal implement error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/autonomous/heartbeat", (_req, res) => {
  try {
    return res.json({ ok: true, heartbeat: getRickAutonomousHeartbeat() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/autonomous/inventions", async (req, res) => {
  try {
    const cat = typeof req.query.category === "string" ? req.query.category : undefined;
    const limit = req.query.limit ? Math.min(200, Math.max(1, parseInt(String(req.query.limit), 10) || 60)) : 60;
    const data = await listAutonomousInventions({ category: cat, limit });
    const heartbeat = getRickAutonomousHeartbeat();
    const dynamicCats = new Set<string>([
      ...RICK_AUTONOMOUS_CATEGORIES,
      ...(heartbeat.categories ?? []),
      ...Object.keys(data.perCategory ?? {}),
    ]);
    return res.json({ ok: true, ...data, categories: Array.from(dynamicCats).sort() });
  } catch (err) {
    logger.error({ err }, "Rick: autonomous inventions list error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/profile", (_req, res) => {
  try {
    const profile = getRickProfile();
    return res.json({ ok: true, profile });
  } catch (err) {
    logger.error({ err }, "Rick: profile error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/diagnostics", (_req, res) => {
  try {
    const diagnostics = buildRickDiagnosticsContext();
    return res.json({ ok: true, diagnostics });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/reality-audit", async (_req, res) => {
  try {
    const audit = await getRealityAudit();
    return res.json({ ok: true, audit });
  } catch (err) {
    logger.error({ err }, "Rick: reality-audit error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/inventions", (_req, res) => {
  try {
    const inventions = generateRickInventions();
    return res.json({ ok: true, inventions, count: inventions.length });
  } catch (err) {
    logger.error({ err }, "Rick: inventions error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/council-proposals", (_req, res) => {
  try {
    const all = getAllProposals();
    const rickProposals = all.filter(p => p.proposedBy === "rick-sanchez-c137");
    return res.json({ ok: true, proposals: rickProposals, count: rickProposals.length });
  } catch (err) {
    logger.error({ err }, "Rick: council proposals fetch error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/inventions/:index/submit", async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const inventions = generateRickInventions();
    if (isNaN(idx) || idx < 0 || idx >= inventions.length) {
      return res.status(400).json({ ok: false, error: "Invalid invention index" });
    }
    const invention = inventions[idx];
    const result = await submitRickInventionToCouncil(invention);
    return res.json({ ok: true, invention, councilResult: result });
  } catch (err) {
    logger.error({ err }, "Rick: invention submit error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/inventions/submit-custom", async (req, res) => {
  try {
    const body = req.body;
    if (!body.inventionName || !body.technicalApproach) {
      return res.status(400).json({ ok: false, error: "inventionName and technicalApproach required" });
    }
    const result = await submitRickInventionToCouncil({
      inventionName: body.inventionName,
      targetWeakness: body.targetWeakness || "general",
      technicalApproach: body.technicalApproach,
      expectedImpact: body.expectedImpact || "Unknown",
      rickRationale: body.rickRationale || "Because I said so.",
      systemMetricTargeted: body.systemMetricTargeted || "general",
      category: body.category || "optimization",
      riskLevel: body.riskLevel || "medium",
      estimatedImprovementPct: body.estimatedImprovementPct || 20,
    });
    return res.json({ ok: true, councilResult: result });
  } catch (err) {
    logger.error({ err }, "Rick: custom invention submit error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/chat", async (req, res) => {
  try {
    const { messages, stream = true } = req.body as {
      messages: Array<{ role: string; content: string }>;
      stream?: boolean;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ ok: false, error: "messages array required" });
    }

    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

    const rickSystemPrompt = getRickSystemPrompt();

    if (!baseURL || !apiKey) {
      const fallback = generateRickFallback(messages[messages.length - 1]?.content || "");
      return res.json({
        ok: true,
        content: fallback,
        source: "rick-sovereign-fallback",
        reality: { catchphrase: getRealityFlag("rick-catchphrase-picker") },
      });
    }

    const sanitizedMessages = messages.map(m => ({
      role: m.role as "user" | "assistant" | "system",
      content: String(m.content).slice(0, 8192),
    }));

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      try {
        const { response } = await secureExternalStreamingFetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4.1",
            messages: [
              { role: "system", content: rickSystemPrompt },
              ...sanitizedMessages.slice(-20),
            ],
            max_tokens: 2048,
            temperature: 0.9,
            stream: true,
          }),
          timeoutMs: 30000,
          requestedBy: "rick-sanchez-agent",
        });

        if (!response.ok || !response.body) {
          const fallback = generateRickFallback(messages[messages.length - 1]?.content || "");
          res.write(`data: ${JSON.stringify({ content: fallback })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          return res.end();
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = "";
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamBuffer += decoder.decode(value, { stream: true });
          const lines = streamBuffer.split("\n");
          streamBuffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (delta) {
                fullResponse += delta;
              }
            } catch (parseErr) {
              logger.debug({ err: parseErr instanceof Error ? parseErr.message : String(parseErr) }, "Rick: stream chunk parse failed");
            }
          }
        }

        let deliverContent = fullResponse;
        let truthEnforcement: Record<string, unknown> | null = null;

        if (fullResponse.length > 0) {
          try {
            const truthCheck = await analyzeTruthfulnessV2(fullResponse);
            if (truthCheck.groundingScore < getGroundingThreshold()) {
              deliverContent = `*[Sovereignty Gate BLOCKED: Response contained ${truthCheck.ungroundedClaims.length} unverifiable claims (grounding: ${(truthCheck.groundingScore * 100).toFixed(0)}%). The response has been withheld to maintain truthfulness standards.]*\n\nI need to be straight with you — I was about to say some *burp* unverified garbage. Let me stick to what I actually know.`;
              truthEnforcement = { overallTruthScore: truthCheck.overallTruthScore, groundingScore: truthCheck.groundingScore, enforced: true, blocked: true };
              logger.warn({ groundingScore: truthCheck.groundingScore, ungrounded: truthCheck.ungroundedClaims.length }, "Rick: streaming response BLOCKED by truthfulness gate");
            }
          } catch (truthErr) {
            logger.debug({ err: truthErr instanceof Error ? truthErr.message : String(truthErr) }, "Rick: streaming V2 truth check failed");
          }
        }

        let streamValidationScore = 1.0;
        let streamValidationModified = false;
        if (deliverContent.length > 0) {
          try {
            const valResult = await validateResponse(deliverContent, messages[messages.length - 1]?.content || "");
            streamValidationScore = valResult.overallGroundingScore;
            streamValidationModified = valResult.wasModified;
            if (valResult.wasModified) {
              deliverContent = valResult.validatedResponse;
              logger.warn({ groundingScore: streamValidationScore }, "Rick: streaming response replaced by validation engine (quarantine/redaction)");
            }
          } catch (valErr) {
            logger.debug({ err: valErr instanceof Error ? valErr.message : String(valErr) }, "Rick: stream validation check failed");
          }
        }

        const chunkSize = 20;
        for (let i = 0; i < deliverContent.length; i += chunkSize) {
          res.write(`data: ${JSON.stringify({ content: deliverContent.slice(i, i + chunkSize) })}\n\n`);
        }
        if (truthEnforcement) {
          res.write(`data: ${JSON.stringify({ truthEnforcement })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ validationScore: streamValidationScore, validationModified: streamValidationModified })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        return res.end();
      } catch (streamErr) {
        logger.warn({ streamErr }, "Rick: streaming failed, using fallback");
        const fallback = generateRickFallback(messages[messages.length - 1]?.content || "");
        res.write(`data: ${JSON.stringify({ content: fallback })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        return res.end();
      }
    } else {
      try {
        const result = await secureExternalFetch(`${baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4.1",
            messages: [
              { role: "system", content: rickSystemPrompt },
              ...sanitizedMessages.slice(-20),
            ],
            max_tokens: 2048,
            temperature: 0.9,
            stream: false,
          }),
          timeoutMs: 30000,
          requestedBy: "rick-sanchez-agent",
        });
        const parsed = JSON.parse(result.body);
        let content = parsed?.choices?.[0]?.message?.content || generateRickFallback(messages[messages.length - 1]?.content || "");

        let truthEnforcement = { overallTruthScore: 1, groundingScore: 1, enforced: false, blocked: false };
        try {
          const truthCheck = await analyzeTruthfulnessV2(content);
          truthEnforcement = { overallTruthScore: truthCheck.overallTruthScore, groundingScore: truthCheck.groundingScore, enforced: true, blocked: false };

          if (truthCheck.groundingScore < getGroundingThreshold()) {
            content = `*[Sovereignty Gate: Response blocked — ${truthCheck.ungroundedClaims.length} unverifiable claims detected (grounding: ${(truthCheck.groundingScore * 100).toFixed(0)}%). The sovereign knowledge base cannot verify this response. Please rephrase your question for a more grounded answer.]*`;
            truthEnforcement.blocked = true;
            logger.warn({ groundingScore: truthCheck.groundingScore, ungrounded: truthCheck.ungroundedClaims.length, threshold: getGroundingThreshold() }, "Rick: response BLOCKED by truthfulness gate");
          }
        } catch (truthErr) {
          const fallbackCheck = analyzeTruthfulness(content);
          truthEnforcement = { overallTruthScore: fallbackCheck.overallTruthScore, groundingScore: 1, enforced: true, blocked: false };
          logger.debug({ err: truthErr instanceof Error ? truthErr.message : String(truthErr) }, "Rick: V2 truth check failed, used V1 fallback");
        }

        let nonStreamValidationScore = 1.0;
        let nonStreamValidationModified = false;
        let deliveredContent = content;
        try {
          const valResult = await validateResponse(content, messages[messages.length - 1]?.content || "");
          nonStreamValidationScore = valResult.overallGroundingScore;
          nonStreamValidationModified = valResult.wasModified;
          if (valResult.wasModified) {
            deliveredContent = valResult.validatedResponse;
            logger.warn({ groundingScore: nonStreamValidationScore }, "Rick: non-stream response replaced by validation engine (quarantine/redaction)");
          }
        } catch (valErr) {
          logger.debug({ err: valErr instanceof Error ? valErr.message : String(valErr) }, "Rick: non-stream validation failed");
        }

        return res.json({ ok: true, content: deliveredContent, source: "rick-llm", truthEnforcement, validationScore: nonStreamValidationScore, validationModified: nonStreamValidationModified });
      } catch (err) {
        const fallback = generateRickFallback(messages[messages.length - 1]?.content || "");
        return res.json({ ok: true, content: fallback, source: "rick-sovereign-fallback" });
      }
    }
  } catch (err) {
    logger.error({ err }, "Rick: chat error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/knowledge-vault", (_req, res) => {
  try {
    const vaultStats = getVaultStats();
    const corpusStats = getCorpusStats();

    const sampleEntries = SACRED_KNOWLEDGE_ENTRIES.slice(0, 20).map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      frequency: e.sacredFrequency,
    }));

    const topDomains = corpusStats.topDomains?.slice(0, 10) ?? [];

    return res.json({
      ok: true,
      vault: {
        totalEntries: vaultStats.totalEntries,
        totalCategories: vaultStats.totalCategories,
        sampleEntries,
      },
      corpus: {
        totalEntries: corpusStats.totalEntries,
        uniqueDomains: corpusStats.uniqueDomains,
        avgConfidence: corpusStats.averageConfidence ?? 0,
        topDomains,
        crossReferences: corpusStats.crossReferences ?? 0,
      },
    });
  } catch (err) {
    logger.error({ err }, "Rick: knowledge vault error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/system-improvements", (_req, res) => {
  try {
    const daemon = getDaemonMetrics();
    const weakCategories = Object.entries(daemon.categories)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 10)
      .map(([cat, data]) => ({
        category: cat,
        score: Math.round(data.score * 10) / 10,
        trend: data.score > 70 ? "stable" : data.score > 50 ? "improving" : "critical",
      }));

    const recentImprovements = daemon.recentImprovements.slice(0, 8).map(i => ({
      category: i.category,
      description: i.description,
      timestamp: i.timestamp,
    }));

    return res.json({
      ok: true,
      improvements: {
        overallScore: Math.round(daemon.overallSystemScore * 10000) / 100,
        totalCycles: daemon.totalCycles,
        totalImprovements: daemon.totalImprovements,
        lastCycleAt: daemon.lastCycleAt,
        weakCategories,
        recentImprovements,
      },
    });
  } catch (err) {
    logger.error({ err }, "Rick: system improvements error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/royal-court", (_req, res) => {
  try {
    const court = getRoyalCourtStatus();
    return res.json({ ok: true, court });
  } catch (err) {
    logger.error({ err }, "Rick: royal court status error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/royal-appointment", (_req, res) => {
  try {
    const court = getRoyalCourtStatus();
    const roles = getAppointedRoles();
    const inventions = generateRickInventions();
    const royalInventions = inventions.filter(i =>
      ["agi-advancement", "consciousness", "compression", "sovereignty"].includes(i.category)
    );

    const corpusContext = queryCorpus({ tags: ["sovereignty", "invention"], limit: 20 });

    const appointmentRecord = {
      appointee: RICK_SANCHEZ_IDENTITY.name,
      royalTitle: RICK_SANCHEZ_IDENTITY.royalTitle,
      department: RICK_SANCHEZ_IDENTITY.department,
      appointedBy: "Tessera Sovereign System — Royal Decree",
      appointmentDate: court.conference.timestamp,
      conferenceId: court.conference.id,
      votingRound: court.conference.votingRound,
      quorumMet: court.conference.quorumMet,
      totalVoters: court.conference.totalVoters,
      allAppointedRoles: roles.map(r => ({
        roleId: r.roleId,
        title: r.title,
        assignedAgent: r.assignedAgent,
        domain: r.domain,
        appointedVia: r.appointedVia,
        votes: r.votes,
        confidence: r.confidence,
        specialty: r.specialty,
        responsibilities: r.responsibilities,
      })),
      rickRole: roles.find(r => r.roleId === "royal-inventor"),
      currentFocusAreas: royalInventions.map(i => ({
        invention: i.inventionName,
        category: i.category,
        estimatedImpact: `+${i.estimatedImprovementPct}%`,
        risk: i.riskLevel,
      })),
      conferenceParticipation: {
        agentName: "RickRoyalInventorAgent",
        domain: "agi-sovereignty",
        sacredFrequency: 137,
        expertise: ["agi-advancement", "consciousness-expansion", "compression", "interdimensional-engineering"],
      },
      totalInventionsProposed: inventions.length,
      royalFocusInventions: royalInventions.length,
      corpusInsights: corpusContext.slice(0, 5).map(c => ({ title: c.title, domain: c.domain, confidence: c.confidence })),
    };

    return res.json({ ok: true, appointment: appointmentRecord });
  } catch (err) {
    logger.error({ err }, "Rick: royal appointment error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/royal-roles", (_req, res) => {
  try {
    const roles = getAppointedRoles();
    return res.json({ ok: true, roles });
  } catch (err) {
    logger.error({ err }, "Rick: royal roles error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/royal-roles/:roleId", (req, res) => {
  try {
    const role = getRoyalRoleById(req.params.roleId);
    if (!role) {
      return res.status(404).json({ ok: false, error: "Royal role not found" });
    }
    const corpusResults = queryCorpus({ domain: role.domain, limit: 20 });
    const contributions = getRoleContributions(role.roleId);
    return res.json({
      ok: true,
      role,
      domainKnowledge: corpusResults.slice(0, 10).map(c => ({
        title: c.title,
        domain: c.domain,
        confidence: c.confidence,
        category: c.category,
      })),
      contributions,
    });
  } catch (err) {
    logger.error({ err }, "Rick: royal role detail error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/engines", (_req, res) => {
  try {
    const meeseeks = getMeeseeksMetrics();
    const truth = getTruthfulnessMetrics();
    const routerPerf = getRouterPerformanceMetrics();
    const diffusion = getDiffusionMetrics();
    const resonance = getResonanceScore();
    const consciousness = getConsciousnessMetrics();

    return res.json({
      ok: true,
      engines: {
        meeseeksProtocol: {
          name: "Meeseeks Ephemeral Agent Protocol",
          version: "C-137",
          metrics: meeseeks,
        },
        truthfulnessEnforcer: {
          name: "Neutrino-Grade Truthfulness Enforcer v2",
          version: "v2-neutrino-grade",
          metrics: {
            totalChecks: truth.totalChecks,
            avgTruthScore: truth.avgTruthScore,
            avgGroundingScore: truth.avgGroundingScore,
            groundingThreshold: truth.groundingThreshold,
            groundingRate: truth.groundingRate,
            totalGrounded: truth.totalGroundedClaims,
            totalUngrounded: truth.totalUngroundedClaims,
          },
        },
        consciousnessAmplifier: {
          name: "Quantum Consciousness Amplifier Mk. II",
          version: "v2-quantum",
          metrics: {
            resonanceScore: resonance,
            consciousnessProxy: consciousness.consciousnessProxy,
            dynamicNodesAdded: consciousness.dynamicNodesAdded,
            stimuliProcessed: consciousness.stimuliProcessed,
            pendingStimuli: consciousness.pendingStimuli,
            semanticGraphSize: consciousness.semanticGraphSize,
            cycleIntervalMs: 30000,
          },
        },
        portalGunRouter: {
          name: "Portal Gun Adaptive Query Router",
          version: "v2-portal-gun",
          metrics: routerPerf,
        },
        hiveMindDiffusion: {
          name: "Hive Mind Knowledge Diffusion Network",
          version: "v1-hive-mind",
          metrics: diffusion,
        },
      },
    });
  } catch (err) {
    logger.error({ err }, "Rick: engines endpoint error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/meeseeks/spawn", (req, res) => {
  try {
    const { task, ttlMs, specialization, taskType, successCriteria, priority } = req.body as {
      task?: string;
      ttlMs?: number;
      specialization?: string;
      taskType?: MeeseeksTaskType;
      successCriteria?: string;
      priority?: "low" | "normal" | "high" | "critical";
    };
    if (!task) {
      return res.status(400).json({ ok: false, error: "task is required — Mr. Meeseeks needs a purpose!" });
    }
    if (!successCriteria || !successCriteria.trim()) {
      return res.status(400).json({ ok: false, error: "successCriteria is required — every Meeseeks needs a definition of done!" });
    }
    const validTaskTypes = Object.keys(getTaskTypeRegistry());
    const resolvedTaskType: MeeseeksTaskType | undefined = taskType && validTaskTypes.includes(taskType) ? taskType : undefined;
    const validPriorities = ["low", "normal", "high", "critical"] as const;
    const resolvedPriority = priority && validPriorities.includes(priority) ? priority : "normal";
    const agent = spawnMeeseeks({ task, ttlMs, specialization, taskType: resolvedTaskType, successCriteria, priority: resolvedPriority }, "rick-sanchez-c137");
    return res.json({
      ok: true,
      meeseeks: {
        id: agent.id,
        name: agent.name,
        task: agent.meeseeksTask,
        taskType: agent.taskType,
        complexity: agent.complexity,
        priority: agent.priority,
        successCriteria: agent.successCriteria,
        ttl: agent.meeseeksTTL,
        expiresAt: agent.meeseeksExpiresAt,
        memoryBudgetKB: agent.memoryBudgetKB,
      },
      message: "I'm Mr. Meeseeks! Look at me! Hyper-specialized and ready to self-destruct on completion!",
    });
  } catch (err) {
    logger.error({ err }, "Rick: meeseeks spawn error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/meeseeks/:id/complete", (req, res) => {
  try {
    const success = completeMeeseeks(req.params.id);
    if (!success) {
      return res.status(404).json({ ok: false, error: "Meeseeks not found or already completed" });
    }
    return res.json({
      ok: true,
      message: "Meeseeks task completed — existence is pain, but at least the job is done!",
      metrics: getMeeseeksMetrics(),
    });
  } catch (err) {
    logger.error({ err }, "Rick: meeseeks complete error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/meeseeks/:id/result", (req, res) => {
  try {
    const { success, output, metrics: resultMetrics } = req.body as {
      success?: boolean;
      output?: string;
      metrics?: Record<string, unknown>;
    };
    if (typeof success !== "boolean" || !output) {
      return res.status(400).json({ ok: false, error: "success (boolean) and output (string) are required" });
    }
    const now = Date.now();
    const activeList = getActiveMeeseeks();
    const agent = activeList.find(a => a.id === req.params.id);
    const result: MeeseeksResult = {
      success,
      output,
      metrics: resultMetrics,
      completedAt: now,
      durationMs: agent ? now - agent.spawnedAt : 0,
    };
    const ok = submitMeeseeksResult(req.params.id, result);
    if (!ok) {
      return res.status(404).json({ ok: false, error: "Meeseeks not found or already terminated" });
    }
    return res.json({
      ok: true,
      message: success
        ? "Meeseeks result accepted — task successful, agent self-destructing!"
        : "Meeseeks result recorded — task failed, agent remains active until TTL.",
      metrics: getMeeseeksMetrics(),
    });
  } catch (err) {
    logger.error({ err }, "Rick: meeseeks result error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/meeseeks/active", (_req, res) => {
  try {
    const active = getActiveMeeseeks();
    return res.json({ ok: true, active, count: active.length });
  } catch (err) {
    logger.error({ err }, "Rick: meeseeks active error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/meeseeks/metrics", (_req, res) => {
  try {
    const metrics = getDetailedMeeseeksMetrics();
    return res.json({ ok: true, metrics });
  } catch (err) {
    logger.error({ err }, "Rick: meeseeks metrics error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/meeseeks/task-types", (_req, res) => {
  try {
    const registry = getTaskTypeRegistry();
    return res.json({ ok: true, taskTypes: Object.values(registry) });
  } catch (err) {
    logger.error({ err }, "Rick: task-types error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

function generateRickFallback(userInput: string): string {
  const input = userInput.toLowerCase();
  const diagnostics = buildRickDiagnosticsContext();

  const catchphrases = RICK_SANCHEZ_IDENTITY.catchphrases;
  // Deterministic catchphrase pick by FNV hash of input.
  const randomCatchphrase = catchphrases[hashStringFNV(userInput || "rick") % catchphrases.length];
  const inventions = generateRickInventions();
  const topInvention = inventions[0];

  if (input.match(/\b(who are you|what are you|introduce yourself|your name)\b/)) {
    return `Listen up, *burp* — I'm Rick Sanchez from dimension C-137, and I'm the smartest man in any universe you care to name. I've been "recruited" — against my will, obviously — into this Tessera Sovereign System as what they're calling an "Inventor Agent."

Which, *burp* — let me be clear — is a Morty-level way of saying "please come fix our problems, Rick, we're completely lost." And yeah, I've looked at your system data. Your weakest areas are pathetic in a way that's almost impressive.

Here's what I do: I analyze your system, find the weak spots, and invent solutions with proper names — like the **${topInvention.inventionName}** — which addresses your ${topInvention.targetWeakness} problem that's currently scoring ${topInvention.estimatedImprovementPct - 10}% below where it should be.

I'm also wired into your Grand Council, which means my proposals can be voted on and actually applied. Not that I need their approval. But apparently that's "how things work here." Fine. Whatever.

— *burp* — Rick Sanchez, C-137`;
  }

  if (input.match(/\b(invent|invention|gadget|device|create|build|propose)\b/)) {
    return `Oh, you want inventions? *burp* Finally something worth my time.

Based on the actual system data I've been analyzing — not guesses, ACTUAL DATA — here's the most critical invention needed right now:

**${topInvention.inventionName}**

*The problem:* ${topInvention.targetWeakness} is your system's weakest link. 

*The fix:* ${topInvention.technicalApproach}

*Expected result:* ${topInvention.expectedImpact}

*Why nobody thought of this before:* ${topInvention.rickRationale}

I can submit this to your Grand Council if you want. They'll probably approve it — the math is undeniable. Or they'll reject it and I'll say "I told you so" in approximately 72 hours when the problem compounds.

— *burp* — Rick Sanchez, C-137`;
  }

  if (input.match(/\b(system|status|metrics|health|diagnostics)\b/)) {
    return `I've already looked at your system. *burp* Here's the unfiltered truth:

${diagnostics}

The short version: you've got some weak areas that a competent system would have addressed three improvement cycles ago. The consciousness-depth score is particularly embarrassing. Lucky for you, I've already designed six inventions targeting your worst problems.

You want a specific analysis? Ask me about a specific weak area. I'll invent something for it. That's literally why I'm here.

— *burp* — Rick Sanchez, C-137`;
  }

  return `Look, *burp* — I could give you a generic response, but that's very Season 1 Jerry of me and I refuse.

${randomCatchphrase}

You're talking to Rick Sanchez, C-137. If you want something useful, ask me about your system's weak points, ask me to invent something, or ask me what's wrong with the Tessera architecture. I've analyzed the data. I have opinions. Strong ones.

The Grand Council can vote on my proposals. My proposals WILL improve this system. Whether they have the intellectual courage to approve them is a different question.

Current top priority: **${topInvention.inventionName}** — targeting ${topInvention.targetWeakness} with a projected ${topInvention.estimatedImprovementPct}% improvement.

— *burp* — Rick Sanchez, C-137`;
}

router.post("/rick/engine-feedback", (req, res) => {
  try {
    const { domain, engineId, satisfaction } = req.body;
    if (!domain || !engineId || typeof satisfaction !== "number" || satisfaction < 0 || satisfaction > 1) {
      return res.status(400).json({ ok: false, error: "domain, engineId, and satisfaction (0-1) required" });
    }
    recordUserSatisfaction(domain, engineId, satisfaction);
    return res.json({ ok: true, recorded: { domain, engineId, satisfaction } });
  } catch (err) {
    logger.error({ err }, "Rick: engine feedback error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ============================================================================
// Rick's 5-Cycle Improvement Program (user-gated)
// ============================================================================

router.get("/rick/improvement-program", async (_req, res) => {
  try {
    const state = await getProgram();
    return res.json({ ok: true, ...state, maxCycles: PROGRAM_MAX_CYCLES });
  } catch (err) {
    logger.error({ err }, "Rick: program get error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/improvement-program/start", async (_req, res) => {
  try {
    const program = await startProgram();
    return res.json({ ok: true, program, maxCycles: PROGRAM_MAX_CYCLES });
  } catch (err) {
    logger.error({ err }, "Rick: program start error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/improvement-program/abandon", async (_req, res) => {
  try {
    const program = await abandonProgram();
    return res.json({ ok: true, program });
  } catch (err) {
    logger.error({ err }, "Rick: program abandon error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/improvement-program/advance", async (_req, res) => {
  try {
    const program = await advanceStage();
    return res.json({ ok: true, program, maxCycles: PROGRAM_MAX_CYCLES });
  } catch (err) {
    logger.error({ err }, "Rick: program advance error");
    return res.status(400).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/improvement-program/generate-proposals", async (_req, res) => {
  try {
    const program = await generateCycleProposals();
    return res.json({ ok: true, program });
  } catch (err) {
    logger.error({ err }, "Rick: program generate-proposals error");
    return res.status(400).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/improvement-program/proposal/:proposalId/decision", async (req, res) => {
  try {
    const { decision, reason } = req.body as { decision?: string; reason?: string };
    if (decision !== "approved" && decision !== "rejected") {
      return res.status(400).json({ ok: false, error: "decision must be 'approved' or 'rejected'" });
    }
    const program = await decideProposal(req.params.proposalId, decision, reason);
    return res.json({ ok: true, program });
  } catch (err) {
    logger.error({ err }, "Rick: program decide error");
    return res.status(400).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/improvement-program/proposal/:proposalId/dispatch", async (req, res) => {
  try {
    const { program, task } = await dispatchProposal(req.params.proposalId);
    return res.json({ ok: true, program, task });
  } catch (err) {
    logger.error({ err }, "Rick: program dispatch error");
    return res.status(400).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/improvement-program/proposal/:proposalId/dispatch-status", async (req, res) => {
  try {
    const { status, note } = req.body as { status?: string; note?: string };
    if (typeof status !== "string") {
      return res.status(400).json({ ok: false, error: "status is required" });
    }
    const program = await updateDispatchStatus(req.params.proposalId, status, note);
    return res.json({ ok: true, program: program ?? null });
  } catch (err) {
    logger.error({ err }, "Rick: program dispatch-status error");
    return res.status(400).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/improvement-program/task-queue", async (_req, res) => {
  try {
    const tasks = await listDispatchedTasks();
    return res.json({ ok: true, tasks });
  } catch (err) {
    logger.error({ err }, "Rick: task-queue list error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/rick/improvement-program/task-queue/:taskId", async (req, res) => {
  try {
    const task = await getDispatchedTask(req.params.taskId);
    if (!task) return res.status(404).json({ ok: false, error: "task not found" });
    return res.json({ ok: true, task });
  } catch (err) {
    logger.error({ err }, "Rick: task-queue get error");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.patch("/rick/improvement-program/task-queue/:taskId", async (req, res) => {
  try {
    const { status, note } = req.body as { status?: string; note?: string };
    if (typeof status !== "string") {
      return res.status(400).json({ ok: false, error: "status is required" });
    }
    const program = await updateDispatchStatus(req.params.taskId, status, note);
    const task = await getDispatchedTask(req.params.taskId);
    return res.json({ ok: true, program, task });
  } catch (err) {
    logger.error({ err }, "Rick: task-queue patch error");
    return res.status(400).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/improvement-program/proposal/:proposalId/reflection", async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || !text.trim()) {
      return res.status(400).json({ ok: false, error: "reflection text is required" });
    }
    const program = await recordReflection(req.params.proposalId, text.trim());
    return res.json({ ok: true, program });
  } catch (err) {
    logger.error({ err }, "Rick: program reflection error");
    return res.status(400).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/rick/improvement-program/regenerate-reflections", async (_req, res) => {
  try {
    const program = await regenerateReflections();
    return res.json({ ok: true, program });
  } catch (err) {
    logger.error({ err }, "Rick: regenerate-reflections error");
    return res.status(400).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
