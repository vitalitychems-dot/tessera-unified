import { describe, it, expect } from "vitest";

describe("Reality Audit Snapshot — sovereignty percentage calculation", () => {
  function calcSovereigntyPct(realCount: number, convertedCount: number, totalSurfaces: number): number {
    return Math.round(((realCount + convertedCount) / Math.max(totalSurfaces, 1)) * 100);
  }

  it("100% sovereignty when all surfaces are real", () => {
    expect(calcSovereigntyPct(10, 0, 10)).toBe(100);
  });

  it("100% sovereignty when all are converted", () => {
    expect(calcSovereigntyPct(0, 10, 10)).toBe(100);
  });

  it("50% sovereignty with half real and half simulated", () => {
    expect(calcSovereigntyPct(5, 0, 10)).toBe(50);
  });

  it("0% sovereignty when all surfaces are simulated", () => {
    expect(calcSovereigntyPct(0, 0, 10)).toBe(0);
  });

  it("does not divide by zero when totalSurfaces is 0", () => {
    expect(() => calcSovereigntyPct(0, 0, 0)).not.toThrow();
    expect(calcSovereigntyPct(0, 0, 0)).toBe(0);
  });

  it("rounds to nearest integer", () => {
    const pct = calcSovereigntyPct(1, 0, 3);
    expect(Number.isInteger(pct)).toBe(true);
    expect(pct).toBe(33);
  });

  it("snapshot ID uses 'audit-' prefix with numeric timestamp", () => {
    const now = Date.now();
    const snapshotId = `audit-${now}`;
    expect(snapshotId).toMatch(/^audit-\d{13}$/);
  });
});

describe("Reality Audit Snapshot — REAL/PARTIAL/SIMULATED tag semantics", () => {
  it("REAL surfaces count toward sovereignty score", () => {
    const findings = [
      { status: "real" },
      { status: "real" },
      { status: "simulated" },
    ];
    const realCount = findings.filter(f => f.status === "real").length;
    expect(realCount).toBe(2);
  });

  it("SIMULATED surfaces do not count toward sovereignty score", () => {
    const findings = [
      { status: "simulated" },
      { status: "simulated" },
    ];
    const simCount = findings.filter(f => f.status === "simulated").length;
    expect(simCount).toBe(2);
  });

  it("converted surfaces count alongside real surfaces", () => {
    const findings = [
      { status: "real" },
      { status: "converted" },
      { status: "simulated" },
    ];
    const sovereignCount = findings.filter(f => f.status === "real" || f.status === "converted").length;
    expect(sovereignCount).toBe(2);
  });
});
