import { logger } from "./logger";

export type ModelTier = "fast" | "balanced" | "strong" | "reasoning";

export interface RoutingDecision {
  tier: ModelTier;
  model: string;
  reason: string;
  isStrong: boolean;
  estimatedTokens: number;
}

const MODELS: Record<ModelTier, string> = {
  fast: "gpt-5-nano",
  balanced: "gpt-5-mini",
  strong: "gpt-5",
  reasoning: "o4-mini",
};

const STRONG_TRIGGERS = [
  /\b(prove|proof|derive|theorem|lemma)\b/i,
  /\b(architect|design pattern|system design|trade.?off|long.term plan)\b/i,
  /\b(analy[sz]e deeply|comprehensive|in depth|critique|root cause)\b/i,
  /\b(strategy|roadmap|migration plan)\b/i,
  /\bstep[- ]by[- ]step\b/i,
];

const REASONING_TRIGGERS = [
  /\b(solve|optimi[sz]e|algorithm|complexity|np.hard|equation system)\b/i,
  /\b(differential|integral|matrix|tensor|topolog)\b/i,
  /\b(constraint|sat|smt|theorem prover)\b/i,
];

const FAST_TRIGGERS = [
  /^(hi|hey|hello|thanks|thank you|yo|sup)[\s!.?]*$/i,
  /^(yes|no|ok|okay|sure|cool|nice)[\s!.?]*$/i,
  /^(what time|what date|what day)/i,
];

export function classifyQuery(input: string, opts?: { hasContext?: boolean; isAdmin?: boolean }): RoutingDecision {
  const text = (input || "").trim();
  const tokens = Math.ceil(text.length / 4);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  let tier: ModelTier = "balanced";
  let reason = "default balanced tier";

  if (FAST_TRIGGERS.some((p) => p.test(text)) && wordCount < 8) {
    tier = "fast";
    reason = "trivial conversational input";
  } else if (REASONING_TRIGGERS.some((p) => p.test(text))) {
    tier = "reasoning";
    reason = "math/algorithmic reasoning required";
  } else if (STRONG_TRIGGERS.some((p) => p.test(text)) || wordCount > 80) {
    tier = "strong";
    reason = wordCount > 80 ? "long, complex prompt" : "deep analysis keywords";
  } else if (opts?.isAdmin && wordCount > 20) {
    tier = "strong";
    reason = "admin request, escalating quality";
  }

  const decision: RoutingDecision = {
    tier,
    model: MODELS[tier],
    reason,
    isStrong: tier === "strong" || tier === "reasoning",
    estimatedTokens: tokens,
  };
  logger.debug({ decision, sample: text.slice(0, 80) }, "AdaptiveRouter: classified");
  return decision;
}

export function modelForTier(tier: ModelTier): string {
  return MODELS[tier];
}
