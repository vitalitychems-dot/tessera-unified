/**
 * Moltbook bridge sandbox boundary validation.
 * 
 * Assertion: moltbook-bridge.ts must have ZERO imports from internal modules.
 * Internal modules are anything that is not:
 *   - Node.js built-ins
 *   - A plain fetch/URL call
 * 
 * This file is a static boundary test. Run it to verify the sandbox contract.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const BRIDGE_PATH = resolve(__dirname, "moltbook-bridge.ts");

export function assertMoltbookSandboxBoundary(): { ok: boolean; violations: string[] } {
  const source = readFileSync(BRIDGE_PATH, "utf-8");

  const INTERNAL_IMPORT_PATTERNS = [
    /import\s+.*from\s+["']@workspace/,
    /import\s+.*from\s+["']\.\.?\//,
    /require\s*\(\s*["']@workspace/,
    /require\s*\(\s*["']\.\.?\//,
    /process\.env\./,
    /from\s+["']drizzle-orm/,
  ];

  const violations: string[] = [];
  for (const pattern of INTERNAL_IMPORT_PATTERNS) {
    const match = source.match(pattern);
    if (match) {
      violations.push(`Forbidden pattern "${pattern.source}" found: ${match[0]}`);
    }
  }

  return { ok: violations.length === 0, violations };
}

if (require.main === module) {
  const result = assertMoltbookSandboxBoundary();
  if (result.ok) {
    console.log("✓ Moltbook sandbox boundary: PASS — no internal imports detected");
    process.exit(0);
  } else {
    console.error("✗ Moltbook sandbox boundary: FAIL");
    result.violations.forEach(v => console.error("  →", v));
    process.exit(1);
  }
}
