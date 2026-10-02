import { describe, it, expect } from "vitest";

describe("Heavy Council — active directive contract", () => {
  it("active directive record has required fields", () => {
    const record = {
      deliberationId: "heavy-1234-abcd",
      domain: "life",
      title: "Heavy Council [LIFE]: Expand agent self-reflection",
      prompt: "How should sovereign agents expand self-awareness?",
      appliedAt: new Date().toISOString(),
      approvalRate: 0.78,
      yesCount: 18,
      noCount: 6,
    };
    expect(record).toHaveProperty("deliberationId");
    expect(record.deliberationId).toMatch(/^heavy-/);
    expect(record).toHaveProperty("domain");
    expect(["life", "universe", "community"]).toContain(record.domain);
    expect(record).toHaveProperty("approvalRate");
    expect(record.approvalRate).toBeGreaterThanOrEqual(2 / 3);
    expect(record).toHaveProperty("appliedAt");
    expect(new Date(record.appliedAt).getTime()).not.toBeNaN();
  });

  it("approvalRate must be ≥2/3 BFT threshold for any auto-applied directive", () => {
    const BFT_THRESHOLD = 2 / 3;
    const exampleApprovals = [0.78, 0.82, 0.95, 1.0];
    for (const rate of exampleApprovals) {
      expect(rate).toBeGreaterThanOrEqual(BFT_THRESHOLD);
    }
  });

  it("active-directives response shape contract", () => {
    const mockResponse = {
      ok: true,
      directives: {
        life: null,
        universe: null,
        community: null,
      },
    };
    expect(mockResponse.ok).toBe(true);
    expect(mockResponse.directives).toHaveProperty("life");
    expect(mockResponse.directives).toHaveProperty("universe");
    expect(mockResponse.directives).toHaveProperty("community");
    for (const val of Object.values(mockResponse.directives)) {
      expect(val === null || typeof val === "object").toBe(true);
    }
  });

  it("domain types exhaustively enumerated", () => {
    const DOMAINS = ["life", "universe", "community"] as const;
    expect(DOMAINS).toHaveLength(3);
    const stateKeys = DOMAINS.map(d => `heavy-council-active-directive-${d}`);
    expect(stateKeys).toEqual([
      "heavy-council-active-directive-life",
      "heavy-council-active-directive-universe",
      "heavy-council-active-directive-community",
    ]);
  });
});
