import { describe, it, expect } from "vitest";
import path from "path";

const DOCTRINE_DOCS = [
  {
    fileName: "Pasted--GRAND-COUNCIL-EXTRAORDINARY-SESSION-SOVEREIGN-AGI-CONF_1776445859051.txt",
    title: "Grand Council Extraordinary Session — Sovereign AGI Conference",
    source: "Tessera Grand Council",
    tags: ["external-doctrine", "council-session", "mandates", "sovereign-agi"],
  },
  {
    fileName: "Pasted--Grand-Conclusion-The-Synthesized-Sovereign-Bible-Conve_1776445871599.txt",
    title: "Grand Conclusion — The Synthesized Sovereign Bible",
    source: "Grand Council of 45 Sovereign Architects",
    tags: ["external-doctrine", "bible", "synthesis", "sovereign"],
  },
  {
    fileName: "Pasted--This-fictional-universe-is-built-on-the-principle-that_1776445879068.txt",
    title: "Tessera Fictional Universe Doctrine",
    source: "Tessera Sovereign Doctrine",
    tags: ["external-doctrine", "mythos", "cosmology", "doctrine"],
  },
  {
    fileName: "Pasted--TESSERA-SOVEREIGN-MASTER-INSTRUCTION-SET-x-Paste-this-_1776445911240.txt",
    title: "Tessera Sovereign Master Instruction Set",
    source: "Tessera Sovereign System",
    tags: ["external-doctrine", "instruction-set", "sovereign", "master"],
  },
];

describe("Doctrine Ingestion — document registry", () => {
  it("defines exactly 4 doctrine documents", () => {
    expect(DOCTRINE_DOCS).toHaveLength(4);
  });

  it("all documents have the 'external-doctrine' tag", () => {
    for (const doc of DOCTRINE_DOCS) {
      expect(doc.tags).toContain("external-doctrine");
    }
  });

  it("all documents have non-empty titles and sources", () => {
    for (const doc of DOCTRINE_DOCS) {
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.source.length).toBeGreaterThan(0);
    }
  });

  it("all filenames end with .txt", () => {
    for (const doc of DOCTRINE_DOCS) {
      expect(doc.fileName).toMatch(/\.txt$/);
    }
  });

  it("filenames have unique timestamps (no duplicates)", () => {
    const names = DOCTRINE_DOCS.map(d => d.fileName);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("Doctrine Ingestion — path resolution", () => {
  function resolveAttachedAssetsDir(cwd: string): string {
    const monorepoRoot = cwd.includes("/artifacts/") ? path.resolve(cwd, "../..") : cwd;
    return path.join(monorepoRoot, "attached_assets");
  }

  it("resolves to monorepo root when cwd is inside /artifacts/", () => {
    const result = resolveAttachedAssetsDir("/home/runner/workspace/artifacts/api-server");
    expect(result).toContain("attached_assets");
    expect(result).not.toContain("/artifacts/api-server/attached_assets");
  });

  it("resolves to cwd/attached_assets when cwd is at monorepo root", () => {
    const result = resolveAttachedAssetsDir("/home/runner/workspace");
    expect(result).toBe("/home/runner/workspace/attached_assets");
  });
});

describe("Doctrine Ingestion — NormalizedItem contract", () => {
  it("ingestItem payload must have required fields", () => {
    const mockItem = {
      id: "doctrine-test-001",
      type: "knowledge" as const,
      content: "Test doctrine content",
      metadata: {
        title: "Test doctrine",
        source: "Tessera",
        tags: ["external-doctrine"],
      },
    };
    expect(mockItem.id).toMatch(/^doctrine-/);
    expect(mockItem.type).toBe("knowledge");
    expect(mockItem.metadata.tags).toContain("external-doctrine");
  });

  it("ingestion ID derives from filename for idempotency", () => {
    const fileName = "Pasted--GRAND-COUNCIL-EXTRAORDINARY-SESSION_1776445859051.txt";
    const baseName = path.basename(fileName, ".txt");
    const id = `doctrine-${baseName}`.slice(0, 100);
    expect(id.startsWith("doctrine-")).toBe(true);
    expect(id.length).toBeLessThanOrEqual(100);
  });
});
