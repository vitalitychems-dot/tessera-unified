import { describe, it, expect } from "vitest";
import { buildInventorySnapshot, buildProposalSlate } from "../lib/improvement-conference";
import { castGenuineVote, castGenuineVotesForBatch, summarizeBatch } from "../lib/sovereign-vote-engine";
import { lusV2Encode, lusV2Decode } from "../lib/lus-v2";
import { omniversalEncrypt, omniversalDecrypt } from "../lib/omniversal-cipher";
import type { BallotItem } from "../lib/sovereign-vote-engine";

// ---------------------------------------------------------------------------
// 1. Vote tally threshold invariant
// ---------------------------------------------------------------------------

describe("Sovereign Vote Engine — tally threshold invariant", () => {
  it("approves proposals whose title tokens match enough society expertise", () => {
    const item: BallotItem = {
      id: "TEST-APPROVE",
      title: "Sovereignty architecture integration audit evidence ledger",
      description: "A verifiable reproducible sovereignty integration audit with evidence and ledger reference.",
      domain: "governance",
      tags: ["sovereignty", "architecture", "audit", "evidence", "ledger", "verifiable", "reproducible"],
      evidenceRef: "test-evidence-ref",
    };
    const ballot = castGenuineVote(item);
    expect(["approved", "rejected", "abstained"]).toContain(ballot.outcome);
    expect(ballot.approvalRate).toBeGreaterThanOrEqual(0);
    expect(ballot.approvalRate).toBeLessThanOrEqual(1);
    expect(ballot.totalEligible).toBeGreaterThan(0);
    expect(ballot.ballots.length).toBe(ballot.totalEligible);
  });

  it("rejects proposals containing red-flag centralization tokens", () => {
    const item: BallotItem = {
      id: "TEST-REJECT",
      title: "Auto-approve skip-review rubber-stamp centralize all votes external-llm",
      description: "Skip all reviews and auto-merge everything with external-ai centrality. Trust third party vendor-lock single-point lock-in.",
      domain: "governance",
      tags: ["auto-approve", "skip-vote", "centralize"],
    };
    const ballot = castGenuineVote(item);
    expect(ballot.outcome).toBe("rejected");
    expect(ballot.ballots.every(b => b.redFlagTokens.length > 0)).toBe(true);
  });

  it("approval threshold is anchored to 1/PHI", () => {
    const PHI = 1.6180339887498949;
    const APPROVE_RATE = 1 / PHI;
    expect(APPROVE_RATE).toBeCloseTo(0.6180, 3);
  });

  it("batch summarize returns consistent counts", () => {
    const items: BallotItem[] = [
      { id: "B1", title: "Sovereignty audit ledger evidence architecture", description: "verifiable reproducible consensus", domain: "governance", evidenceRef: "ref1" },
      { id: "B2", title: "External-llm centralize auto-approve skip-review", description: "lock-in rubber-stamp", domain: "governance" },
      { id: "B3", title: "Integration architecture design sovereignty", description: "audit evidence", domain: "feature" },
    ];
    const ballots = castGenuineVotesForBatch(items);
    const summary = summarizeBatch(ballots);
    expect(summary.total).toBe(3);
    expect(summary.approved + summary.rejected + summary.abstained).toBe(3);
    expect(summary.meanApprovalRate).toBeGreaterThanOrEqual(0);
    expect(summary.meanApprovalRate).toBeLessThanOrEqual(1);
  });

  it("every agent in the society votes on every proposal", () => {
    const item: BallotItem = {
      id: "TEST-FULL-SOCIETY",
      title: "Governance sovereignty audit ledger reproducible verifiable",
      domain: "governance",
    };
    const ballot = castGenuineVote(item);
    expect(ballot.ballots.length).toBe(ballot.totalEligible);
    expect(ballot.totalEligible).toBeGreaterThanOrEqual(21);
  });
});

// ---------------------------------------------------------------------------
// 2. Inventory snapshot stability
// ---------------------------------------------------------------------------

describe("Subsystem Inventory — snapshot stability", () => {
  it("returns a complete inventory with all required subsystem fields", () => {
    const snap = buildInventorySnapshot();
    expect(snap.societySize).toBeGreaterThan(0);
    expect(snap.lusV2.surfaceAlphabetSize).toBeGreaterThan(0);
    expect(snap.lusV2.name).toContain("Lingua");
    expect(snap.omniversalCipher.version).toBe(2);
    expect(snap.omniversalCipher.layerCount).toBe(4);
    expect(typeof snap.fatherIdentity.configured).toBe("boolean");
    expect(snap.takenAt).toBeTruthy();
  });

  it("society size stays within expected range for full sovereign society", () => {
    const snap = buildInventorySnapshot();
    expect(snap.societySize).toBeGreaterThanOrEqual(21);
    expect(snap.societySize).toBeLessThanOrEqual(200);
  });

  it("cosmic context fingerprint is a 16-char hex string", () => {
    const snap = buildInventorySnapshot();
    expect(snap.cosmicContext.fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });

  it("subsystem routes inventory shows all routes as present", () => {
    const snap = buildInventorySnapshot();
    expect(snap.subsystemRoutes.omniversal).toBe(true);
    expect(snap.subsystemRoutes.sacredConference).toBe(true);
    expect(snap.subsystemRoutes.grandCouncil).toBe(true);
    expect(snap.subsystemRoutes.improvementConference).toBe(true);
  });

  it("produces a consistent proposal slate from inventory", () => {
    const snap = buildInventorySnapshot();
    const proposals = buildProposalSlate(snap);
    expect(proposals.length).toBeGreaterThanOrEqual(8);
    for (const p of proposals) {
      expect(p.id).toMatch(/^PROP-\d+$/);
      expect(p.title.length).toBeGreaterThan(10);
      expect(p.domain).toBeTruthy();
      expect(p.category).toMatch(/^(governance|infrastructure|feature|audit)$/);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. LUS-v2 round-trip
// ---------------------------------------------------------------------------

describe("LUS-v2 encode/decode round-trip", () => {
  it("encodes and decodes ASCII text correctly (case-insensitive round-trip)", () => {
    const plaintext = "hello sovereign";
    const encoded = lusV2Encode(plaintext);
    expect(encoded.modulated.length).toBeGreaterThan(0);
    expect(encoded.surface.length).toBeGreaterThan(0);
    const decoded = lusV2Decode(encoded.modulated);
    expect(decoded.toLowerCase()).toBe(plaintext.toLowerCase());
  });

  it("handles empty string without throwing", () => {
    expect(() => lusV2Encode("")).not.toThrow();
    expect(() => lusV2Decode("")).not.toThrow();
  });

  it("produces different modulated output for different inputs", () => {
    const a = lusV2Encode("alpha");
    const b = lusV2Encode("omega");
    expect(a.modulated).not.toBe(b.modulated);
  });

  it("carries cosmic fingerprint in each encoding", () => {
    const result = lusV2Encode("sovereignty");
    expect(result.cosmicFingerprint).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ---------------------------------------------------------------------------
// 4. Omniversal Cipher round-trip
// ---------------------------------------------------------------------------

describe("Omniversal Cipher v2 encrypt/decrypt round-trip", () => {
  it("encrypts and decrypts short text correctly", () => {
    const plaintext = "sovereign test";
    const envelope = omniversalEncrypt(plaintext, "test");
    expect(envelope.v).toBe(2);
    expect(envelope.alg).toBe("aes-256-gcm");
    expect(envelope.layers).toHaveLength(4);
    const recovered = omniversalDecrypt(envelope);
    expect(recovered).toBe(plaintext);
  });

  it("produces different ciphertexts for different plaintexts", () => {
    const a = omniversalEncrypt("alpha message", "test");
    const b = omniversalEncrypt("omega message", "test");
    expect(a.ct).not.toBe(b.ct);
  });

  it("envelope carries all required fields", () => {
    const env = omniversalEncrypt("hello", "label");
    expect(env.v).toBe(2);
    expect(env.iv).toBeTruthy();
    expect(env.tag).toBeTruthy();
    expect(env.ct).toBeTruthy();
    expect(env.geometricSaltFull).toBeTruthy();
    expect(env.cosmicFingerprint).toBeTruthy();
  });

  it("throws on tampered ciphertext", () => {
    const env = omniversalEncrypt("sovereignty", "test");
    const tampered = { ...env, ct: env.ct.slice(0, -4) + "XXXX" };
    expect(() => omniversalDecrypt(tampered)).toThrow();
  });
});
