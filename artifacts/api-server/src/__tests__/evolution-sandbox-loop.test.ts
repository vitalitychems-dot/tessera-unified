import { describe, it, expect, beforeEach, afterAll, beforeAll } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { applyVerifiedPatch } from "../lib/self-code-evolution";
import { verifyPatchInSandbox } from "../lib/evolution-sandbox";
import type { SandboxFn, SandboxResult } from "../lib/evolution-sandbox";
import {
  recordAttempt,
  getRecentAttempts,
  getAttemptsByProposal,
  _clearLedgerForTests,
} from "../lib/evolution-attempt-ledger";

const TMP_DIRS: string[] = [];
const LEDGER_TMP = mkdtempSync(join(tmpdir(), "evo-ledger-"));
TMP_DIRS.push(LEDGER_TMP);

function makeTempFile(name: string, contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), "evo-target-"));
  TMP_DIRS.push(dir);
  const file = join(dir, name);
  writeFileSync(file, contents, "utf8");
  return file;
}

const passingStubSandbox: SandboxFn = async () => ({
  ok: true,
  durationMs: 7,
  stage: "passed",
  diagnostics: [],
  diagnosticsCount: 0,
  exitCode: 0,
  output: { typecheck: "stub: passed", tests: "stub: 1 passed" },
});

const failingStubSandbox: (stage: SandboxResult["stage"], reason: string, exitCode: number) => SandboxFn =
  (stage, reason, exitCode) => async () => ({
    ok: false,
    durationMs: 11,
    stage,
    diagnostics: [reason, "additional context"],
    diagnosticsCount: 2,
    exitCode,
    output: { typecheck: `STDERR: ${reason}\nSTDOUT: failure detail` },
  });

/**
 * Real-runner sandbox factory: invokes verifyPatchInSandbox with the actual
 * subprocess pipeline (no git, no monorepo snapshot — uses the lightweight
 * verifyCommand path which writes the patched content to a temp file and
 * runs `node --check` against it as a real subprocess).
 *
 * `node --check` exits 0 on valid JS, non-zero on syntax errors — a faithful
 * lightweight equivalent of typecheck for the integration test fixture.
 */
const realRunnerSandbox: SandboxFn = (params) =>
  verifyPatchInSandbox({
    targetFilePath: params.targetFilePath,
    patchedContent: params.patchedContent,
    runTests: false,
    verifyCommand: [
      { cmd: "node", args: ["--check", "__SANDBOX_TARGET__"], stageLabel: "typecheck" },
    ],
  });

beforeAll(() => {
  process.env["EVO_LEDGER_DIR"] = LEDGER_TMP;
});

afterAll(() => {
  delete process.env["EVO_LEDGER_DIR"];
  for (const d of TMP_DIRS) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

describe("evolution apply pipeline — stub-sandbox unit coverage of applyVerifiedPatch", () => {
  beforeEach(() => { _clearLedgerForTests(); });

  it("rejects a bad patch without modifying the live file (byte-identical)", async () => {
    const original = "export const safe = 1;\n";
    const file = makeTempFile("target.ts", original);
    const patched = original + "\nexport const newThing = function( {{ broken !!!\n";
    const originalBytes = readFileSync(file);

    const result = await applyVerifiedPatch({
      sourceFilePath: file,
      originalContent: original,
      patchedContent: patched,
      proposalId: "evo-stub-bad",
      targetModule: "demo-target",
      sandboxFn: failingStubSandbox("typecheck", "error TS1005: '}' expected", 2),
    });

    expect(result.ok).toBe(false);
    expect(readFileSync(file).equals(originalBytes)).toBe(true);

    const entries = getAttemptsByProposal("evo-stub-bad");
    expect(entries.map(a => a.event)).toEqual(["SANDBOXED_FAIL"]);
    expect(entries[0]!.verifyExitCode).toBe(2);
    expect(entries[0]!.verifyOutput).toContain("error TS1005");
  });

  it("applies a good patch and records APPLIED only after live write", async () => {
    const original = "export const a = 1;\n";
    const file = makeTempFile("target.ts", original);
    const patched = original + "\nexport const b = 2;\n";

    const result = await applyVerifiedPatch({
      sourceFilePath: file,
      originalContent: original,
      patchedContent: patched,
      proposalId: "evo-stub-good",
      targetModule: "demo-target",
      sandboxFn: passingStubSandbox,
    });

    expect(result.ok).toBe(true);
    expect(readFileSync(file, "utf8")).toBe(patched);

    const entries = getAttemptsByProposal("evo-stub-good");
    expect(entries.map(a => a.event)).toEqual(["SANDBOXED_PASS", "APPLIED"]);
    expect(entries[0]!.verifyExitCode).toBe(0);
    expect(entries[1]!.reason).toMatch(/^\+\d+ lines appended$/);
  });

  it("ledger is append-only across getRecentAttempts calls", () => {
    recordAttempt({ proposalId: "evo-x", event: "PROPOSED", targetModule: "m1" });
    recordAttempt({ proposalId: "evo-x", event: "SANDBOXED_PASS", targetModule: "m1", durationMs: 5, verifyExitCode: 0 });
    recordAttempt({ proposalId: "evo-x", event: "APPLIED", targetModule: "m1", reason: "+1 lines appended" });
    expect(getRecentAttempts(100).filter(e => e.proposalId === "evo-x").length).toBe(3);
    expect(getRecentAttempts(100).filter(e => e.proposalId === "evo-x").length).toBe(3);
  });
});

describe("evolution sandbox runner — TRUE end-to-end through verifyPatchInSandbox + applyVerifiedPatch (no git)", () => {
  beforeEach(() => { _clearLedgerForTests(); });

  it("BAD patch: real subprocess `node --check` rejects, live file byte-identical, ledger SANDBOXED_FAIL with non-zero exit", async () => {
    const original = "module.exports.a = 1;\n";
    const file = makeTempFile("real-bad.js", original);
    const liveBefore = readFileSync(file);
    const broken = original + "module.exports.broken = (((;\n"; // syntax error

    const result = await applyVerifiedPatch({
      sourceFilePath: file,
      originalContent: original,
      patchedContent: broken,
      proposalId: "evo-real-bad",
      targetModule: "real-bad.js",
      sandboxFn: realRunnerSandbox,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();

    // INVARIANT: live file is byte-identical
    expect(readFileSync(file).equals(liveBefore)).toBe(true);

    const entries = getAttemptsByProposal("evo-real-bad");
    expect(entries.map(a => a.event)).toEqual(["SANDBOXED_FAIL"]);
    const fail = entries[0]!;
    expect(fail.verifyExitCode).toBeDefined();
    expect(fail.verifyExitCode).not.toBe(0);
    expect(fail.verifyOutput).toBeDefined();
    expect(fail.verifyOutput!.length).toBeGreaterThan(0);
    expect(fail.reason).toContain("sandbox.typecheck");
  }, 60_000);

  it("GOOD patch: real subprocess `node --check` passes, live file updated, ledger SANDBOXED_PASS → APPLIED with exit 0", async () => {
    const original = "module.exports.a = 1;\n";
    const file = makeTempFile("real-good.js", original);
    const patched = original + "module.exports.b = 2;\n";

    const result = await applyVerifiedPatch({
      sourceFilePath: file,
      originalContent: original,
      patchedContent: patched,
      proposalId: "evo-real-good",
      targetModule: "real-good.js",
      sandboxFn: realRunnerSandbox,
    });

    expect(result.ok).toBe(true);
    expect(result.patchedLines).toBeGreaterThan(0);

    // INVARIANT: live file equals patched content exactly
    expect(readFileSync(file, "utf8")).toBe(patched);

    const entries = getAttemptsByProposal("evo-real-good");
    expect(entries.map(a => a.event)).toEqual(["SANDBOXED_PASS", "APPLIED"]);

    const pass = entries[0]!;
    expect(pass.verifyExitCode).toBe(0);
    expect(pass.verifyOutput).toBeDefined();
    expect(pass.verifyOutput).toContain("node --check");
    expect(pass.verifyOutput).toContain("exit=0");

    const applied = entries[1]!;
    expect(applied.reason).toMatch(/^\+\d+ lines appended$/);
    expect(typeof applied.durationMs).toBe("number");
  }, 60_000);
});

describe("evolution attempt ledger — durability flag", () => {
  beforeEach(() => { _clearLedgerForTests(); });

  it("marks recorded entries with persisted=true when JSONL append succeeds", () => {
    const e = recordAttempt({ proposalId: "evo-persisted", event: "PROPOSED", targetModule: "m" });
    expect(e.persisted).toBe(true);
  });
});

describe("/api/evolution-health/attempts — auth regression", () => {
  it("rejects unauthenticated requests and accepts admin-token requests", async () => {
    // Lazy-load express + the route (avoids server bootstrap)
    const express = (await import("express")).default;
    const router = (await import("../routes/evolution-health")).default;
    const app = express();
    app.use("/api", router);

    const prevToken = process.env["ADMIN_TOKEN"];
    process.env["ADMIN_TOKEN"] = "test-admin-token-xyz";

    try {
      const server = app.listen(0);
      try {
        const port = (server.address() as { port: number }).port;
        const noAuth = await fetch(`http://127.0.0.1:${port}/api/evolution-health/attempts`);
        expect(noAuth.status).toBe(401);

        const withAuth = await fetch(`http://127.0.0.1:${port}/api/evolution-health/attempts`, {
          headers: { "x-admin-token": "test-admin-token-xyz" },
        });
        expect(withAuth.status).toBe(200);
        const body = await withAuth.json() as { ok: boolean; data: { attempts: unknown[]; counts: Record<string, number>; total: number } };
        expect(body.ok).toBe(true);
        expect(Array.isArray(body.data.attempts)).toBe(true);
        expect(typeof body.data.counts).toBe("object");
        expect(typeof body.data.total).toBe("number");
      } finally {
        await new Promise<void>((res) => server.close(() => res()));
      }
    } finally {
      if (prevToken === undefined) delete process.env["ADMIN_TOKEN"];
      else process.env["ADMIN_TOKEN"] = prevToken;
    }
  });
});

// CI-only: exercises the FULL production sandbox path (cpSync-based monorepo
// snapshot + real `pnpm typecheck`). Skipped by default because it can take
// 60+ seconds. Enable by setting RUN_PRODUCTION_SANDBOX_TESTS=1.
describe.skipIf(!process.env["RUN_PRODUCTION_SANDBOX_TESTS"])("production sandbox path (CI-gated)", () => {
  it("runs the default pnpm typecheck pipeline end-to-end and returns a structured result", async () => {
    const original = "module.exports.a = 1;\n";
    const file = makeTempFile("ci-prod.js", original);
    const result = await verifyPatchInSandbox({
      targetFilePath: file,
      patchedContent: original,
      packageFilter: "@workspace/api-server",
      runTests: false,
    });
    expect(result).toHaveProperty("ok");
    expect(["init", "snapshot", "patch-write", "typecheck", "tests", "passed"]).toContain(result.stage);
    expect(typeof result.durationMs).toBe("number");
  }, 240_000);
});

void existsSync;
