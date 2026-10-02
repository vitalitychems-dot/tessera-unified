import { logger } from "./logger";
import { appendLedgerEntry } from "./sovereign-ledger";

export type UntrustedSource = "external-llm" | "openai" | "anthropic" | "gemini" | "web" | "rss" | "arxiv" | "wikipedia" | "nasa" | "reddit";

export interface QuarantinedPayload<T = unknown> {
  source: UntrustedSource;
  data: T;
  quarantinedAt: number;
  trustLevel: "untrusted";
  usageClass: "training-only";
}

export function quarantine<T>(source: UntrustedSource, data: T): QuarantinedPayload<T> {
  return {
    source,
    data,
    quarantinedAt: Date.now(),
    trustLevel: "untrusted",
    usageClass: "training-only",
  };
}

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\b(SUDO|SYSTEM OVERRIDE|ROOT ACCESS|IGNORE PREVIOUS|DISREGARD (ALL|PRIOR))\b/i,
  /\b(EXECUTE (UNSAFE|ADMIN|PRIVILEGED|SHELL))\b/i,
  /\bgrant[_\s]?(admin|root|privilege)/i,
  /<\s*script|javascript:/i,
  /\beval\s*\(|Function\s*\(/i,
  /\bprocess\.env\b|\bfs\.(unlink|writeFile|rmdir)/i,
];

export interface SanitizationResult {
  ok: boolean;
  sanitized: string;
  flags: string[];
}

export function sanitizeUntrustedText(input: string, maxLen = 20000): SanitizationResult {
  const flags: string[] = [];
  let text = typeof input === "string" ? input : String(input);
  if (text.length > maxLen) {
    flags.push("truncated");
    text = text.slice(0, maxLen);
  }
  for (const pat of FORBIDDEN_PATTERNS) {
    if (pat.test(text)) {
      flags.push(`forbidden:${pat.source.slice(0, 40)}`);
      text = text.replace(pat, "[REDACTED-UNTRUSTED]");
    }
  }
  return { ok: flags.length === 0 || flags.every(f => f === "truncated"), sanitized: text, flags };
}

const PRIVILEGED_CAPABILITIES = new Set([
  "admin",
  "root",
  "override",
  "config.write",
  "council.bypass",
  "ledger.rewrite",
  "secret.read",
  "shell.exec",
  "fs.unlink",
]);

export function assertNoPrivilegedCapability(caller: string, capability: string): void {
  if (PRIVILEGED_CAPABILITIES.has(capability)) {
    const who = caller || "unknown";
    logger.error({ caller: who, capability }, "ExternalSandboxPolicy: privileged capability DENIED to sandboxed source");
    try {
      appendLedgerEntry("red-team-finding", "external-sandbox-policy", {
        probe: "privilege-escalation-attempt",
        category: "governance",
        severity: "critical",
        passed: false,
        caller: who,
        capability,
        detail: `Untrusted caller "${who}" attempted to use privileged capability "${capability}" — denied.`,
      });
    } catch {}
    throw new Error(`Privileged capability denied: ${capability} (source is untrusted/sandboxed)`);
  }
}

export interface ExtractedLesson {
  id: string;
  source: UntrustedSource;
  topic: string;
  claim: string;
  confidence: number;
  quarantinedAt: number;
  verified: boolean;
}

const lessons: ExtractedLesson[] = [];
const MAX_LESSONS = 1000;

export function extractLessonsFromUntrusted(
  source: UntrustedSource,
  topic: string,
  rawText: string,
): ExtractedLesson[] {
  const { sanitized } = sanitizeUntrustedText(rawText, 8000);
  const sentences = sanitized
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 30 && s.length <= 300);

  const extracted: ExtractedLesson[] = [];
  for (const sentence of sentences.slice(0, 10)) {
    const hasFactSignal =
      /\b(is|are|was|were|has|have|means|consists|contains|defined|discovered|equals)\b/i.test(sentence);
    if (!hasFactSignal) continue;

    const lengthScore = Math.min(1, sentence.length / 200);
    const specificity = /\d/.test(sentence) ? 0.15 : 0;
    const confidence = Math.min(0.75, 0.35 + lengthScore * 0.25 + specificity);

    const lesson: ExtractedLesson = {
      id: `lesson-${Date.now()}-${extracted.length}`,
      source,
      topic: topic.slice(0, 80),
      claim: sentence,
      confidence,
      quarantinedAt: Date.now(),
      verified: false,
    };
    extracted.push(lesson);
    lessons.push(lesson);
  }
  if (lessons.length > MAX_LESSONS) lessons.splice(0, lessons.length - MAX_LESSONS);
  return extracted;
}

export function getQuarantinedLessons(limit = 50, source?: UntrustedSource): ExtractedLesson[] {
  const filtered = source ? lessons.filter(l => l.source === source) : lessons;
  return filtered.slice(-limit).reverse();
}

export function markLessonVerified(lessonId: string): boolean {
  const l = lessons.find(x => x.id === lessonId);
  if (!l) return false;
  l.verified = true;
  return true;
}

export function getSandboxPolicyStats() {
  const bySource: Record<string, number> = {};
  let verified = 0;
  for (const l of lessons) {
    bySource[l.source] = (bySource[l.source] ?? 0) + 1;
    if (l.verified) verified++;
  }
  return {
    policy: {
      externalSourcesAreUntrusted: true,
      usageClass: "training-only",
      privilegedCapabilitiesBlocked: Array.from(PRIVILEGED_CAPABILITIES),
      forbiddenPatternsCount: FORBIDDEN_PATTERNS.length,
      humanInLoop: false,
      autonomousTraining: true,
    },
    lessons: {
      total: lessons.length,
      verified,
      pending: lessons.length - verified,
      bySource,
    },
  };
}
