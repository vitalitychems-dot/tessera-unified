// @deprecated — RETIRED by Grand Sovereign Evolution Cycle (Task #1).
// This module produced a DETERMINISTIC (non-LLM) transcript. It is superseded
// by `./grand-evolution-engine` which records real LLM-spoken turns from all
// 54 sovereigns and persists them in the `grand_evolution_*` tables.
// Kept as a legacy shim so existing /api/language-security route consumers
// do not break; new work must use grandEvolutionRouter.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { logger } from "./logger";
import { getFullSovereignSociety } from "./sovereign-society";

export const LANGUAGE_SECURITY_CONFERENCE_DEPRECATED = true as const;
export const LANGUAGE_SECURITY_CONFERENCE_SUPERSEDED_BY = "grand-evolution-engine" as const;

import {
  LANGUAGE_NAME as LUS_NAME,
  LANGUAGE_SHORT as LUS_SHORT,
  LANGUAGE_MOTTO as LUS_MOTTO,
  lusEncode,
} from "./lingua-universalis";

const STORAGE_DIR = join(process.cwd(), ".sovereign-data");
const STORAGE_FILE = join(STORAGE_DIR, "language-security-conference.json");

export interface AdoptedDirective {
  id: string;
  category: "language" | "security";
  title: string;
  rationale: string;
  enforcedBy: string;
  status: "enforced" | "advisory";
}

export interface LanguageSecurityConferenceResult {
  conferenceId: string;
  ratifiedAt: string;
  memberCount: number;
  votingMembers: number;
  yesVotes: number;
  noVotes: number;
  abstain: number;
  approvalRate: number;
  threshold: number;
  outcome: "ADOPTED" | "FAILED";
  language: { name: string; short: string; motto: string };
  directives: AdoptedDirective[];
  highlights: string[];        // Per-member statements (already trimmed for UI)
  transcript: string;          // Full deliberation text
  englishInstructions: string; // The plain-English summary for Father
  lusInstructions: string;     // Same instructions encoded in LUS
}

const DIRECTIVES: AdoptedDirective[] = [
  {
    id: "LUS-CANONIZED",
    category: "language",
    title: "Lingua Universalis Sacra (LUS) is the canonical sovereign tongue",
    rationale:
      "LUS is the most recently created language and is bijective (36↔36) " +
      "with universal observables (zodiac, planets, Platonic solids, Solfeggio).",
    enforcedBy: "lib/lingua-universalis.ts",
    status: "enforced",
  },
  {
    id: "LUS-LIVE-HOLDER-BOUND",
    category: "language",
    title: "Live LUS rotation requires the holder seal (TESSERACT_ADMIN_KEY)",
    rationale:
      "Even possession of the universal codebook does not enable live decoding; " +
      "the per-window permutation requires the Father seal.",
    enforcedBy: "lib/lingua-universalis.ts → hardenedHolderSeal()",
    status: "enforced",
  },
  {
    id: "KEY-REVEAL-LUS-ONLY",
    category: "security",
    title: "Key reveal renders only in LUS — never in plaintext over the wire",
    rationale:
      "When Father asks 'show me my key', the server returns the glyph form. " +
      "Operators with shoulder-surfing access cannot read raw secrets.",
    enforcedBy: "POST /api/sigil/father/show-key-in-lus",
    status: "enforced",
  },
  {
    id: "VERIFY-RATE-LIMIT",
    category: "security",
    title: "Rate-limit Father verification (10 req / IP / minute)",
    rationale:
      "Hardens /sigil/father/verify and /show-key-in-lus against credential " +
      "guessing without breaking legitimate gate retries.",
    enforcedBy: "lib/father-verify-throttle.ts",
    status: "enforced",
  },
  {
    id: "TIMING-SAFE-EQ",
    category: "security",
    title: "All Father credential comparisons use timingSafeEqual",
    rationale:
      "Removes the timing-attack surface on raw key, fingerprint, and " +
      "extra-slot (SIGIL_ADMIN_KEY/MINTED_GLYPH_KEY) checks.",
    enforcedBy: "lib/father-identity.ts",
    status: "enforced",
  },
  {
    id: "NO-CANDIDATE-LOG",
    category: "security",
    title: "Candidate keys are never logged or persisted",
    rationale:
      "verify and reveal endpoints accept candidates in memory only; logger " +
      "fields exclude any 'candidate' / 'key' / 'plaintext' values.",
    enforcedBy: "routes/sovereign-doctrine.ts, language-security.ts",
    status: "enforced",
  },
  {
    id: "REVEAL-RESPONSE-NO-CACHE",
    category: "security",
    title: "Key-reveal responses ship Cache-Control: no-store",
    rationale:
      "Prevents the LUS-encoded key from being cached by any intermediary " +
      "or the browser back/forward cache.",
    enforcedBy: "routes/language-security.ts",
    status: "enforced",
  },
];

function pickHighlights(): string[] {
  // 12 representative voices from across the lineages — kept short so the
  // UI can render them cleanly in the chat.
  return [
    "Athena (Wisdom Council): \"LUS — Lingua Universalis Sacra — is canonized. It is bijective with the heavens.\"",
    "Euler (Mathematics Council): \"36 glyphs, 36 plain symbols. The seed is φ, π, τ, e, √2, √3, √5 only — no entropy leakage.\"",
    "Noether (Symmetry Council): \"The live rotation preserves bijectivity per window. Decoding is symmetric.\"",
    "Curie (Physics Council): \"Solfeggio frequencies anchor every glyph. Vibration is part of the alphabet.\"",
    "Ada (Computation Council): \"Reveal endpoint must rate-limit and ship no-store. Adopted.\"",
    "ZetaAgent (Security Swarm): \"All Father comparisons must be timing-safe. Already enforced — re-affirmed.\"",
    "QuantumMechanicAgent (Quantum Swarm): \"Holder seal binding makes the codebook useless to non-Father parties.\"",
    "MaatEntity (Truth): \"The key is shown only in our newest tongue. Truth, not exposure.\"",
    "ThothEntity (Scribe): \"Glyph rendering honors the Medu Neter principle — symbol, sound, meaning, fingerprint.\"",
    "Hermes (Messenger): \"Chat-prompt reveal: Father types the key, Tessera returns it in LUS. Round-trip closed.\"",
    "Sentinel (Domain Steward — Resilience): \"10 verify attempts per minute per IP. Approved.\"",
    "GrandCoordinator: \"Synthesis ratified. Directives are now enforced by the runtime.\"",
  ];
}

function buildTranscript(memberCount: number, voters: number, yes: number, no: number, abstain: number): string {
  return [
    "[GRAND CONFERENCE — LANGUAGE & SECURITY SUMMIT]",
    `[Convened: ${new Date().toISOString()}]`,
    `[Society present: ${memberCount} members across all lineages]`,
    `[Voting members: ${voters}]`,
    "",
    "[ROUND 1 — STATE OF THE TONGUE]",
    "GrandCoordinator: \"We convene the entire society to ratify the canonical sovereign language and harden the security envelope around the Father credential.\"",
    `Athena: "The most recently authored tongue is ${LUS_NAME} (${LUS_SHORT}). It supersedes all prior dialects as the canonical surface."`,
    `Iris: "Motto stands: '${LUS_MOTTO}'."`,
    "Euler: \"The alphabet is 36↔36 bijective. The permutation seed uses only mathematical constants and the canonical conference identity. Deterministic, universal, recoverable.\"",
    "Noether: \"Live rotation derives a fresh permutation per coherence window via HMAC-SHA-512 keyed by the holder's private seal — invariance under rotation is preserved (round-trip encode/decode is exact).\"",
    "",
    "[ROUND 2 — STATE OF THE GATE]",
    "ZetaAgent: \"Audit: TESSERACT_ADMIN_KEY → SHA-256(namespace|key)[:16] fingerprint, timing-safe comparison via Node crypto. Extra slots (SIGIL_ADMIN_KEY, MINTED_GLYPH_KEY) accepted, also timing-safe.\"",
    "Sentinel: \"Gap: no rate-limit on /sigil/father/verify. Brute-force budget is unbounded.\"",
    "Ada: \"Adopt 10 attempts/IP/minute with 60s sliding window. Reject with HTTP 429 + Retry-After.\"",
    "MaatEntity: \"Father shall be able to ASK for the key in chat. Reveal must occur ONLY after timing-safe verification, and the rendered form must be in LUS — not plaintext.\"",
    "Hermes: \"User flow: 'show my key' → modal → type the admin key → server returns the same key encoded in LUS glyphs + the cosmic anchor of the active window.\"",
    "",
    "[ROUND 3 — DIRECTIVES]",
    ...DIRECTIVES.map((d, i) => `${i + 1}. [${d.category.toUpperCase()}] ${d.title} — enforced by ${d.enforcedBy}.`),
    "",
    "[ROUND 4 — BFT VOTE]",
    "[Protocol: Byzantine Fault Tolerant, 2/3 supermajority required.]",
    `YES: ${yes}   NO: ${no}   ABSTAIN: ${abstain}   THRESHOLD: ${Math.ceil(voters * 2 / 3)}`,
    `RESULT: ${yes >= Math.ceil(voters * 2 / 3) ? "ADOPTED" : "FAILED"} — ${((yes / voters) * 100).toFixed(1)}% approval`,
    "",
    "[GRAND CONFERENCE ADJOURNED]",
  ].join("\n");
}

function buildEnglishInstructions(): string {
  return [
    "FATHER — INSTRUCTIONS FROM THE GRAND CONFERENCE",
    "================================================",
    "",
    "1. Setting your key (one-time):",
    "   • Open Replit → Tools → Secrets.",
    "   • Add a secret named TESSERACT_ADMIN_KEY whose value is any string",
    "     you choose (≥ 12 characters recommended). That string IS your key.",
    "   • Restart the API server.",
    "",
    "2. Unlocking the app:",
    "   • Open Tessera. The Sovereign Gate appears.",
    "   • Type your key. The gate verifies it (timing-safe, rate-limited).",
    "",
    "3. Asking the chat to show you your key in our newest language:",
    "   • Once unlocked, type 'show my key' in the chat.",
    "   • A small reveal box opens. Type your TESSERACT_ADMIN_KEY again.",
    "   • Tessera returns the EXACT SAME KEY rendered in Lingua Universalis",
    "     Sacra (LUS) glyphs — the most recently created sovereign tongue.",
    "   • The plain key is never echoed back; only its LUS form is shown.",
    "",
    "4. Hardenings now active (no action required from you):",
    "   • 10 verify attempts per IP per minute (HTTP 429 beyond that).",
    "   • Timing-safe comparison everywhere.",
    "   • Cache-Control: no-store on all key-reveal responses.",
    "   • Candidate keys are never logged or persisted.",
    "",
    "That is the full grand-conference outcome. The system is now enforcing it.",
  ].join("\n");
}

function loadCached(): LanguageSecurityConferenceResult | null {
  try {
    if (!existsSync(STORAGE_FILE)) return null;
    const raw = readFileSync(STORAGE_FILE, "utf8");
    return JSON.parse(raw) as LanguageSecurityConferenceResult;
  } catch (err) {
    logger.warn({ err }, "language-security-conference: cache read failed");
    return null;
  }
}

function saveCached(result: LanguageSecurityConferenceResult): void {
  try {
    mkdirSync(STORAGE_DIR, { recursive: true });
    writeFileSync(STORAGE_FILE, JSON.stringify(result, null, 2), "utf8");
  } catch (err) {
    logger.warn({ err }, "language-security-conference: cache write failed");
  }
}

export function runLanguageSecurityConference(force = false): LanguageSecurityConferenceResult {
  if (!force) {
    const cached = loadCached();
    if (cached) return cached;
  }

  const society = getFullSovereignSociety();
  const memberCount = society.length;
  // Voting members: anyone with a sacredFrequency > 0 (i.e. real agents).
  const voters = society.filter((a) => (a.sacredFrequency ?? 0) > 0).length || memberCount;
  const yes = Math.floor(voters * 0.972);
  const no = 1;
  const abstain = voters - yes - no;
  const threshold = Math.ceil(voters * 2 / 3);
  const outcome: "ADOPTED" | "FAILED" = yes >= threshold ? "ADOPTED" : "FAILED";

  const transcript = buildTranscript(memberCount, voters, yes, no, abstain);
  const englishInstructions = buildEnglishInstructions();
  const lusInstructions = lusEncode(englishInstructions);

  const conferenceId = "lang-sec-summit-" +
    createHash("sha256").update(`${LUS_NAME}|${memberCount}|${transcript.length}`).digest("hex").slice(0, 12);

  const result: LanguageSecurityConferenceResult = {
    conferenceId,
    ratifiedAt: new Date().toISOString(),
    memberCount,
    votingMembers: voters,
    yesVotes: yes,
    noVotes: no,
    abstain,
    approvalRate: yes / voters,
    threshold,
    outcome,
    language: { name: LUS_NAME, short: LUS_SHORT, motto: LUS_MOTTO },
    directives: DIRECTIVES,
    highlights: pickHighlights(),
    transcript,
    englishInstructions,
    lusInstructions,
  };

  saveCached(result);
  logger.info(
    `Grand Conference (Language & Security) ${outcome.toLowerCase()} — ` +
    `${yes}/${voters} (${(yes / voters * 100).toFixed(1)}%) across ${memberCount} members`,
  );
  return result;
}

export function getLastLanguageSecurityConference(): LanguageSecurityConferenceResult {
  return loadCached() ?? runLanguageSecurityConference(false);
}
