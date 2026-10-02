import { spawn } from "child_process";
import { mkdtempSync, writeFileSync, existsSync, rmSync, mkdirSync, symlinkSync, cpSync, readdirSync, statSync } from "fs";
import { tmpdir } from "os";
import { join, resolve, relative, dirname, basename } from "path";
import { logger } from "./logger";

const TIMEOUT_TYPECHECK_MS = 90_000;
const TIMEOUT_TESTS_MS = 120_000;

const MAX_OUTPUT_BYTES = 200_000;
const MAX_DIAGNOSTIC_LINES = 12;

const HEAVY_DIRS = new Set([
  ".git",
  "node_modules",
  "_evolutions",
  ".cache",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".local",
  "attached_assets",
]);

export interface SandboxResult {
  ok: boolean;
  durationMs: number;
  stage: "init" | "snapshot" | "patch-write" | "typecheck" | "tests" | "passed";
  diagnostics: string[];
  diagnosticsCount: number;
  exitCode?: number;
  output?: { typecheck?: string; tests?: string };
}

interface CmdResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
}

function runCmd(cwd: string, cmd: string, args: string[], timeoutMs: number, env?: NodeJS.ProcessEnv): Promise<CmdResult> {
  return new Promise(resolveP => {
    const start = Date.now();
    const proc = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env, CI: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { proc.kill("SIGKILL"); } catch { /* ignore */ }
    }, timeoutMs);
    proc.stdout?.on("data", d => {
      stdout += d.toString();
      if (stdout.length > MAX_OUTPUT_BYTES) stdout = stdout.slice(-MAX_OUTPUT_BYTES);
    });
    proc.stderr?.on("data", d => {
      stderr += d.toString();
      if (stderr.length > MAX_OUTPUT_BYTES) stderr = stderr.slice(-MAX_OUTPUT_BYTES);
    });
    proc.on("close", code => {
      clearTimeout(timer);
      resolveP({ exitCode: code ?? -1, stdout, stderr, timedOut, durationMs: Date.now() - start });
    });
    proc.on("error", err => {
      clearTimeout(timer);
      resolveP({
        exitCode: -1,
        stdout,
        stderr: stderr + "\n" + (err instanceof Error ? err.message : String(err)),
        timedOut: false,
        durationMs: Date.now() - start,
      });
    });
  });
}

function findMonorepoRoot(start: string): string | null {
  let dir = resolve(start);
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function ensureSymlink(srcAbs: string, dstAbs: string): void {
  if (!existsSync(srcAbs)) return;
  if (existsSync(dstAbs)) return;
  mkdirSync(dirname(dstAbs), { recursive: true });
  try {
    symlinkSync(srcAbs, dstAbs, "dir");
  } catch (err) {
    logger.warn({ srcAbs, dstAbs, err }, "EvolutionSandbox: symlink failed (continuing)");
  }
}

/**
 * Snapshot the monorepo tree into `sandboxDir` without using `.git` writes.
 *
 * Strategy: for each top-level entry, we either symlink it (cheap, for
 * directories that the sandbox will only READ) or copy it (when the entry
 * itself contains the patched file path). Heavy dirs (.git, node_modules,
 * _evolutions, build outputs) are skipped — node_modules is symlinked
 * separately so dependency resolution works without re-installing.
 *
 * The patched file's package directory tree is COPIED (not symlinked) so we
 * can overlay just that one file with the patched content without touching
 * the live source.
 */
function snapshotMonorepo(monorepoRoot: string, sandboxDir: string, patchedRelPath: string): void {
  const patchedPkgRoot = patchedRelPath.split("/")[0]!; // first segment, e.g. "artifacts"
  const patchedPkgSubdir = patchedRelPath.split("/").slice(0, 2).join("/"); // e.g. "artifacts/api-server"

  for (const entry of readdirSync(monorepoRoot)) {
    if (HEAVY_DIRS.has(entry)) continue;
    const srcAbs = join(monorepoRoot, entry);
    const dstAbs = join(sandboxDir, entry);
    let st;
    try { st = statSync(srcAbs); } catch { continue; }

    if (entry === patchedPkgRoot && st.isDirectory()) {
      // Selectively snapshot: symlink everything inside except the patched package's subdir,
      // which we copy so we can overlay just the patched file.
      mkdirSync(dstAbs, { recursive: true });
      for (const sub of readdirSync(srcAbs)) {
        if (HEAVY_DIRS.has(sub)) continue;
        const subSrc = join(srcAbs, sub);
        const subDst = join(dstAbs, sub);
        const subRel = `${entry}/${sub}`;
        if (subRel === patchedPkgSubdir) {
          // Copy this package, excluding its own heavy dirs
          cpSync(subSrc, subDst, {
            recursive: true,
            dereference: false,
            filter: (s) => {
              const name = basename(s);
              if (HEAVY_DIRS.has(name)) return false;
              return true;
            },
          });
        } else {
          ensureSymlink(subSrc, subDst);
        }
      }
    } else if (st.isDirectory()) {
      ensureSymlink(srcAbs, dstAbs);
    } else {
      // Top-level file: copy (cheap)
      cpSync(srcAbs, dstAbs);
    }
  }
}

/**
 * Verify a proposed patch by snapshotting the monorepo into a disposable
 * temp dir (NO git mutations), symlinking node_modules, writing the patched
 * file at the same relative path, running verification commands as
 * subprocesses with hard timeouts, then always cleaning up.
 *
 * The live source file is NEVER touched by this function.
 *
 * Recursion guard: the spawned child inherits EVO_SANDBOX_NESTED=1, so any
 * nested call returns a fast no-op pass — preventing fork bombs.
 *
 * `verifyCommand` (optional): when provided, runs those commands instead of
 * the default `pnpm --filter <pkg> typecheck` + `... test` pipeline. Used by
 * lightweight verifiers and integration tests. In `verifyCommand` mode the
 * runner uses a MINIMAL temp dir holding only the patched file at its
 * basename (no monorepo snapshot), since the verifier operates on that
 * single file — keeping tests fast and dependency-free.
 */
export async function verifyPatchInSandbox(params: {
  targetFilePath: string;
  patchedContent: string;
  packageFilter?: string;
  runTests?: boolean;
  verifyCommand?: Array<{ cmd: string; args: string[]; timeoutMs?: number; stageLabel?: SandboxResult["stage"] }>;
}): Promise<SandboxResult> {
  const start = Date.now();

  if (process.env["EVO_SANDBOX_NESTED"] === "1") {
    return {
      ok: true,
      durationMs: 0,
      stage: "passed",
      diagnostics: ["nested sandbox call — fast-passed to prevent recursion"],
      diagnosticsCount: 0,
      exitCode: 0,
    };
  }

  // ─── Lightweight path: verifyCommand mode (no monorepo snapshot needed) ───
  if (params.verifyCommand && params.verifyCommand.length > 0) {
    const sandboxDir = mkdtempSync(join(tmpdir(), "evo-sb-light-"));
    try {
      const fileName = basename(params.targetFilePath);
      const sandboxTarget = join(sandboxDir, fileName);
      writeFileSync(sandboxTarget, params.patchedContent, "utf8");

      const collectedOutput: string[] = [];
      let stage: SandboxResult["stage"] = "typecheck";
      for (const step of params.verifyCommand) {
        stage = step.stageLabel ?? "typecheck";
        // Replace any `__SANDBOX_TARGET__` placeholder with the sandboxed file path
        const args = step.args.map(a => a === "__SANDBOX_TARGET__" ? sandboxTarget : a);
        const r = await runCmd(sandboxDir, step.cmd, args, step.timeoutMs ?? TIMEOUT_TYPECHECK_MS, { EVO_SANDBOX_NESTED: "1" });
        const out = (r.stderr + "\n" + r.stdout).slice(-2000);
        collectedOutput.push(`$ ${step.cmd} ${args.join(" ")}\nexit=${r.exitCode}\n${out}`);
        if (r.timedOut || r.exitCode !== 0) {
          return {
            ok: false,
            durationMs: Date.now() - start,
            stage,
            diagnostics: [
              r.timedOut ? `${step.cmd} timed out` : `${step.cmd} exit ${r.exitCode}`,
              ...out.split("\n").slice(0, MAX_DIAGNOSTIC_LINES),
            ],
            diagnosticsCount: 1,
            exitCode: r.exitCode,
            output: { typecheck: collectedOutput.join("\n---\n") },
          };
        }
      }
      return {
        ok: true,
        durationMs: Date.now() - start,
        stage: "passed",
        diagnostics: [],
        diagnosticsCount: 0,
        exitCode: 0,
        output: { typecheck: collectedOutput.join("\n---\n") },
      };
    } finally {
      try { if (existsSync(sandboxDir)) rmSync(sandboxDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }

  // ─── Production path: full monorepo snapshot (no git) ───
  const pkgFilter = params.packageFilter ?? "@workspace/api-server";
  const runTests = params.runTests !== false;

  const monorepoRoot = findMonorepoRoot(process.cwd());
  if (!monorepoRoot) {
    return {
      ok: false,
      durationMs: Date.now() - start,
      stage: "init",
      diagnostics: ["sandbox: cannot locate monorepo root (no pnpm-workspace.yaml found above cwd)"],
      diagnosticsCount: 1,
    };
  }

  const sandboxParent = join(monorepoRoot, "_evolutions", "sandboxes");
  if (!existsSync(sandboxParent)) mkdirSync(sandboxParent, { recursive: true });
  const sandboxDir = mkdtempSync(join(sandboxParent, "sb-"));

  let stage: SandboxResult["stage"] = "snapshot";

  try {
    const absTarget = resolve(params.targetFilePath);
    const relTarget = relative(monorepoRoot, absTarget);
    if (relTarget.startsWith("..") || relTarget.includes("..")) {
      return {
        ok: false,
        durationMs: Date.now() - start,
        stage: "patch-write",
        diagnostics: [`patch-write: target outside monorepo (${absTarget})`],
        diagnosticsCount: 1,
      };
    }

    // 1. Snapshot monorepo via copy + symlinks (no git)
    snapshotMonorepo(monorepoRoot, sandboxDir, relTarget);

    // 2. Symlink node_modules so resolution works without re-installing
    const symlinks = [
      "node_modules",
      "artifacts/api-server/node_modules",
      "lib/db/node_modules",
      "lib/api-zod/node_modules",
    ];
    for (const rel of symlinks) {
      ensureSymlink(join(monorepoRoot, rel), join(sandboxDir, rel));
    }

    // 3. Overlay the patched file
    stage = "patch-write";
    const sandboxTarget = join(sandboxDir, relTarget);
    mkdirSync(dirname(sandboxTarget), { recursive: true });
    writeFileSync(sandboxTarget, params.patchedContent, "utf8");

    // 4. Typecheck
    stage = "typecheck";
    const tc = await runCmd(sandboxDir, "pnpm", ["--filter", pkgFilter, "typecheck"], TIMEOUT_TYPECHECK_MS, { EVO_SANDBOX_NESTED: "1" });
    const tcOutput = (tc.stderr + "\n" + tc.stdout).slice(-4000);
    if (tc.timedOut || tc.exitCode !== 0) {
      const errorLines = tcOutput.split("\n").filter(l => /error TS\d+/.test(l) || /ELIFECYCLE/.test(l)).slice(0, MAX_DIAGNOSTIC_LINES);
      return {
        ok: false,
        durationMs: Date.now() - start,
        stage: "typecheck",
        diagnostics: [tc.timedOut ? `typecheck timed out after ${TIMEOUT_TYPECHECK_MS}ms` : `typecheck exit ${tc.exitCode}`, ...errorLines],
        diagnosticsCount: errorLines.length || 1,
        exitCode: tc.exitCode,
        output: { typecheck: tcOutput },
      };
    }

    // 5. Tests
    let ttOutput = "";
    if (runTests) {
      stage = "tests";
      const tt = await runCmd(sandboxDir, "pnpm", ["--filter", pkgFilter, "test"], TIMEOUT_TESTS_MS, { EVO_SANDBOX_NESTED: "1" });
      ttOutput = (tt.stderr + "\n" + tt.stdout).slice(-4000);
      if (tt.timedOut || tt.exitCode !== 0) {
        const failLines = ttOutput.split("\n").filter(l => /FAIL|×|✗|Error:|AssertionError|Expected|Tests\s+\d+\s+failed/.test(l)).slice(0, MAX_DIAGNOSTIC_LINES);
        return {
          ok: false,
          durationMs: Date.now() - start,
          stage: "tests",
          diagnostics: [tt.timedOut ? `tests timed out after ${TIMEOUT_TESTS_MS}ms` : `tests exit ${tt.exitCode}`, ...failLines],
          diagnosticsCount: failLines.length || 1,
          exitCode: tt.exitCode,
          output: { typecheck: tcOutput, tests: ttOutput },
        };
      }
    }

    return {
      ok: true,
      durationMs: Date.now() - start,
      stage: "passed",
      diagnostics: [],
      diagnosticsCount: 0,
      exitCode: 0,
      output: { typecheck: tcOutput, tests: ttOutput || undefined },
    };
  } catch (err) {
    return {
      ok: false,
      durationMs: Date.now() - start,
      stage,
      diagnostics: [`sandbox unexpected error at stage=${stage}: ${err instanceof Error ? err.message : String(err)}`],
      diagnosticsCount: 1,
    };
  } finally {
    try {
      if (existsSync(sandboxDir)) rmSync(sandboxDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

export type SandboxFn = (params: {
  targetFilePath: string;
  patchedContent: string;
}) => Promise<SandboxResult>;
