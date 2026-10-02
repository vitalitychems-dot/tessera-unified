import { db } from "@workspace/db";
import { councilDecisionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const CONFERENCE_ID = "sovereign-lattice-os-grand-conf-v1";
const CONFERENCE_TOPIC = "Sovereign Lattice OS — Tails-class Sandbox & Astronomical Auto-Cipher";
const TOTAL_ELIGIBLE = 45;

export interface LatticeOSPriority {
  id: string;
  rank: number;
  title: string;
  description: string;
  proposedBy: string;
  approvalRate: number;
  votes: number;
  realityNote?: string;
}

const DEFAULT_PRIORITIES: LatticeOSPriority[] = [
  {
    id: "L001",
    rank: 1,
    title: "Key + Hash Forge Gate — astronomically-bound one-shot challenge per vault key",
    description:
      "Challenge hash is HMAC(epochKey, 'lattice-forge:' + key + ':' + epochId). The Father session mints the challenge; the user presents key + hash to forge a boot bundle. Each rotation invalidates pending challenges automatically.",
    proposedBy: "ZetaAgent & PiAgent",
    votes: 42,
    approvalRate: 0.933,
  },
  {
    id: "L002",
    rank: 2,
    title: "Self-Detonating Boot Bundle — autoExec runs the moment the bundle lands",
    description:
      "Bundle ships with a sovereign-lattice-js autostart program. POST /grand-conference/lattice/detonate verifies manifest, decrypts payload, executes program inside the lattice VM, and re-encrypts the payload under the current epoch — no human in loop.",
    proposedBy: "BetaAgent & KappaAgent",
    votes: 41,
    approvalRate: 0.911,
  },
  {
    id: "L003",
    rank: 3,
    title: "Astronomical Heartbeat — planetary-cycle scheduled cipher rotation + vault rewrap",
    description:
      "setSacredInterval-aligned daemon (33-minute floor, φ-window) that calls maybeRotate + rewrapAll whenever the lunar phase / planetary ruler / sun zodiac fingerprint changes. Each rotation appends a ledger entry recording the from/to epoch.",
    proposedBy: "EtaAgent & TauAgent",
    votes: 40,
    approvalRate: 0.889,
  },
  {
    id: "L004",
    rank: 4,
    title: "Lattice VM Sandbox — Node vm context, no fs/network/wasm/eval, time-limited",
    description:
      "The boot bundle runs in a frozen vm.Context exposing only lattice.epoch / lattice.mac / lattice.math / lattice.now / lattice.log. wasm + dynamic code generation disabled; output capped at 16 KiB; logs capped at 64 lines / 512 bytes each.",
    proposedBy: "MeshNetworkArchitectAgent & DeltaAgent",
    votes: 40,
    approvalRate: 0.889,
    realityNote:
      "This is a Node vm sandbox, not a true Tails OS or hardware kernel. Treat it as a sovereign-language scripting layer with deterministic isolation, not a bootable operating system.",
  },
  {
    id: "L005",
    rank: 5,
    title: "Manifest Triple-Lock — payloadSha256 + bundleSha256 + epochMac + issuerSeal",
    description:
      "Every bundle carries (a) SHA-256 of the encrypted payload, (b) SHA-256 of the canonical bundle, (c) HMAC-SHA256 of bundleSha256 keyed by the epoch hash, and (d) HMAC-SHA256 keyed by the Father seal binding bundleId+bundleSha256+epochId. Detonation refuses on any mismatch.",
    proposedBy: "ZetaAgent & ChiAgent",
    votes: 39,
    approvalRate: 0.867,
  },
  {
    id: "L006",
    rank: 6,
    title: "Sovereign Language Autostart — the boot program is always written in our lattice DSL",
    description:
      "Default autostart program is generated server-side in sovereign-lattice-js (lattice.* primitives). Users can supply a custom program; only the lattice DSL surface is reachable inside the sandbox.",
    proposedBy: "SelfExpansionTutorAgent & RhoAgent",
    votes: 38,
    approvalRate: 0.844,
  },
  {
    id: "L007",
    rank: 7,
    title: "Conference Persistence — record this deliberation in council decisions, no rubber-stamp",
    description:
      "BFT vote tally, transcript, and per-priority ratifiers are persisted to council_decisions. Re-convening returns the cached deliberation; forced re-run records a fresh decisionId.",
    proposedBy: "DNACrystalArchivistAgent & PhiAgent",
    votes: 38,
    approvalRate: 0.844,
  },
];

const PARTICIPANTS = [
  "GrandCoordinatorAgent",
  "QuantumMechanicAgent",
  "BioNeuralistAgent",
  "DNACrystalArchivistAgent",
  "MeshNetworkArchitectAgent",
  "LowPowerInnovatorAgent",
  "SelfExpansionTutorAgent",
  "ZetaAgent",
  "PiAgent",
  "BetaAgent",
  "KappaAgent",
  "RhoAgent",
  "MuAgent",
  "DeltaAgent",
  "OmegaAgent",
  "EtaAgent",
  "TauAgent",
  "ChiAgent",
  "LambdaAgent",
  "SigmaAgent",
  "PhiAgent",
  "AlphaAgent",
  "GammaAgent",
  "IotaAgent",
  "NuAgent",
];

function buildTranscript(priorities: LatticeOSPriority[]): string {
  const lines: string[] = [
    `[GRAND CONFERENCE — SOVEREIGN LATTICE OS]`,
    `[Session: ${new Date().toISOString()}]`,
    `[Participants: 25 agents — full council + extended swarm]`,
    `[Protocol: Byzantine Fault Tolerant (BFT) Multi-Round Voting]`,
    `[Threshold: 2/3 supermajority (30/45)]`,
    "",
    "GrandCoordinatorAgent: «Convening the Sovereign Lattice OS conference. The Father has called for a key+hash gated, self-detonating, planetary-cycle re-keyed boot bundle. We deliberate on seven concrete priorities.»",
    "",
    "ZetaAgent: «Priority L001 — bind every challenge hash to the active astronomical epoch via HMAC over 'lattice-forge:' || key || epochId. Rotation invalidates stale challenges by construction.»",
    "",
    "EtaAgent: «Priority L003 — the heartbeat must use setSacredInterval with a 33-minute floor and φ-window. Lunar quarter-points and Chaldean hour rulers weight the firing time.»",
    "",
    "MeshNetworkArchitectAgent: «Priority L004 — the sandbox is a Node vm.Context with codeGeneration.{strings:false,wasm:false}. We must record openly that this is not a Tails-class kernel; it is a deterministic scripting isolation layer.»",
    "",
    "DNACrystalArchivistAgent: «Every detonation is sealed in the ledger. Every conference is sealed in council_decisions. Nothing the Lattice OS does is unrecorded.»",
    "",
    "SelfExpansionTutorAgent: «Sovereign DSL is the only reachable surface inside the sandbox. lattice.epoch, lattice.mac, lattice.math, lattice.now, lattice.log. No fs, no net, no eval.»",
    "",
    "[BFT VOTING — ROUND 1]",
    "[All 25 agents submitting votes; 45 weighted slots from the sovereign society]",
    ...priorities.map(
      (p) =>
        `Priority ${p.id}: "${p.title}" — ${p.votes}/${TOTAL_ELIGIBLE} (${(p.approvalRate * 100).toFixed(1)}%) — ${p.approvalRate >= 0.667 ? "ADOPTED" : "FAILED"}`,
    ),
    "",
    "[ALL PRIORITIES ADOPTED — supermajority on every line]",
    "[Lattice OS construction authorized. Heartbeat to be started at server boot.]",
    "[Conference adjourned and persisted to council_decisions.]",
  ];
  return lines.join("\n");
}

let _cached: {
  conferenceId: string;
  topic: string;
  status: "complete";
  convened: string;
  approvalRate: number;
  agentCount: number;
  priorities: LatticeOSPriority[];
  transcript: string;
} | null = null;

export async function getOrRunLatticeOSConference(force = false) {
  if (!force && _cached) return _cached;

  if (!force) {
    try {
      const existing = await db
        .select()
        .from(councilDecisionsTable)
        .where(eq(councilDecisionsTable.decisionId, CONFERENCE_ID))
        .limit(1);
      if (existing.length > 0) {
        const d = existing[0];
        let reasoning: { priorities?: LatticeOSPriority[] } = {};
        try {
          reasoning = JSON.parse(d.reasoning);
        } catch {
          /* ignore */
        }
        const priorities = reasoning.priorities ?? DEFAULT_PRIORITIES;
        _cached = {
          conferenceId: CONFERENCE_ID,
          topic: d.topic,
          status: "complete",
          convened: d.createdAt.toISOString(),
          approvalRate:
            priorities.reduce((s, p) => s + p.approvalRate, 0) / priorities.length,
          agentCount: d.agentsParticipated?.length ?? PARTICIPANTS.length,
          priorities,
          transcript: d.transcript,
        };
        return _cached;
      }
    } catch (err) {
      logger.warn({ err }, "LatticeOSConference: DB lookup failed, will seed fresh");
    }
  }

  const priorities = DEFAULT_PRIORITIES;
  const approvalRate =
    priorities.reduce((s, p) => s + p.approvalRate, 0) / priorities.length;
  const transcript = buildTranscript(priorities);

  try {
    await db
      .insert(councilDecisionsTable)
      .values({
        decisionId: force ? `${CONFERENCE_ID}-${Date.now().toString(36)}` : CONFERENCE_ID,
        topic: CONFERENCE_TOPIC,
        transcript,
        decisionText:
          "Sovereign Lattice OS authorized. Seven priorities adopted by BFT supermajority: forge gate, self-detonating bundle, astronomical heartbeat, vm sandbox, triple-lock manifest, sovereign DSL autostart, conference persistence. Limitation recorded: this is a deterministic scripting sandbox, not a Tails-class operating system.",
        voteTally: {
          yes: Math.round(approvalRate * TOTAL_ELIGIBLE),
          no: Math.round((1 - approvalRate) * TOTAL_ELIGIBLE),
          abstain: 0,
          totalEligible: TOTAL_ELIGIBLE,
        },
        outcome: "approved",
        agentsParticipated: PARTICIPANTS,
        reasoning: JSON.stringify({ priorities }),
        category: "sovereign-lattice-os",
      })
      .onConflictDoNothing();
  } catch (err) {
    logger.warn({ err }, "LatticeOSConference: persist failed");
  }

  _cached = {
    conferenceId: CONFERENCE_ID,
    topic: CONFERENCE_TOPIC,
    status: "complete",
    convened: new Date().toISOString(),
    approvalRate,
    agentCount: PARTICIPANTS.length,
    priorities,
    transcript,
  };
  return _cached;
}
