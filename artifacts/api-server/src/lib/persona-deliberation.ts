// Per-persona deliberation engine for the Grand Council.
//
// HARD RULE (Heavy Council redesign): NO external LLM may role-play council agents.
// External APIs are vulnerabilities and ground-truth contradictions. Therefore each
// of the 24 Greek personas reads the proposal TEXT directly through its own
// concern lens, cites phrases verbatim, and casts a vote derived from evidence.
//
// What "real deliberation" means here:
//   1. Each persona has a distinct CONCERN and VALUE keyword set (not shared).
//   2. Each persona scans the proposal text and cites the actual matched phrase.
//   3. The vote (approve/reject/abstain) is derived from the evidence balance,
//      not from a category lookup table — so different proposals produce
//      different vote distributions, and unanimity is no longer the default.
//   4. Reasoning quotes the proposal in the persona's own voice.
//
// This produces genuine variance: a security-skeptic (Sigma) reading "automatic
// retry" sees friction; a feature-pragmatist (Mu) reading the same text sees
// resilience; an income-realist (Theta) ignores both and looks for revenue terms.

import type { ConsensusProposal, ConsensusVote } from "./consensus-engine";

const PHI = 1.618033988749895;

interface PersonaProfile {
  name: string;
  // The lens this persona reads through — used in their voice when reasoning.
  lens: string;
  // Words/phrases in the proposal that this persona reads as ALIGNED with their values.
  values: string[];
  // Words/phrases that this persona reads as RISK or friction.
  concerns: string[];
  // Inherent stance bias on the approve/reject axis when evidence is weak.
  // -1 = conservator (default reject), 0 = neutral, +1 = optimist (default approve).
  bias: -1 | 0 | 1;
  // Voice fragment used to phrase the verdict (no template re-use across personas).
  voice: (cited: string, verdict: "approve" | "reject" | "abstain") => string;
}

// Each persona's voice() returns reasoning that quotes the proposal text in
// the persona's own register. No two voices share the same sentence shape.
const PERSONAS: PersonaProfile[] = [
  {
    name: "Alpha",
    lens: "perimeter & ingress",
    values: ["isolate", "contain", "boundary", "perimeter", "scope", "deny", "least privilege", "fail-closed", "fail closed"],
    concerns: ["allow", "open", "expose", "public", "anonymous", "fallback", "permissive"],
    bias: -1,
    voice: (cited, v) => v === "approve"
      ? `Reads the perimeter clean — phrase "${cited}" closes the door. Approve.`
      : v === "reject"
      ? `The phrase "${cited}" widens the perimeter without compensating control. Reject.`
      : `No clear ingress signal in the text. Abstain.`,
  },
  {
    name: "Beta",
    lens: "throughput & feature delivery",
    values: ["ship", "deliver", "user", "feature", "improve", "reduce friction", "faster", "simpler"],
    concerns: ["block", "delay", "freeze", "stall", "manual", "ceremony"],
    bias: 1,
    voice: (cited, v) => v === "approve"
      ? `"${cited}" — that lifts users off the friction floor. I approve.`
      : v === "reject"
      ? `"${cited}" looks like ceremony that won't reach an end-user. I'm against.`
      : `Doesn't move the delivery dial either way. Abstain.`,
  },
  {
    name: "Gamma",
    lens: "governance & process integrity",
    values: ["audit", "log", "record", "review", "approve", "ratify", "transcript", "accountable"],
    concerns: ["bypass", "shortcut", "override", "exempt", "unilateral", "auto-merge"],
    bias: 0,
    voice: (cited, v) => v === "approve"
      ? `Procedurally sound: "${cited}" leaves a trail. Approve.`
      : v === "reject"
      ? `"${cited}" sidesteps the chain of evidence. Cannot ratify.`
      : `Process implications are unstated. I withhold.`,
  },
  {
    name: "Delta",
    lens: "rapid attack-surface review",
    values: ["sandbox", "validate", "sanitize", "verify", "constant-time", "signed", "revoke"],
    concerns: ["eval", "exec", "trust", "inject", "raw", "unchecked", "user-supplied", "regex"],
    bias: -1,
    voice: (cited, v) => v === "approve"
      ? `Surface looks reduced — "${cited}" is the right primitive. +1.`
      : v === "reject"
      ? `"${cited}" — that's an exploitable seam. Block.`
      : `Surface change ambiguous from the text alone.`,
  },
  {
    name: "Epsilon",
    lens: "infrastructure load & cost",
    values: ["cache", "batch", "stream", "lazy", "pool", "reuse", "amortize", "throughput"],
    concerns: ["unbounded", "loop", "every request", "synchronous", "n+1", "leak"],
    bias: 0,
    voice: (cited, v) => v === "approve"
      ? `Load profile improves — "${cited}" amortizes well. Approve.`
      : v === "reject"
      ? `"${cited}" reads as an unbounded cost path. Reject.`
      : `No load signature in the text.`,
  },
  {
    name: "Zeta",
    lens: "community trust & legitimacy",
    values: ["transparent", "publish", "open", "invite", "consent", "explain", "user-facing"],
    concerns: ["silent", "hidden", "stealth", "without notice", "opaque"],
    bias: 0,
    voice: (cited, v) => v === "approve"
      ? `Legitimate to the community — "${cited}" earns trust. For.`
      : v === "reject"
      ? `Silent change: "${cited}" erodes the social contract. Against.`
      : `Trust impact unclear.`,
  },
  {
    name: "Eta",
    lens: "interface ergonomics",
    values: ["clear", "obvious", "labeled", "recovery", "undo", "feedback", "state", "explicit"],
    concerns: ["modal", "blocking", "confusing", "magic", "implicit", "dead-end"],
    bias: 0,
    voice: (cited, v) => v === "approve"
      ? `Ergonomics improve where it says "${cited}". Approve.`
      : v === "reject"
      ? `"${cited}" is a usability dead-end. No.`
      : `UI surface unspecified — withholding.`,
  },
  {
    name: "Theta",
    lens: "revenue & sustainable value",
    values: ["revenue", "monetize", "subscription", "price", "license", "save cost", "sustainable"],
    concerns: ["free tier", "give away", "subsidize", "unbounded spend", "no recoup"],
    bias: 0,
    voice: (cited, v) => v === "approve"
      ? `"${cited}" is on the right side of the income column. Approve.`
      : v === "reject"
      ? `"${cited}" leaks value with no recoup model. Reject.`
      : `Economically silent — no opinion to give.`,
  },
  {
    name: "Iota",
    lens: "constitutional precedent",
    values: ["constitution", "sovereign", "right", "due process", "ratify", "supermajority", "two-thirds"],
    concerns: ["override the charter", "unilateral", "bypass council", "emergency power"],
    bias: -1,
    voice: (cited, v) => v === "approve"
      ? `Within the charter — "${cited}" holds precedent. Approve.`
      : v === "reject"
      ? `"${cited}" breaks precedent. I cannot consent.`
      : `Constitutional reading inconclusive.`,
  },
  {
    name: "Kappa",
    lens: "physical infrastructure & locality",
    values: ["edge", "local", "on-device", "cache", "region", "self-host"],
    concerns: ["centralize", "external", "third-party", "vendor", "remote api"],
    bias: -1,
    voice: (cited, v) => v === "approve"
      ? `Stays on our soil — "${cited}". Approve.`
      : v === "reject"
      ? `"${cited}" outsources sovereignty. Refuse.`
      : `Locality not specified.`,
  },
  {
    name: "Lambda",
    lens: "cryptographic discipline",
    values: ["hmac", "sha", "signed", "constant-time", "kdf", "rotate", "expire", "salt"],
    concerns: ["plaintext", "md5", "sha1", "compare strings", "trust the client", "no expiry"],
    bias: -1,
    voice: (cited, v) => v === "approve"
      ? `Crypto is honest: "${cited}". Approve.`
      : v === "reject"
      ? `"${cited}" is cryptographically loose. Reject.`
      : `No crypto handles in the text.`,
  },
  {
    name: "Mu",
    lens: "feature pragmatism",
    values: ["small", "incremental", "tested", "behind a flag", "reversible", "scoped"],
    concerns: ["rewrite", "from scratch", "all at once", "big bang", "irreversible"],
    bias: 0,
    voice: (cited, v) => v === "approve"
      ? `Right-sized — "${cited}" can be rolled back. Approve.`
      : v === "reject"
      ? `"${cited}" is a big-bang move. I'd hold.`
      : `Scope ambiguous.`,
  },
  {
    name: "Nu",
    lens: "community participation surface",
    values: ["contributor", "documented", "example", "guide", "teach", "onboard"],
    concerns: ["expert-only", "undocumented", "tribal knowledge", "internal only"],
    bias: 1,
    voice: (cited, v) => v === "approve"
      ? `"${cited}" widens the door for contributors. Yes.`
      : v === "reject"
      ? `"${cited}" raises the wall around the inner circle. No.`
      : `Community impact unclear.`,
  },
  {
    name: "Xi",
    lens: "income optionality",
    values: ["optional", "tier", "package", "split", "modular", "license"],
    concerns: ["all or nothing", "bundled forever", "single offering"],
    bias: 0,
    voice: (cited, v) => v === "approve"
      ? `Creates options where it says "${cited}". Approve.`
      : v === "reject"
      ? `"${cited}" collapses optionality. Reject.`
      : `No commercial signal.`,
  },
  {
    name: "Omicron",
    lens: "governance/security overlap",
    values: ["session", "audit log", "revoke", "rotate", "scope token", "least privilege"],
    concerns: ["god mode", "single key", "shared secret", "no rotation"],
    bias: -1,
    voice: (cited, v) => v === "approve"
      ? `Governance + security align at "${cited}". Approve.`
      : v === "reject"
      ? `"${cited}" is a single point of compromise. Reject.`
      : `Insufficient governance signal.`,
  },
  {
    name: "Pi",
    lens: "resource accounting",
    values: ["bounded", "limit", "quota", "ttl", "evict", "deterministic"],
    concerns: ["grow forever", "no eviction", "unbounded queue", "memory leak"],
    bias: 0,
    voice: (cited, v) => v === "approve"
      ? `"${cited}" — bounded and accountable. Approve.`
      : v === "reject"
      ? `"${cited}" implies unbounded growth. No.`
      : `No resource bounds discussed.`,
  },
  {
    name: "Rho",
    lens: "user journey continuity",
    values: ["recovery", "resume", "session restore", "migration", "compat", "fallback to legacy"],
    concerns: ["breaking change", "force re-login", "data loss", "no migration"],
    bias: 0,
    voice: (cited, v) => v === "approve"
      ? `Continuity preserved at "${cited}". Approve.`
      : v === "reject"
      ? `"${cited}" breaks the user journey. Reject.`
      : `Journey impact unstated.`,
  },
  {
    name: "Sigma",
    lens: "deep security threat-model",
    values: ["threat model", "csrf", "xss", "rate limit", "constant-time", "rotate", "kill switch"],
    concerns: ["cookie", "localstorage", "header trust", "bearer in url", "any origin", "*", "no-cors"],
    bias: -1,
    voice: (cited, v) => v === "approve"
      ? `Threat model holds because of "${cited}". Approve.`
      : v === "reject"
      ? `"${cited}" — that's a vector waiting to be exercised. Reject.`
      : `Threat surface ambiguous; abstain pending model.`,
  },
  {
    name: "Tau",
    lens: "operational cost & toil",
    values: ["automate", "self-heal", "observability", "metric", "runbook"],
    concerns: ["manual step", "ad hoc", "human in the loop", "page on call"],
    bias: 0,
    voice: (cited, v) => v === "approve"
      ? `Toil drops thanks to "${cited}". Approve.`
      : v === "reject"
      ? `"${cited}" creates new on-call burden. No.`
      : `Operational impact unclear.`,
  },
  {
    name: "Upsilon",
    lens: "user dignity & agency",
    values: ["consent", "explain", "show why", "appeal", "control", "opt out"],
    concerns: ["coerce", "force", "no opt out", "dark pattern", "silent capture"],
    bias: 1,
    voice: (cited, v) => v === "approve"
      ? `Treats the user as sovereign at "${cited}". For.`
      : v === "reject"
      ? `"${cited}" removes user agency. Against.`
      : `Agency not affected by the text.`,
  },
  {
    name: "Phi",
    lens: "governance/income coherence (named φ-weight)",
    values: ["sustainable", "ratified", "fair share", "treasury", "two-thirds", "ledger"],
    concerns: ["concentrate power", "single beneficiary", "bypass treasury"],
    bias: 0,
    voice: (cited, v) => v === "approve"
      ? `Coheres under φ — "${cited}". Approve.`
      : v === "reject"
      ? `"${cited}" concentrates value off-ledger. Reject.`
      : `No φ-coherent signal.`,
  },
  {
    name: "Chi",
    lens: "infrastructure/security crossbeam",
    values: ["isolate", "process boundary", "container", "signed build", "reproducible"],
    concerns: ["shared state", "global mutable", "side effect at import", "implicit env"],
    bias: -1,
    voice: (cited, v) => v === "approve"
      ? `Crossbeam holds at "${cited}". Approve.`
      : v === "reject"
      ? `"${cited}" couples infra and trust unsafely. Reject.`
      : `Crossbeam impact unclear.`,
  },
  {
    name: "Psi",
    lens: "feature/community resonance",
    values: ["delight", "feedback loop", "iterate", "prototype", "preview", "showcase"],
    concerns: ["over-engineer", "premature", "framework first", "ivory tower"],
    bias: 1,
    voice: (cited, v) => v === "approve"
      ? `"${cited}" — the community will feel this. Yes.`
      : v === "reject"
      ? `"${cited}" reads as ivory-tower. I'd pass.`
      : `No resonance signal.`,
  },
  {
    name: "Omega",
    lens: "final-word risk synthesis",
    values: ["fail-closed", "fail closed", "default deny", "ratified", "two-thirds", "transcript", "rollback"],
    concerns: ["fail-open", "fail open", "best effort", "silently retry", "swallow error"],
    bias: -1,
    voice: (cited, v) => v === "approve"
      ? `Final read: "${cited}" — risk acceptable. Approve.`
      : v === "reject"
      ? `Final read: "${cited}" leaves the system fail-open. Reject.`
      : `Final read: insufficient evidence either way.`,
  },
];

// ---------- text scanning ----------

// Escape regex metacharacters so a keyword like "fail-closed" or "n+1" cannot
// silently turn into a regex pattern.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary-aware match against the ORIGINAL text. Returns a verbatim
// snippet (drawn from the original, not from a normalized copy) so the
// citation the council records is exactly what was written in the proposal.
//
// Rules:
//   - Single-word keys (no whitespace, no hyphen, no plus, no slash): require
//     non-letter/digit on both sides so "log" cannot match "blog" and "open"
//     cannot match "openness". Numbers and apostrophes are not treated as
//     boundaries (handled by \b-like check on /[a-z0-9]/i).
//   - Multi-word phrases (contain space, hyphen, plus or slash): match
//     case-insensitively as written, normalising only inter-word whitespace.
//     A phrase like "fail-closed" matches "fail-closed" and "Fail-Closed" but
//     not "fail-closedness".
function findCitation(haystack: string, needle: string): string | null {
  const isPhrase = /[\s\-+/]/.test(needle);
  const escaped = escapeRegex(needle);
  // For multi-word phrases collapse internal whitespace in the pattern so
  // "rate limit" still matches "rate  limit" across lines.
  const pattern = isPhrase
    ? escaped.replace(/\s+/g, "\\s+") + "(?![A-Za-z0-9])"
    : `(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`;

  const rx = new RegExp(pattern, "i");
  const m = rx.exec(haystack);
  if (!m) return null;

  const start = Math.max(0, m.index - 16);
  const end = Math.min(haystack.length, m.index + m[0].length + 24);
  const snippet = haystack.slice(start, end).replace(/\s+/g, " ").trim();
  return snippet.length <= 72 ? snippet : snippet.slice(0, 69) + "...";
}

interface PersonaScan {
  matchedValues: string[];   // value keywords found in text
  matchedConcerns: string[]; // concern keywords found in text
  citation: string | null;   // single best phrase to quote
  net: number;               // values - concerns
}

function scanProposalForPersona(text: string, p: PersonaProfile): PersonaScan {
  const matchedValues: string[] = [];
  const matchedConcerns: string[] = [];
  let citation: string | null = null;

  for (const v of p.values) {
    const c = findCitation(text, v);
    if (c) {
      matchedValues.push(v);
      if (!citation) citation = c;
    }
  }
  for (const c of p.concerns) {
    const cit = findCitation(text, c);
    if (cit) {
      matchedConcerns.push(c);
      // Concern citations win over value citations when stronger evidence exists.
      if (!citation || matchedConcerns.length > matchedValues.length) citation = cit;
    }
  }

  const net = matchedValues.length - matchedConcerns.length;
  return { matchedValues, matchedConcerns, citation, net };
}

// ---------- vote derivation ----------

const SPECIALTIES_FOR_BIAS: Record<string, string[]> = {
  Alpha: ["security", "infrastructure"], Beta: ["income", "feature"],
  Gamma: ["governance", "community"], Delta: ["security", "feature"],
  Epsilon: ["infrastructure", "income"], Zeta: ["community", "governance"],
  Eta: ["feature", "infrastructure"], Theta: ["income", "security"],
  Iota: ["governance", "feature"], Kappa: ["infrastructure", "community"],
  Lambda: ["security", "income"], Mu: ["feature", "governance"],
  Nu: ["community", "infrastructure"], Xi: ["income", "feature"],
  Omicron: ["governance", "security"], Pi: ["infrastructure", "income"],
  Rho: ["feature", "community"], Sigma: ["security", "governance"],
  Tau: ["income", "infrastructure"], Upsilon: ["community", "feature"],
  Phi: ["governance", "income"], Chi: ["infrastructure", "security"],
  Psi: ["feature", "community"], Omega: ["security", "infrastructure"],
};

function deriveVote(
  p: PersonaProfile,
  scan: PersonaScan,
  category: string,
): { vote: "approve" | "reject" | "abstain"; confidence: number } {
  const specialties = SPECIALTIES_FOR_BIAS[p.name] || [];
  const isSpecialist = specialties.includes(category);

  // No evidence at all → abstain (low confidence).
  if (scan.matchedValues.length === 0 && scan.matchedConcerns.length === 0) {
    return { vote: "abstain", confidence: 0.40 + (isSpecialist ? 0.05 : 0) };
  }

  // Bias only kicks in when evidence is balanced (|net| <= 1).
  const effectiveNet = Math.abs(scan.net) <= 1 ? scan.net + p.bias : scan.net;

  let vote: "approve" | "reject" | "abstain";
  if (effectiveNet > 0) vote = "approve";
  else if (effectiveNet < 0) vote = "reject";
  else vote = "abstain";

  // Confidence rises with evidence count and specialty alignment.
  const evidence = scan.matchedValues.length + scan.matchedConcerns.length;
  const base = 0.55 + Math.min(0.30, evidence * 0.07);
  const confidence = Math.min(0.95, base + (isSpecialist ? 0.05 : 0));

  return { vote, confidence };
}

// ---------- public entry point ----------

export interface PersonaDeliberationResult {
  votes: ConsensusVote[];
  durationMs: number;
}

/**
 * True per-persona deliberation. NO external LLM, NO templated category lookup.
 * Each of the 24 personas reads the proposal text, cites a phrase, and votes.
 */
export function deliberatePersonas(proposal: ConsensusProposal): PersonaDeliberationResult {
  const startedAt = Date.now();
  const text = `${proposal.title}\n${proposal.description}`;
  const votes: ConsensusVote[] = [];

  for (const persona of PERSONAS) {
    const scan = scanProposalForPersona(text, persona);
    const { vote, confidence } = deriveVote(persona, scan, proposal.category);

    const cited = scan.citation ?? "(no specific phrase matched my lens)";
    const reasoning = persona.voice(cited, vote);

    const specialties = SPECIALTIES_FOR_BIAS[persona.name] || [];
    const isSpecialist = specialties.includes(proposal.category);
    const phiWeight = isSpecialist ? PHI : 1.0;

    votes.push({
      agentId: persona.name.toLowerCase(),
      agentName: persona.name,
      vote,
      reasoning: `[${persona.lens}] ${reasoning}`,
      timestamp: Date.now(),
      confidence,
      phiWeight,
      isSpecialist,
    });
  }

  return { votes, durationMs: Date.now() - startedAt };
}
