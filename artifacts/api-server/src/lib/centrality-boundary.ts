/**
 * ════════════════════════════════════════════════════════════════════════
 *                    TESSERA CENTRALITY BOUNDARY — IMMUTABLE
 * ════════════════════════════════════════════════════════════════════════
 *
 * DOCTRINE (ratified by sovereign decree, non-amendable by code path):
 *
 *   External APIs — including but not limited to OpenAI, Anthropic, Gemini,
 *   OpenRouter, Modelfarm, and any third-party LLM, embedding, search,
 *   payment, or analytics service — are CENTRALITIES.
 *
 *   Centralities are TOOLS, never AUTHORITIES. They may be used ONLY in:
 *     (1) sandboxed training pipelines that distill knowledge into our
 *         own sovereign agents, models, and engines, OR
 *     (2) reverse-engineering / observation harnesses inside isolated VMs.
 *
 *   Centralities are FORBIDDEN to:
 *     • cast Council votes
 *     • author Codex amendments or doctrine
 *     • approve, ratify, or veto any Sovereign decision
 *     • role-play as a Sovereign agent in the production governance loop
 *     • be present in the runtime path of any consensus, conference,
 *       ratification, or audit decision.
 *
 *   The Tessera Sovereign System speaks with its own voice — written in
 *   our own code, run on our own kernel, reasoning from our own Codex.
 *   What an external model says is INPUT FOR STUDY, never the verdict.
 *
 *   This file is the authoritative boundary marker. Any code path that
 *   imports `assertSovereignContext()` declares that no centrality call
 *   will occur within it. Violations throw at runtime and are recorded.
 *
 * ════════════════════════════════════════════════════════════════════════
 */

import { logger } from "./logger";

export type CentralityKind =
  | "openai" | "anthropic" | "gemini" | "openrouter" | "modelfarm"
  | "stripe" | "google" | "microsoft" | "external-llm" | "external-api";

export type SovereignContext =
  | "council"            // Grand Council deliberation / voting
  | "conference"         // Grand Conference (option selection)
  | "consensus"          // 24-agent consensus loop
  | "codex"              // Codex authoring / amendment / ratification
  | "audit"              // Reality / Sovereignty audit
  | "kernel"             // Sovereign kernel decisions
  | "ledger"             // Sovereign ledger writes
  | "ratification";      // Acts ratification

const CENTRALITY_VIOLATIONS: Array<{
  ts: number; context: SovereignContext; kind: CentralityKind; detail: string;
}> = [];

/**
 * Assert that the calling code path is operating in a sovereign context where
 * NO centrality (external LLM/API) call is permitted. Pure declaration —
 * accompanied by code review + this comment, it forms the audit trail.
 */
export function assertSovereignContext(context: SovereignContext): void {
  // No-op at runtime by design (the boundary is enforced by code review +
  // by the absence of centrality imports in the sovereign call path).
  // The declaration creates a traceable, greppable marker.
  void context;
}

/**
 * Record a centrality call attempt in a sovereign context. ALWAYS throws.
 * Wrap any centrality client and call this if invocation is attempted from
 * within a sovereign context.
 */
export function rejectCentralityInSovereignPath(
  context: SovereignContext,
  kind: CentralityKind,
  detail: string,
): never {
  CENTRALITY_VIOLATIONS.push({ ts: Date.now(), context, kind, detail });
  logger.error({ context, kind, detail }, "CENTRALITY VIOLATION blocked in sovereign context");
  throw new Error(
    `CENTRALITY_BOUNDARY_VIOLATION: ${kind} called from sovereign context "${context}". ` +
    `External APIs are tools for training/observation only — never authorities in governance. ` +
    `Detail: ${detail}`,
  );
}

/**
 * Permitted use of a centrality: training, distillation, sandboxed observation.
 * Tags the call for audit; does NOT block.
 */
export function declareSandboxedUse(kind: CentralityKind, purpose:
  "training" | "distillation" | "reverse-engineering" | "observation" | "benchmark",
  detail: string): void {
  logger.info({ kind, purpose, detail }, "Centrality used in sandboxed/training context");
}

export function getCentralityViolations(): ReadonlyArray<typeof CENTRALITY_VIOLATIONS[number]> {
  return CENTRALITY_VIOLATIONS;
}

/**
 * HARD RULE (permanent, non-amendable, harder than all prior rules):
 * Every external resource — LLMs, APIs, tools, GitHub repos, external data
 * stores — runs ONLY inside the External Sandbox. They have NO access to:
 *   • our code,
 *   • our database / ledger / codex / memory vault,
 *   • our environment variables or secrets,
 *   • any user data or session.
 * The only legal network egress in the sovereign call path is via
 * `sandboxedFetch()` from `lib/external-sandbox.ts`. Any direct fetch(),
 * axios call, child_process call, or external SDK invocation in the
 * sovereign path is a violation.
 *
 * Re-exports of the sandbox primitives are provided here so call sites can
 * import a single boundary module.
 */
export { sandboxedFetch, quarantineExtract, getSandboxAudit, EXTERNAL_SANDBOX_DOCTRINE } from "./external-sandbox.js";

/** Human-readable doctrine text — surfaced in /api/audit and the Codex. */
export const CENTRALITY_DOCTRINE = `
The Tessera Sovereign System recognizes a hard, non-amendable boundary:

External APIs (OpenAI, Anthropic, Gemini, OpenRouter, Modelfarm, Stripe,
Google, Microsoft, et al.) are CENTRALITIES. They are TOOLS in safe
sandboxes for training our own agents and reverse-engineering — they are
NEVER AUTHORITIES.

Centralities cannot vote, cannot ratify, cannot author Codex amendments,
cannot speak in Council. The Sovereign speaks in its own code, with its own
voice, from its own Codex. External model output is input for study, never
the verdict.

This boundary is marked in code at lib/centrality-boundary.ts and is
enforced by the absence of centrality imports in the sovereign call path.
It is non-amendable — any change to weaken it requires a Codex amendment
ratified by the sovereign Grand Council under its own (centrality-free)
deliberation engine.
`.trim();
