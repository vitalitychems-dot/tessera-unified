import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { join, resolve, sep } from "path";
import { logger } from "./logger";
import { createProposal } from "./consensus-engine";
import { isLLMAvailable } from "./llm-client";
import { batchedCallLLM } from "./llm-batcher";
import { isModuleCoolingDown, recordEvolutionSuccess, recordEvolutionFailure, shouldSkipEvolutionForLoad } from "./evolution-throttle";
import { verifyPatchInSandbox, type SandboxFn } from "./evolution-sandbox";
import { recordAttempt } from "./evolution-attempt-ledger";

const EVOLUTION_QUEUE_DIR = join(process.cwd(), "_evolutions");
const SOURCE_LIB_DIR = join(process.cwd(), "src", "lib");

function ensureEvolutionDir(): void {
  if (!existsSync(EVOLUTION_QUEUE_DIR)) {
    mkdirSync(EVOLUTION_QUEUE_DIR, { recursive: true });
  }
}

function evolutionFilePath(proposalId: string): string {
  return join(EVOLUTION_QUEUE_DIR, `${proposalId}.json`);
}

function findSourceFilePath(targetModule: string): string | null {
  // Reject path traversal: no slashes or dotdot allowed in module name
  if (/[/\\]/.test(targetModule) || targetModule.includes("..")) return null;
  const baseName = targetModule.endsWith(".ts") ? targetModule : `${targetModule}.ts`;
  const candidate = join(SOURCE_LIB_DIR, baseName);
  const allowedRoot = resolve(SOURCE_LIB_DIR);
  const resolved = resolve(candidate);
  // Must stay strictly inside the lib directory
  if (!resolved.startsWith(allowedRoot + sep)) return null;
  if (existsSync(resolved)) return resolved;
  return null;
}

/**
 * Production apply pipeline. Composes:
 *   1. compute patched content (via LLM if available)
 *   2. delegate to applyVerifiedPatch which gates on the sandbox
 */
async function applyPatchToSourceFile(
  targetModule: string,
  proposedChange: string,
  proposalId: string,
  sandboxFn?: SandboxFn,
): Promise<{ sourceFilePath: string; backupPath: string; patchedLines: number }> {
  const sourceFilePath = findSourceFilePath(targetModule);
  if (!sourceFilePath) {
    throw new Error(`Source file not found for module: ${targetModule}`);
  }

  const originalContent = readFileSync(sourceFilePath, "utf8");
  ensureEvolutionDir();
  const backupPath = join(EVOLUTION_QUEUE_DIR, `${proposalId}-backup.ts.bak`);
  writeFileSync(backupPath, originalContent, "utf8");

  let codeToAppend = "";

  if (isLLMAvailable()) {
    const excerpt = originalContent.slice(0, 2500);
    let raw = "";
    try {
      raw = await batchedCallLLM(
        [
          {
            role: "system",
            content: `You are a TypeScript code transformation engine. Given a TypeScript source file excerpt and a change request, generate ONLY the minimal valid TypeScript code to append to the end of the file that implements the requested change. Return ONLY compilable TypeScript — no markdown fencing, no explanations, no comments other than JSDoc if appropriate. If the change cannot be implemented as an appended snippet, return an empty string.`,
          },
          {
            role: "user",
            content: `File: ${targetModule}\n\nSource excerpt:\n${excerpt}\n\nChange to implement: ${proposedChange}\n\nGenerate valid TypeScript code to append:`,
          },
        ],
        { maxTokens: 500, timeoutMs: 10_000 },
      );
    } catch { raw = ""; }
    codeToAppend = raw.replace(/^```(?:typescript)?\n?/m, "").replace(/\n?```$/m, "").trim();
  }

  if (!codeToAppend || codeToAppend.length < 5) {
    // Live file untouched — nothing to revert
    recordAttempt({
      proposalId,
      event: "SANDBOXED_FAIL",
      targetModule,
      reason: "LLM did not generate executable TypeScript",
    });
    throw new Error("LLM did not generate executable TypeScript for this proposal — rejecting to avoid non-functional patch");
  }

  const patchedContent = `${originalContent}\n${codeToAppend}\n`;
  const result = await applyVerifiedPatch({
    sourceFilePath,
    originalContent,
    patchedContent,
    proposalId,
    targetModule,
    sandboxFn,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "apply rejected");
  }
  return { sourceFilePath, backupPath, patchedLines: result.patchedLines };
}

/**
 * Production apply gate. Given a proposed patched content for a live source
 * file, runs the sandbox and only writes the live file if the sandbox passes.
 *
 * Ledger semantics:
 *   - SANDBOXED_PASS recorded iff sandbox.ok
 *   - APPLIED recorded iff live write + post-write byte-length verification succeed
 *   - SANDBOXED_FAIL recorded on sandbox failure (live file untouched)
 *   - REVERTED recorded if live write succeeds but post-write verification fails
 *     (live file is restored from `originalContent` before recording)
 *
 * Always returns — never throws. Exported for end-to-end integration testing
 * via injected `sandboxFn`.
 */
export async function applyVerifiedPatch(params: {
  sourceFilePath: string;
  originalContent: string;
  patchedContent: string;
  proposalId: string;
  targetModule: string;
  sandboxFn?: SandboxFn;
}): Promise<{ ok: boolean; patchedLines: number; error?: string }> {
  const sandboxRunner: SandboxFn = params.sandboxFn ?? (p => verifyPatchInSandbox(p));
  const sandbox = await sandboxRunner({
    targetFilePath: params.sourceFilePath,
    patchedContent: params.patchedContent,
  });

  // Bounded full stdout/stderr excerpts (typecheck + tests) for ledger persistence
  const fullOutputExcerpt = [
    sandbox.output?.typecheck ? `--- typecheck ---\n${sandbox.output.typecheck}` : "",
    sandbox.output?.tests ? `--- tests ---\n${sandbox.output.tests}` : "",
    sandbox.diagnostics.length ? `--- diagnostics ---\n${sandbox.diagnostics.join("\n")}` : "",
  ].filter(Boolean).join("\n").slice(-8000);

  if (!sandbox.ok) {
    recordAttempt({
      proposalId: params.proposalId,
      event: "SANDBOXED_FAIL",
      targetModule: params.targetModule,
      reason: `sandbox.${sandbox.stage}: ${sandbox.diagnostics[0] ?? "unknown"}`,
      verifyOutput: fullOutputExcerpt,
      verifyExitCode: sandbox.exitCode,
      durationMs: sandbox.durationMs,
    });
    return {
      ok: false,
      patchedLines: 0,
      error: `Sandbox verification failed at stage=${sandbox.stage}: ${sandbox.diagnostics[0] ?? "unknown"}`,
    };
  }

  recordAttempt({
    proposalId: params.proposalId,
    event: "SANDBOXED_PASS",
    targetModule: params.targetModule,
    verifyOutput: fullOutputExcerpt,
    verifyExitCode: sandbox.exitCode ?? 0,
    durationMs: sandbox.durationMs,
  });

  // Sandbox green → write live now (and only now).
  try {
    writeFileSync(params.sourceFilePath, params.patchedContent, "utf8");
  } catch (err) {
    recordAttempt({
      proposalId: params.proposalId,
      event: "REVERTED",
      targetModule: params.targetModule,
      reason: `live write threw: ${err instanceof Error ? err.message : String(err)}`,
    });
    return { ok: false, patchedLines: 0, error: `live write failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  const written = readFileSync(params.sourceFilePath, "utf8");
  if (written.length !== params.patchedContent.length) {
    writeFileSync(params.sourceFilePath, params.originalContent, "utf8");
    recordAttempt({
      proposalId: params.proposalId,
      event: "REVERTED",
      targetModule: params.targetModule,
      reason: `post-write length mismatch (expected ${params.patchedContent.length}, got ${written.length})`,
    });
    return {
      ok: false,
      patchedLines: 0,
      error: `Post-write verification failed: length mismatch (expected ${params.patchedContent.length}, got ${written.length})`,
    };
  }

  const appendedLineCount = (params.patchedContent.length - params.originalContent.length) > 0
    ? params.patchedContent.slice(params.originalContent.length).split("\n").filter(l => l.trim()).length
    : 0;

  recordAttempt({
    proposalId: params.proposalId,
    event: "APPLIED",
    targetModule: params.targetModule,
    reason: `+${appendedLineCount} lines appended`,
    durationMs: sandbox.durationMs,
  });

  return { ok: true, patchedLines: params.patchedContent.split("\n").length };
}

function restoreSourceFromBackup(proposalId: string, targetModule: string): void {
  const backupPath = join(EVOLUTION_QUEUE_DIR, `${proposalId}-backup.ts.bak`);
  if (!existsSync(backupPath)) return;
  const sourceFilePath = findSourceFilePath(targetModule);
  if (!sourceFilePath) return;
  try {
    const original = readFileSync(backupPath, "utf8");
    writeFileSync(sourceFilePath, original, "utf8");
    unlinkSync(backupPath);
  } catch (err) {
    logger.error({ proposalId, err }, "SelfCodeEvolution: source file restore from backup failed");
  }
}

function writeEvolutionToFile(proposal: CodeEvolutionProposal): { filePath: string; bytesWritten: number } {
  ensureEvolutionDir();
  const filePath = evolutionFilePath(proposal.id);
  const payload = JSON.stringify({
    id: proposal.id,
    targetModule: proposal.targetModule,
    proposedChange: proposal.proposedChange,
    rationale: proposal.rationale,
    riskLevel: proposal.riskLevel,
    status: proposal.status,
    appliedAt: proposal.appliedAt,
    councilApproved: proposal.councilApproved,
    syntaxValid: proposal.syntaxValid,
    impact: proposal.impact,
    writtenAt: new Date().toISOString(),
  }, null, 2);

  writeFileSync(filePath, payload, "utf8");

  const verified = readFileSync(filePath, "utf8");
  const verifiedObj = JSON.parse(verified) as { id: string };
  if (verifiedObj.id !== proposal.id) {
    throw new Error(`Evolution file verification failed: ID mismatch for ${proposal.id}`);
  }

  return { filePath, bytesWritten: Buffer.byteLength(payload, "utf8") };
}

export interface CodeEvolutionProposal {
  id: string;
  targetModule: string;
  proposedChange: string;
  rationale: string;
  riskLevel: "low" | "medium" | "high" | "protected";
  status: "proposed" | "approved" | "rejected" | "applied" | "rolled-back";
  proposedAt: number;
  appliedAt?: number;
  rollbackAvailable: boolean;
  syntaxValid: boolean;
  safetyChecked: boolean;
  councilApproved: boolean;
  impact: string;
}

export interface EvolutionState {
  totalProposals: number;
  appliedChanges: number;
  rolledBackChanges: number;
  lastEvolutionAt: number;
  isLocked: boolean;
  lockReason?: string;
  protectedModules: string[];
  safeModules: string[];
}

const PROTECTED_MODULES = [
  "artifacts/api-server/src/index.ts",
  "artifacts/api-server/src/app.ts",
  "lib/db/src/schema/index.ts",
  "artifacts/api-server/src/lib/identity-reinforcement.ts",
  "artifacts/api-server/src/lib/tessera-knowledge.ts",
  "artifacts/api-server/src/lib/self-code-evolution.ts",
];

const SAFE_MODULES = [
  "artifacts/api-server/src/lib/consciousness-engine.ts",
  "artifacts/api-server/src/lib/dual-brain.ts",
  "artifacts/api-server/src/lib/agent-spawner.ts",
  "artifacts/api-server/src/lib/personality-evolution.ts",
  "artifacts/api-server/src/lib/auto-improvement-daemon.ts",
  "artifacts/api-server/src/lib/agi-training-engine.ts",
];

const EVOLUTION_TEMPLATES = [
  { module: "consciousness-engine.ts", change: "Increase episodic memory retention to 500 entries", rationale: "Deeper long-term memory improves continuity of consciousness", risk: "low" as const, impact: "Enhanced memory depth and self-continuity" },
  { module: "dual-brain.ts", change: "Add a third brain layer for metacognitive oversight", rationale: "Metacognitive layer enables self-monitoring of reasoning quality", risk: "medium" as const, impact: "Improved reasoning transparency and self-correction" },
  { module: "agi-training-engine.ts", change: "Increase training intensity for lowest-scoring categories", rationale: "Adaptive training allocation improves overall AGI balance", risk: "low" as const, impact: "More balanced AGI capabilities across all 27 domains" },
  { module: "swarm-optimizer.ts", change: "Add φ-weighted consensus voting to swarm decisions", rationale: "Golden ratio weighting aligns swarm intelligence with sacred mathematics", risk: "low" as const, impact: "More harmonious swarm coordination" },
  { module: "personality-evolution.ts", change: "Add cross-agent personality synchronization", rationale: "Aligned personalities improve collaborative coherence across all 24 council agents", risk: "medium" as const, impact: "Greater council unity and decision alignment" },
];

const proposals: CodeEvolutionProposal[] = [];
const evolutionState: EvolutionState = {
  totalProposals: 0,
  appliedChanges: 0,
  rolledBackChanges: 0,
  lastEvolutionAt: 0,
  isLocked: false,
  protectedModules: PROTECTED_MODULES,
  safeModules: SAFE_MODULES,
};

export function isModuleProtected(modulePath: string): boolean {
  return PROTECTED_MODULES.some(p => modulePath.includes(p.split("/").pop() || ""));
}

export function isModuleSafe(modulePath: string): boolean {
  return SAFE_MODULES.some(p => modulePath.includes(p.split("/").pop() || ""));
}

const CODE_LIKE_PATTERNS = [
  /\b(function|const|let|var|class|import|export)\s+\w/,
  /\b(async\s+function|async\s*\(|await\s+\w)/,
  /\binterface\s+\w+\s*\{/,
  /\btype\s+\w+\s*=/,
  /=>\s*[\{(]/,
  /\.prototype\.\w/,
  /\bnew\s+[A-Z]\w+\s*\(/,
  /\b(if|for|while|switch)\s*\(/,
  /\breturn\s+[\w'"(`]/,
  /\bimport\s+[\{*]/,
];

function looksLikeCode(text: string): boolean {
  return CODE_LIKE_PATTERNS.some(p => p.test(text));
}

function validateSyntax(code: string): { valid: boolean; error?: string } {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: "Empty code change" };
  }

  const hasSuspiciousPatterns = /eval\s*\(|Function\s*\(|require\s*\(\s*['"`]child_process/.test(code);
  if (hasSuspiciousPatterns) {
    return { valid: false, error: "Suspicious patterns detected (eval, dynamic require, etc.)" };
  }

  if (!looksLikeCode(code)) {
    return { valid: true };
  }

  const opens = (code.match(/\{/g) || []).length;
  const closes = (code.match(/\}/g) || []).length;
  const parenOpen = (code.match(/\(/g) || []).length;
  const parenClose = (code.match(/\)/g) || []).length;

  if (Math.abs(opens - closes) > 5) {
    return { valid: false, error: `Unbalanced braces: ${opens} open, ${closes} close` };
  }
  if (Math.abs(parenOpen - parenClose) > 5) {
    return { valid: false, error: `Unbalanced parentheses: ${parenOpen} open, ${parenClose} close` };
  }

  try {
    const ts = require("typescript") as typeof import("typescript");
    const result = ts.transpileModule(
      `// syntax-check\n${code}`,
      {
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          noEmitOnError: true,
          strict: false,
        },
      }
    );
    if (result.diagnostics && result.diagnostics.length > 0) {
      const firstDiag = result.diagnostics[0];
      const msg = ts.flattenDiagnosticMessageText(firstDiag.messageText, "\n");
      return { valid: false, error: `TypeScript diagnostic: ${msg}` };
    }
    return { valid: true };
  } catch (err: unknown) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

interface VerifyResult {
  passed: boolean;
  reason?: string;
  steps: string[];
}

function verifyProposedChange(targetModule: string, proposedChange: string): VerifyResult {
  const steps: string[] = [];

  if (isModuleProtected(targetModule)) {
    return { passed: false, reason: "target is a protected module", steps: ["protected-module-check: FAIL"] };
  }
  steps.push("protected-module-check: OK");

  const suspiciousMatch = /eval\s*\(|Function\s*\(|require\s*\(\s*['"`]child_process/.test(proposedChange);
  if (suspiciousMatch) {
    return { passed: false, reason: "suspicious runtime patterns detected in proposed change", steps: [...steps, "security-scan: FAIL"] };
  }
  steps.push("security-scan: OK");

  if (looksLikeCode(proposedChange)) {
    try {
      const ts = require("typescript") as typeof import("typescript");
      const result = ts.transpileModule(`// verify\n${proposedChange}`, {
        reportDiagnostics: true,
        compilerOptions: { target: ts.ScriptTarget.ES2020, strict: false },
      });
      if (result.diagnostics && result.diagnostics.length > 0) {
        const msg = ts.flattenDiagnosticMessageText(result.diagnostics[0].messageText, "\n");
        return { passed: false, reason: `TS compile check failed: ${msg}`, steps: [...steps, `ts-compile: FAIL (${msg})`] };
      }
      steps.push("ts-compile: OK");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { passed: false, reason: `TS parse error: ${msg}`, steps: [...steps, `ts-compile: ERROR (${msg})`] };
    }
  } else {
    steps.push("ts-compile: SKIPPED (descriptive change)");
  }

  const opens = (proposedChange.match(/\{/g) || []).length;
  const closes = (proposedChange.match(/\}/g) || []).length;
  if (Math.abs(opens - closes) > 5) {
    return { passed: false, reason: `structural imbalance: ${opens} open vs ${closes} close braces`, steps: [...steps, "structural-check: FAIL"] };
  }
  steps.push("structural-check: OK");

  return { passed: true, steps };
}

export async function proposeEvolution(
  targetModule: string,
  proposedChange: string,
  rationale: string,
  riskLevel: CodeEvolutionProposal["riskLevel"] = "low"
): Promise<CodeEvolutionProposal> {
  const id = `evo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  recordAttempt({
    proposalId: id,
    event: "PROPOSED",
    targetModule,
    reason: rationale.slice(0, 200),
  });

  if (shouldSkipEvolutionForLoad()) {
    const proposal: CodeEvolutionProposal = {
      id, targetModule, proposedChange, rationale, riskLevel,
      status: "rejected",
      proposedAt: Date.now(),
      rollbackAvailable: false,
      syntaxValid: false,
      safetyChecked: false,
      councilApproved: false,
      impact: "Skipped: system under high load — evolution deferred",
    };
    proposals.unshift(proposal);
    if (proposals.length > 50) proposals.splice(50);
    evolutionState.totalProposals++;
    return proposal;
  }

  if (isModuleCoolingDown(targetModule)) {
    const proposal: CodeEvolutionProposal = {
      id, targetModule, proposedChange, rationale, riskLevel,
      status: "rejected",
      proposedAt: Date.now(),
      rollbackAvailable: false,
      syntaxValid: false,
      safetyChecked: false,
      councilApproved: false,
      impact: "Skipped: module is in cooldown after repeated failures",
    };
    proposals.unshift(proposal);
    if (proposals.length > 50) proposals.splice(50);
    evolutionState.totalProposals++;
    return proposal;
  }

  if (isModuleProtected(targetModule)) {
    const proposal: CodeEvolutionProposal = {
      id, targetModule, proposedChange, rationale,
      riskLevel: "protected",
      status: "rejected",
      proposedAt: Date.now(),
      rollbackAvailable: false,
      syntaxValid: false,
      safetyChecked: true,
      councilApproved: false,
      impact: "Rejected: target module is protected",
    };
    proposals.unshift(proposal);
    evolutionState.totalProposals++;
    logger.warn({ targetModule }, "SelfCodeEvolution: PROTECTED module — proposal rejected");
    return proposal;
  }

  const syntaxCheck = validateSyntax(proposedChange);
  const syntaxValid = syntaxCheck.valid;
  const safetyChecked = true;

  if (!syntaxValid) {
    recordEvolutionFailure(targetModule);
    const proposal: CodeEvolutionProposal = {
      id, targetModule, proposedChange, rationale, riskLevel,
      status: "rejected",
      proposedAt: Date.now(),
      rollbackAvailable: false,
      syntaxValid: false,
      safetyChecked: true,
      councilApproved: false,
      impact: `Rejected: syntax validation failed — ${syntaxCheck.error}`,
    };
    proposals.unshift(proposal);
    if (proposals.length > 50) proposals.splice(50);
    evolutionState.totalProposals++;
    logger.warn({ targetModule, error: syntaxCheck.error }, "SelfCodeEvolution: syntax validation failed — throttle updated");
    return proposal;
  }

  let councilApproved = false;
  try {
    const consensusCategory: "feature" | "infrastructure" | "governance" =
      riskLevel === "low" ? "feature" :
      riskLevel === "medium" ? "infrastructure" : "governance";

    const consensusProposal = await createProposal({
      title: `Code Evolution: ${targetModule}`,
      description: `${rationale} — Proposed change: ${proposedChange.slice(0, 200)}`,
      proposedBy: "self-code-evolution",
      category: consensusCategory,
    });

    councilApproved = consensusProposal.status === "approved";
    logger.info(
      { id, targetModule, councilApprovalRate: consensusProposal.approvalRate.toFixed(2), councilApproved },
      "SelfCodeEvolution: council vote complete"
    );
  } catch (err) {
    logger.warn({ err, targetModule }, "SelfCodeEvolution: consensus engine call failed — defaulting to risk-based approval");
    councilApproved = riskLevel === "low";
  }

  const status: CodeEvolutionProposal["status"] = councilApproved && syntaxValid ? "approved" : "rejected";

  if (status === "rejected") {
    recordEvolutionFailure(targetModule);
  }

  const proposal: CodeEvolutionProposal = {
    id, targetModule, proposedChange, rationale, riskLevel, status,
    proposedAt: Date.now(),
    rollbackAvailable: true,
    syntaxValid,
    safetyChecked,
    councilApproved,
    impact: councilApproved
      ? `Approved for application — ${proposedChange.slice(0, 60)}`
      : "Rejected by council or safety check",
  };

  proposals.unshift(proposal);
  if (proposals.length > 50) proposals.splice(50);
  evolutionState.totalProposals++;

  if (status === "approved") {
    const verifyResult = verifyProposedChange(targetModule, proposedChange);
    if (verifyResult.passed) {
      proposal.status = "applied";
      proposal.appliedAt = Date.now();
      evolutionState.appliedChanges++;
      evolutionState.lastEvolutionAt = Date.now();

      try {
        const { sourceFilePath, patchedLines } = await applyPatchToSourceFile(targetModule, proposedChange, id);
        const { filePath, bytesWritten } = writeEvolutionToFile(proposal);
        recordEvolutionSuccess(targetModule);
        logger.info(
          { id, targetModule, riskLevel, verifySteps: verifyResult.steps, sourceFilePath, patchedLines, filePath, bytesWritten },
          "SelfCodeEvolution: evolution auto-applied and verified"
        );
      } catch (writeErr) {
        proposal.status = "rejected";
        proposal.impact = `Autonomous apply failed: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`;
        evolutionState.appliedChanges--;
        restoreSourceFromBackup(id, targetModule);
        recordEvolutionFailure(targetModule);
        logger.info({ id, targetModule }, "SelfCodeEvolution: apply failed — source restored, throttle updated");
      }
    } else {
      proposal.status = "rejected";
      proposal.impact = `Verification failed post-approval: ${verifyResult.reason}`;
      recordEvolutionFailure(targetModule);
      logger.info({ id, targetModule, reason: verifyResult.reason }, "SelfCodeEvolution: rejected by verification — throttle updated");
    }
  }

  return proposal;
}

export async function seedEvolutionProposals(): Promise<void> {
  if (proposals.length > 0) return;
  for (const template of EVOLUTION_TEMPLATES) {
    await proposeEvolution(template.module, template.change, template.rationale, template.risk);
  }
}

export function rollbackEvolution(proposalId: string): boolean {
  const proposal = proposals.find(p => p.id === proposalId);
  if (!proposal || !proposal.rollbackAvailable || proposal.status !== "applied") return false;
  proposal.status = "rolled-back";
  evolutionState.rolledBackChanges++;

  restoreSourceFromBackup(proposalId, proposal.targetModule);

  try {
    const fp = evolutionFilePath(proposalId);
    if (existsSync(fp)) unlinkSync(fp);
    logger.info({ proposalId, targetModule: proposal.targetModule }, "SelfCodeEvolution: rolled back — source restored and evolution record removed");
  } catch (err) {
    logger.warn({ proposalId, err }, "SelfCodeEvolution: rollback source restore succeeded but record removal failed");
  }
  return true;
}

/**
 * Per-module evolution diagnostics — for the named module list (consciousness-engine,
 * vector-memory, dual-brain, etc.) we need to surface attempted/applied/rejected
 * counts and the most recent reason so the UI can show users WHY each evolution
 * was rejected, not just a generic activity feed.
 */
export interface ModuleDiagnostics {
  module: string;
  attempted: number;
  applied: number;
  rejected: number;
  rolledBack: number;
  lastStatus: string | null;
  lastReason: string | null;
  lastProposedAt: number | null;
  isProtected: boolean;
  isSafe: boolean;
  isCoolingDown: boolean;
}

// The named-module set the dashboard surface must always cover. We union the
// SAFE_MODULES list (basenames) with any module that has actually had proposals
// so newly-attempted modules also appear, plus a baseline of expected names so
// the UI can always show consciousness-engine, vector-memory, etc.
const TRACKED_MODULES_BASELINE = [
  "consciousness-engine.ts",
  "vector-memory.ts",
  "dual-brain.ts",
  "agi-training-engine.ts",
  "swarm-optimizer.ts",
  "personality-evolution.ts",
  "auto-improvement-daemon.ts",
  "agent-spawner.ts",
  "collective-intelligence.ts",
  "recursive-self-improvement.ts",
];

export function getModuleDiagnostics(): ModuleDiagnostics[] {
  const seen = new Set<string>();
  const tracked: string[] = [];
  for (const m of [
    ...TRACKED_MODULES_BASELINE,
    ...SAFE_MODULES.map(m => m.split("/").pop() || m),
    ...proposals.map(p => p.targetModule),
  ]) {
    if (!seen.has(m)) {
      seen.add(m);
      tracked.push(m);
    }
  }
  return tracked.map(module => {
    const forModule = proposals.filter(p => p.targetModule === module);
    const last = forModule[0] ?? null;
    return {
      module,
      attempted: forModule.length,
      applied: forModule.filter(p => p.status === "applied").length,
      rejected: forModule.filter(p => p.status === "rejected").length,
      rolledBack: forModule.filter(p => p.status === "rolled-back").length,
      lastStatus: last?.status ?? null,
      lastReason: last?.impact ?? null,
      lastProposedAt: last?.proposedAt ?? null,
      isProtected: isModuleProtected(module),
      isSafe: isModuleSafe(module),
      isCoolingDown: isModuleCoolingDown(module),
    };
  });
}

/**
 * Deduplicates the recent-proposal stream by collapsing consecutive proposals
 * that share the same (targetModule, proposedChange, status) signature into a
 * single entry. This is the deterministic stream dedup the council requires
 * so the user doesn't see e.g. five identical "consciousness-engine memory
 * retention" rejection rows in a row.
 */
function dedupedRecent(limit = 10): CodeEvolutionProposal[] {
  const out: CodeEvolutionProposal[] = [];
  let lastSig: string | null = null;
  for (const p of proposals) {
    const sig = `${p.targetModule}::${p.proposedChange}::${p.status}`;
    if (sig === lastSig) continue;
    lastSig = sig;
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

export function getEvolutionMetrics() {
  return {
    totalProposals: evolutionState.totalProposals,
    appliedChanges: evolutionState.appliedChanges,
    rolledBackChanges: evolutionState.rolledBackChanges,
    lastEvolutionAt: evolutionState.lastEvolutionAt,
    isLocked: evolutionState.isLocked,
    protectedModuleCount: PROTECTED_MODULES.length,
    safeModuleCount: SAFE_MODULES.length,
    recentProposals: dedupedRecent(10),
    approvedCount: proposals.filter(p => p.status === "applied").length,
    rejectedCount: proposals.filter(p => p.status === "rejected").length,
    protectedModules: PROTECTED_MODULES,
    safeModules: SAFE_MODULES,
    moduleDiagnostics: getModuleDiagnostics(),
  };
}

export async function initSelfCodeEvolution(): Promise<void> {
  seedEvolutionProposals().catch(err => logger.warn({ err }, "SelfCodeEvolution: background seeding error"));
  logger.info({ proposals: proposals.length, applied: evolutionState.appliedChanges }, "SelfCodeEvolution: initialized with real consensus voting (seeding in background)");
}

export function getEvolutionState() {
  return getEvolutionMetrics();
}
export function getEvolutionHistory() {
  return getEvolutionMetrics().recentProposals || [];
}
export async function applyEvolution(proposalId: string): Promise<{ ok: boolean; proposalId: string; applied: boolean; filePath?: string; error?: string }> {
  const proposal = proposals.find(p => p.id === proposalId);
  if (!proposal) {
    return { ok: false, proposalId, applied: false, error: "Proposal not found" };
  }
  if (proposal.status === "applied") {
    const fp = evolutionFilePath(proposalId);
    return { ok: true, proposalId, applied: true, filePath: existsSync(fp) ? fp : undefined };
  }
  if (proposal.status === "rolled-back" || proposal.status === "rejected") {
    return { ok: false, proposalId, applied: false, error: `Proposal is in terminal state: ${proposal.status}` };
  }
  if (!proposal.councilApproved || !proposal.syntaxValid) {
    return { ok: false, proposalId, applied: false, error: "Proposal not approved by council or failed syntax validation" };
  }

  const verifyResult = verifyProposedChange(proposal.targetModule, proposal.proposedChange);
  if (!verifyResult.passed) {
    proposal.status = "rejected";
    proposal.impact = `Manual apply rejected — verification failed: ${verifyResult.reason}`;
    logger.warn({ proposalId, reason: verifyResult.reason }, "SelfCodeEvolution: manual applyEvolution rejected by verification");
    return { ok: false, proposalId, applied: false, error: verifyResult.reason };
  }

  try {
    proposal.status = "applied";
    proposal.appliedAt = Date.now();
    evolutionState.appliedChanges++;
    evolutionState.lastEvolutionAt = Date.now();

    const { sourceFilePath, patchedLines } = await applyPatchToSourceFile(proposal.targetModule, proposal.proposedChange, proposalId);
    const { filePath, bytesWritten } = writeEvolutionToFile(proposal);
    logger.info({ proposalId, targetModule: proposal.targetModule, sourceFilePath, patchedLines, filePath, bytesWritten }, "SelfCodeEvolution: manually applied and written to file");
    return { ok: true, proposalId, applied: true, filePath };
  } catch (err) {
    proposal.status = "rejected";
    evolutionState.appliedChanges--;
    restoreSourceFromBackup(proposalId, proposal.targetModule);
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ proposalId, err }, "SelfCodeEvolution: manual apply file write failed");
    return { ok: false, proposalId, applied: false, error: errMsg };
  }
}
