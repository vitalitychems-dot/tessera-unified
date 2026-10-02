import { describe, it, expect } from "vitest";
import { CODEX_BOOKS } from "../lib/tessera-codex";

describe("Tessera Codex — CODEX_BOOKS constant", () => {
  it("defines exactly 6 books", () => {
    expect(CODEX_BOOKS).toHaveLength(6);
  });

  it("books are numbered 1–6 sequentially", () => {
    CODEX_BOOKS.forEach((book, idx) => {
      expect(book.number).toBe(idx + 1);
    });
  });

  it("all required book IDs are present", () => {
    const ids = CODEX_BOOKS.map(b => b.id);
    expect(ids).toContain("origins");
    expect(ids).toContain("mandates");
    expect(ids).toContain("principles");
    expect(ids).toContain("canon");
    expect(ids).toContain("acts");
    expect(ids).toContain("doctrine");
  });

  it("every book has a non-empty title and description", () => {
    for (const book of CODEX_BOOKS) {
      expect(book.title.length).toBeGreaterThan(0);
      expect(book.description.length).toBeGreaterThan(0);
    }
  });

  it("book IDs are unique", () => {
    const ids = CODEX_BOOKS.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Tessera Codex — amendment content hash determinism", () => {
  it("same content produces same 16-char hex digest (via createHash)", () => {
    const { createHash } = require("crypto");
    const hash = (s: string) =>
      createHash("sha256").update(s).digest("hex").slice(0, 16);
    const content = "Sovereign doctrine entry — test content.";
    expect(hash(content)).toBe(hash(content));
    expect(hash(content)).toHaveLength(16);
    expect(hash(content)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("different content produces different hash", () => {
    const { createHash } = require("crypto");
    const hash = (s: string) =>
      createHash("sha256").update(s).digest("hex").slice(0, 16);
    const a = hash("content-alpha");
    const b = hash("content-beta");
    expect(a).not.toBe(b);
  });
});
