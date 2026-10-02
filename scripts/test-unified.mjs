#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isLoopbackPostgresUrl, samePostgresDatabase } from "./suite-policy.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function localTestValue(name) {
  if (process.env[name] !== undefined) return process.env[name];
  try {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = readFileSync(join(root, ".env.local"), "utf8").match(
      new RegExp(`^\\s*(?:export\\s+)?${escaped}\\s*=\\s*(.*)\\s*$`, "m"),
    );
    if (!match) return "";
    let value = match[1].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    return value;
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

function runWorkspaceTest(label, selector, env) {
  return new Promise((resolve) => {
    console.log(`\n[test] ${label}`);
    const child = spawn(
      packageManager,
      ["--filter", selector, "run", "test"],
      { cwd: root, env, stdio: "inherit" },
    );
    child.once("error", (error) => {
      console.error(`[test] ${label} could not start: ${error.message}`);
      resolve(1);
    });
    child.once("exit", (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });
  });
}

const isolatedEnv = { ...process.env };
delete isolatedEnv.DATABASE_URL;
delete isolatedEnv.FATHER_NATAL_CHART_JSON;
delete isolatedEnv.TESSERA_TEST_DATABASE_URL;
delete isolatedEnv.TESSERA_TEST_FATHER_NATAL_CHART_JSON;

let failures = 0;
for (const [label, selector] of [
  ["Suite safety policy", "@workspace/scripts"],
  ["Vitality Supply", "@workspace/vitality-supply"],
  ["Vitality Chems storefront", "app-builder-workspace"],
]) {
  failures += await runWorkspaceTest(label, selector, { ...isolatedEnv });
}

const testDatabaseUrl = localTestValue("TESSERA_TEST_DATABASE_URL").trim();
if (!testDatabaseUrl) {
  console.log(
    "\n[test] Tessera API integration tests skipped. Set TESSERA_TEST_DATABASE_URL to a dedicated local test database (not DATABASE_URL).",
  );
} else {
  if (!isLoopbackPostgresUrl(testDatabaseUrl)) {
    console.error(
      "[test] Refusing an invalid or non-loopback PostgreSQL URL; use an explicit local test database.",
    );
    process.exit(2);
  }
  const appDatabaseUrl = localTestValue("DATABASE_URL").trim();
  if (appDatabaseUrl && samePostgresDatabase(testDatabaseUrl, appDatabaseUrl)) {
    console.error("[test] Refusing to run API tests against the same database target configured for the app.");
    process.exit(2);
  }
  const apiEnv = {
    ...isolatedEnv,
    DATABASE_URL: testDatabaseUrl,
    ...(localTestValue("TESSERA_TEST_FATHER_NATAL_CHART_JSON")
      ? { FATHER_NATAL_CHART_JSON: localTestValue("TESSERA_TEST_FATHER_NATAL_CHART_JSON") }
      : {}),
  };
  failures += await runWorkspaceTest("Tessera API (local test database)", "@workspace/api-server", apiEnv);
}

if (failures > 0) {
  console.error(`\n[test] ${failures} workspace test command(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\n[test] Workspace test run completed.");
}
