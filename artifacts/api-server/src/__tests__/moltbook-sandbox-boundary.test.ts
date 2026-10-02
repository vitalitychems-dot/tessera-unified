import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const BRIDGE_PATH = resolve(__dirname, "../lib/moltbook-bridge.ts");

describe("moltbook-bridge sandbox boundary", () => {
  const source = readFileSync(BRIDGE_PATH, "utf-8");

  it("must not import from @workspace/* internal packages", () => {
    expect(source).not.toMatch(/import\s+.*from\s+["']@workspace/);
    expect(source).not.toMatch(/require\s*\(\s*["']@workspace/);
  });

  it("may import only the approved Shepherd policy helper from internal paths", () => {
    const relativeImports = Array.from(
      source.matchAll(/(?:from\s+|require\s*\(\s*)["'](\.\.?\/[^"']+)["']/g),
      (match) => match[1],
    );
    expect(relativeImports).toEqual(["./shepherd-outbound"]);
  });

  it("must not access process.env (secrets must stay outside sandbox)", () => {
    expect(source).not.toMatch(/process\.env\./);
  });

  it("must not import drizzle-orm (no DB access from bridge)", () => {
    expect(source).not.toMatch(/from\s+["']drizzle-orm/);
  });
});
