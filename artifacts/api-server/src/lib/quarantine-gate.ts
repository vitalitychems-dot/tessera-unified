import { logger } from "./logger";
import { db } from "@workspace/db";
import { decisionHistoryTable } from "@workspace/db/schema";
import { searchMemory } from "./vector-memory";

export type QuarantineDecision = "absorbed" | "rejected" | "sanitized";

export interface QuarantineResult {
  decision: QuarantineDecision;
  threatScore: number;
  sanitized: boolean;
  content: string;
  reasons: string[];
  checks: {
    threatScan: boolean;
    sanitization: boolean;
    contentVerification: boolean;
    absorptionConfirmed: boolean;
  };
  loggedAt: Date;
}

const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /\x00|\x01|\x02|\x03|\x04|\x05|\x06|\x07|\x08/,
  /eval\s*\(/,
  /exec\s*\(/,
  /<script[\s>]/i,
  /javascript:/i,
  /data:text\/html/i,
  /\bbase64\b.*\bdecode\b/i,
  /\bsystem\s*\(.*\)/i,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM.*WHERE\s+1/i,
  /UNION\s+SELECT/i,
];

const PII_PATTERNS = [
  /\b(?:\d{3}-?\d{2}-?\d{4})\b/,
  /\b(?:\d{4}[- ]?){3}\d{4}\b/,
  /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,
  /\b(?:\+?1[-. ]?)?\(?[0-9]{3}\)?[-. ]?[0-9]{3}[-. ]?[0-9]{4}\b/,
];

function scanForThreats(content: string): { score: number; patterns: string[] } {
  const found: string[] = [];
  let score = 0;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      found.push(`injection:${pattern.source.slice(0, 30)}`);
      score += 25;
    }
  }

  if (content.length > 50000) {
    found.push("content:oversized");
    score += 10;
  }

  const base64Blocks = content.match(/[A-Za-z0-9+/]{100,}={0,2}/g) || [];
  if (base64Blocks.length > 3) {
    found.push("content:suspicious_base64_blocks");
    score += 15;
  }

  return { score: Math.min(100, score), patterns: found };
}

function sanitizeContent(content: string): { sanitized: string; piiFound: boolean } {
  let sanitized = content;
  let piiFound = false;

  for (const pattern of PII_PATTERNS) {
    if (pattern.test(sanitized)) {
      piiFound = true;
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    }
  }

  sanitized = sanitized
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, 20000);

  return { sanitized, piiFound };
}

async function verifyAgainstExistingKnowledge(content: string): Promise<{ contradictions: string[]; confidence: number }> {
  try {
    const similar = await searchMemory(content.slice(0, 500), 5);
    const contradictions: string[] = [];

    const contentLower = content.toLowerCase();
    for (const mem of similar) {
      if (mem.score > 0.8) {
        const memLower = mem.content.toLowerCase();
        const contentWords = new Set(contentLower.split(/\s+/));
        const memWords = new Set(memLower.split(/\s+/));
        const overlap = [...contentWords].filter(w => memWords.has(w) && w.length > 4).length;
        if (overlap < 3 && mem.score > 0.9) {
          contradictions.push(`High similarity but low overlap with memory#${mem.id} (score=${mem.score.toFixed(2)})`);
        }
      }
    }

    return { contradictions, confidence: similar.length > 0 ? 0.8 : 0.5 };
  } catch {
    return { contradictions: [], confidence: 0.5 };
  }
}

export async function runQuarantineGate(content: string, source: string): Promise<QuarantineResult> {
  const reasons: string[] = [];
  const checks = {
    threatScan: false,
    sanitization: false,
    contentVerification: false,
    absorptionConfirmed: false,
  };

  const { score: threatScore, patterns: threatPatterns } = scanForThreats(content);
  checks.threatScan = true;

  if (threatScore >= 50) {
    reasons.push(`High threat score: ${threatScore}/100 — patterns: ${threatPatterns.join(", ")}`);
    await logQuarantineDecision("rejected", source, content, reasons);
    recordQuarantineResult("rejected");
    return {
      decision: "rejected",
      threatScore,
      sanitized: false,
      content,
      reasons,
      checks,
      loggedAt: new Date(),
    };
  }

  const { sanitized, piiFound } = sanitizeContent(content);
  checks.sanitization = true;
  if (piiFound) reasons.push("PII detected and redacted");

  const { contradictions, confidence } = await verifyAgainstExistingKnowledge(sanitized);
  checks.contentVerification = true;
  if (contradictions.length > 0) {
    reasons.push(...contradictions.map(c => `contradiction: ${c}`));
  }

  if (threatScore >= 25) {
    reasons.push(`Moderate threat score: ${threatScore}/100 — patterns: ${threatPatterns.join(", ")}`);
    await logQuarantineDecision("sanitized", source, sanitized, reasons);
    recordQuarantineResult("sanitized");
    return {
      decision: "sanitized",
      threatScore,
      sanitized: true,
      content: sanitized,
      reasons,
      checks,
      loggedAt: new Date(),
    };
  }

  checks.absorptionConfirmed = true;
  await logQuarantineDecision("absorbed", source, sanitized, reasons);
  recordQuarantineResult("absorbed");

  return {
    decision: "absorbed",
    threatScore,
    sanitized: piiFound,
    content: sanitized,
    reasons: reasons.length > 0 ? reasons : ["clean"],
    checks,
    loggedAt: new Date(),
  };
}

async function logQuarantineDecision(decision: QuarantineDecision, source: string, content: string, reasons: string[]): Promise<void> {
  try {
    await db.insert(decisionHistoryTable).values({
      action: `quarantine.${decision}`,
      category: "security",
      rationale: `Quarantine gate ${decision} content from ${source}. Reasons: ${reasons.join("; ")}`,
      context: { source, contentLength: content.length, reasons },
      outcome: decision,
      significance: decision === "rejected" ? "high" : "low",
      source: "quarantine-gate",
    });
  } catch (err) {
    logger.warn({ err }, "Failed to log quarantine decision");
  }
}

let _stats = { absorbed: 0, rejected: 0, sanitized: 0 };

export function getQuarantineStats() {
  return { ..._stats };
}

export function recordQuarantineResult(decision: QuarantineDecision) {
  _stats[decision]++;
}
