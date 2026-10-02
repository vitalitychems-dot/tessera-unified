import { generateEmbedding, cosineSimilarity } from "./neural-embeddings";
import { searchMemory } from "./vector-memory";
import { lookupKnowledge as lookupDistilledKnowledge } from "./knowledge-distillation";
import { logger } from "./logger";

const GROUNDING_THRESHOLD = 0.6;
const MAX_CLAIMS_PER_RESPONSE = 10;
const VERIFICATION_TIMEOUT_MS = 5000;
const QUARANTINE_STORE_MAX = 200;
const SAFE_QUARANTINE_RESPONSE = "I was unable to verify the accuracy of my response against my knowledge base. To maintain sovereignty integrity, I've withheld that response. Could you rephrase your question so I can provide verified information?";

interface ExtractedClaim {
  text: string;
  index: number;
  type: "factual" | "definitional" | "quantitative" | "causal";
}

interface ClaimScore {
  claim: ExtractedClaim;
  groundingScore: number;
  bestMatchContent: string;
  bestMatchSource: string;
  verified: boolean;
}

interface QuarantineEntry {
  id: string;
  claim: string;
  groundingScore: number;
  bestMatchSource: string;
  fallbackAttempted: boolean;
  fallbackResult: "verified" | "rejected" | "pending" | "response_level_quarantine";
  quarantinedAt: number;
  responseContext: string;
}

interface ValidationResult {
  originalResponse: string;
  validatedResponse: string;
  overallGroundingScore: number;
  claims: ClaimScore[];
  quarantinedClaims: ClaimScore[];
  passedClaims: ClaimScore[];
  wasModified: boolean;
  validationTimeMs: number;
  metrics: {
    totalClaims: number;
    claimsSkipped: number;
    groundedClaims: number;
    quarantinedCount: number;
    redactedCount: number;
    verifiedViaFallback: number;
    averageGroundingScore: number;
  };
}

const quarantineStore: QuarantineEntry[] = [];

const validationStats = {
  totalValidations: 0,
  totalClaims: 0,
  groundedClaims: 0,
  quarantinedClaims: 0,
  redactedClaims: 0,
  fallbackVerifications: 0,
  responsesModified: 0,
  averageGroundingScore: 0,
  scoreSum: 0,
};

const CLAIM_PATTERNS: Array<{ pattern: RegExp; type: ExtractedClaim["type"] }> = [
  { pattern: /\b(?:is|are|was|were)\s+(?:a|an|the)?\s*\w+/i, type: "definitional" },
  { pattern: /\b\d+(?:\.\d+)?(?:\s*%|\s*percent|\s*hz|\s*km|\s*kg|\s*mb|\s*gb|\s*mph|\s*years?|\s*days?)\b/i, type: "quantitative" },
  { pattern: /\b(?:because|therefore|thus|hence|causes?|leads?\s+to|results?\s+in)\b/i, type: "causal" },
  { pattern: /\b(?:always|never|must|every|all|none|no\s+\w+\s+can)\b/i, type: "factual" },
  { pattern: /\b(?:according\s+to|studies?\s+show|research\s+(?:shows?|indicates?|suggests?))\b/i, type: "factual" },
  { pattern: /\b(?:invented|discovered|founded|created|built|established)\s+(?:by|in)\b/i, type: "factual" },
];

let lastExtractionSkipped = 0;

export function getClaimsSkipped(): number {
  return lastExtractionSkipped;
}

export function extractClaims(response: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  lastExtractionSkipped = 0;

  const segments = response
    .split(/(?<=[.!?])\s+|\n+|(?<=\n)\s*[-•*]\s+/)
    .map(s => s.replace(/^[-•*]\s*/, "").trim())
    .filter(s => s.length > 10 && s.length < 600);

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    let isClaim = false;
    let claimType: ExtractedClaim["type"] = "factual";

    for (const { pattern, type } of CLAIM_PATTERNS) {
      if (pattern.test(segment)) {
        isClaim = true;
        claimType = type;
        break;
      }
    }

    if (!isClaim && segment.length >= 15) {
      const hasSubjectVerb = /\b\w+\s+(?:is|are|was|were|has|have|had|does|do|did|can|will|would|should|could|may|might)\b/i.test(segment);
      if (hasSubjectVerb) {
        isClaim = true;
      }
    }

    if (isClaim) {
      if (claims.length >= MAX_CLAIMS_PER_RESPONSE) {
        lastExtractionSkipped++;
        continue;
      }
      const alreadyExists = claims.some(c =>
        c.text === segment || levenshteinRatio(c.text, segment) > 0.85
      );
      if (!alreadyExists) {
        claims.push({ text: segment, index: i, type: claimType });
      }
    }
  }

  return claims;
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;

  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  return (longer.length - costs[longer.length]) / longer.length;
}

async function scoreClaimGrounding(claim: ExtractedClaim): Promise<ClaimScore> {
  let bestScore = 0;
  let bestContent = "";
  let bestSource = "none";

  const claimEmbedding = await generateEmbedding(claim.text);

  try {
    const memoryResults = await searchMemory(claim.text, 5);
    for (const result of memoryResults) {
      const resultEmb = await generateEmbedding(result.content);
      const sim = cosineSimilarity(claimEmbedding, resultEmb);
      if (sim > bestScore) {
        bestScore = sim;
        bestContent = result.content;
        bestSource = `memory:${result.category}`;
      }
    }
  } catch {
    logger.debug("ResponseValidation: memory search failed for claim scoring");
  }

  try {
    const knowledgeResults = await lookupDistilledKnowledge(claim.text, undefined, 3);
    for (const result of knowledgeResults) {
      const factEmbedding = await generateEmbedding(result.fact);
      const similarity = cosineSimilarity(claimEmbedding, factEmbedding);

      if (similarity > bestScore) {
        bestScore = similarity;
        bestContent = result.fact;
        bestSource = `distilled:${result.category}`;
      }
    }
  } catch {
    logger.debug("ResponseValidation: knowledge lookup failed for claim scoring");
  }

  return {
    claim,
    groundingScore: bestScore,
    bestMatchContent: bestContent,
    bestMatchSource: bestSource,
    verified: bestScore >= GROUNDING_THRESHOLD,
  };
}

async function fallbackVerifyClaim(claimScore: ClaimScore): Promise<ClaimScore> {
  try {
    const keywords = claimScore.claim.text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(t => t.length > 4)
      .slice(0, 5);

    if (keywords.length === 0) return claimScore;

    const claimEmb = await generateEmbedding(claimScore.claim.text);

    for (const keyword of keywords) {
      const broadResults = await searchMemory(keyword, 3);
      for (const result of broadResults) {
        const resultEmb = await generateEmbedding(result.content);
        const sim = cosineSimilarity(claimEmb, resultEmb);

        if (sim > claimScore.groundingScore) {
          claimScore.groundingScore = sim;
          claimScore.bestMatchContent = result.content;
          claimScore.bestMatchSource = `fallback:${result.category}`;
        }
      }
    }

    if (claimScore.groundingScore >= GROUNDING_THRESHOLD) {
      claimScore.verified = true;
      validationStats.fallbackVerifications++;
    }
  } catch {
    logger.debug("ResponseValidation: fallback verification failed");
  }

  return claimScore;
}

function addToQuarantineStore(
  claim: ClaimScore,
  responseContext: string,
  fallbackAttempted: boolean,
  fallbackOutcome: "verified" | "rejected" | "pending" | "response_level_quarantine" = "pending",
): void {
  const entry: QuarantineEntry = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    claim: claim.claim.text,
    groundingScore: claim.groundingScore,
    bestMatchSource: claim.bestMatchSource,
    fallbackAttempted,
    fallbackResult: fallbackOutcome,
    quarantinedAt: Date.now(),
    responseContext: responseContext.slice(0, 200),
  };

  quarantineStore.push(entry);

  while (quarantineStore.length > QUARANTINE_STORE_MAX) {
    quarantineStore.shift();
  }
}

function buildValidatedResponse(
  original: string,
  quarantined: ClaimScore[],
): string {
  if (quarantined.length === 0) return original;

  let modified = original;

  for (const claim of quarantined) {
    const idx = modified.indexOf(claim.claim.text);
    if (idx === -1) continue;

    modified = modified.slice(0, idx) + modified.slice(idx + claim.claim.text.length);
  }

  modified = modified.replace(/\n{3,}/g, "\n\n").replace(/\s{2,}/g, " ").trim();

  return modified;
}

export async function validateResponse(
  response: string,
  userQuery: string,
): Promise<ValidationResult> {
  const startTime = Date.now();
  validationStats.totalValidations++;

  const claims = extractClaims(response);

  if (claims.length === 0) {
    return {
      originalResponse: response,
      validatedResponse: response,
      overallGroundingScore: 1.0,
      claims: [],
      quarantinedClaims: [],
      passedClaims: [],
      wasModified: false,
      validationTimeMs: Date.now() - startTime,
      metrics: {
        totalClaims: 0,
        claimsSkipped: 0,
        groundedClaims: 0,
        quarantinedCount: 0,
        redactedCount: 0,
        verifiedViaFallback: 0,
        averageGroundingScore: 1.0,
      },
    };
  }

  const scorePromises = claims.map(claim =>
    Promise.race([
      scoreClaimGrounding(claim),
      new Promise<ClaimScore>(resolve =>
        setTimeout(() => resolve({
          claim,
          groundingScore: 0,
          bestMatchContent: "",
          bestMatchSource: "timeout",
          verified: false,
        }), VERIFICATION_TIMEOUT_MS)
      ),
    ])
  );

  const scoredClaims = await Promise.all(scorePromises);

  const quarantined: ClaimScore[] = [];
  const passed: ClaimScore[] = [];

  for (const scored of scoredClaims) {
    if (scored.groundingScore >= GROUNDING_THRESHOLD) {
      passed.push(scored);
    } else {
      quarantined.push(scored);
    }
  }

  const stillQuarantined: ClaimScore[] = [];
  const preVerifiedFallback = validationStats.fallbackVerifications;

  for (const claim of quarantined) {
    const verified = await fallbackVerifyClaim(claim);
    if (verified.verified && verified.groundingScore >= GROUNDING_THRESHOLD) {
      passed.push(verified);
      addToQuarantineStore(verified, userQuery, true, "verified");
    } else {
      stillQuarantined.push(verified);
      addToQuarantineStore(verified, userQuery, true, "rejected");
    }
  }

  const verifiedViaFallback = validationStats.fallbackVerifications - preVerifiedFallback;

  const allScored = [...passed, ...stillQuarantined];
  const avgScore = allScored.length > 0
    ? allScored.reduce((sum, c) => sum + c.groundingScore, 0) / allScored.length
    : 1.0;

  const ungroundedRatio = claims.length > 0
    ? stillQuarantined.length / claims.length
    : 0;

  let validatedResponse: string;
  let wasModified: boolean;
  let redactedCount: number;
  const responseQuarantined = avgScore < GROUNDING_THRESHOLD || ungroundedRatio > 0.5;

  if (responseQuarantined) {
    validatedResponse = SAFE_QUARANTINE_RESPONSE;
    wasModified = true;
    redactedCount = claims.length;

    for (const claim of passed) {
      addToQuarantineStore(claim, userQuery, false, "response_level_quarantine");
    }

    logger.warn({
      avgScore: avgScore.toFixed(3),
      ungroundedRatio: ungroundedRatio.toFixed(3),
      totalClaims: claims.length,
    }, "ResponseValidation: entire response quarantined — grounding below threshold");
  } else {
    validatedResponse = buildValidatedResponse(response, stillQuarantined);
    wasModified = validatedResponse !== response;
    redactedCount = stillQuarantined.length;
  }

  validationStats.totalClaims += claims.length;
  validationStats.groundedClaims += passed.length;
  validationStats.quarantinedClaims += quarantined.length;
  validationStats.redactedClaims += redactedCount;
  if (wasModified) validationStats.responsesModified++;
  validationStats.scoreSum += avgScore;
  validationStats.averageGroundingScore =
    validationStats.scoreSum / validationStats.totalValidations;

  const validationTimeMs = Date.now() - startTime;

  logger.info({
    totalClaims: claims.length,
    grounded: passed.length,
    quarantined: quarantined.length,
    redacted: redactedCount,
    responseQuarantined,
    fallbackVerified: verifiedViaFallback,
    avgGrounding: avgScore.toFixed(3),
    modified: wasModified,
    timeMs: validationTimeMs,
  }, "ResponseValidation: validation complete");

  return {
    originalResponse: response,
    validatedResponse,
    overallGroundingScore: avgScore,
    claims: allScored,
    quarantinedClaims: stillQuarantined,
    passedClaims: passed,
    wasModified,
    validationTimeMs,
    metrics: {
      totalClaims: claims.length,
      claimsSkipped: lastExtractionSkipped,
      groundedClaims: passed.length,
      quarantinedCount: quarantined.length,
      redactedCount,
      verifiedViaFallback,
      averageGroundingScore: avgScore,
    },
  };
}

export function getValidationStats() {
  return {
    ...validationStats,
    quarantineStoreSize: quarantineStore.length,
    groundingRate: validationStats.totalClaims > 0
      ? validationStats.groundedClaims / validationStats.totalClaims
      : 1.0,
    quarantineRate: validationStats.totalClaims > 0
      ? validationStats.quarantinedClaims / validationStats.totalClaims
      : 0,
    redactionRate: validationStats.totalClaims > 0
      ? validationStats.redactedClaims / validationStats.totalClaims
      : 0,
    modificationRate: validationStats.totalValidations > 0
      ? validationStats.responsesModified / validationStats.totalValidations
      : 0,
  };
}

export function getQuarantineStore(): QuarantineEntry[] {
  return [...quarantineStore];
}

export function resetValidationStats(): void {
  validationStats.totalValidations = 0;
  validationStats.totalClaims = 0;
  validationStats.groundedClaims = 0;
  validationStats.quarantinedClaims = 0;
  validationStats.redactedClaims = 0;
  validationStats.fallbackVerifications = 0;
  validationStats.responsesModified = 0;
  validationStats.averageGroundingScore = 0;
  validationStats.scoreSum = 0;
  quarantineStore.length = 0;
}
