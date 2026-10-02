#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(label, args, env) {
  return new Promise((resolve) => {
    console.log(`\n[build] ${label}`);
    const child = spawn(packageManager, args, { cwd: root, env, stdio: "inherit" });
    child.once("error", (error) => {
      console.error(`[build] ${label} could not start: ${error.message}`);
      resolve(1);
    });
    child.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

const typecheck = await run("workspace typecheck", ["run", "typecheck"], { ...process.env });
if (typecheck !== 0) {
  process.exitCode = typecheck;
} else {
  const buildEnv = { ...process.env, PORT: process.env.WORKSPACE_BUILD_PORT || "3000", BASE_PATH: process.env.WORKSPACE_BUILD_BASE_PATH || "/" };
  // Builds must not inherit app database or personal chart values. Database
  // migrations are separate explicit commands and are never run by this script.
  for (const key of ["DATABASE_URL", "FATHER_NATAL_CHART_JSON", "TESSERA_TEST_DATABASE_URL", "TESSERA_TEST_FATHER_NATAL_CHART_JSON"]) {
    delete buildEnv[key];
  }
  const build = await run(
    "all workspace packages",
    ["-r", "--if-present", "run", "build"],
    buildEnv,
  );
  if (build !== 0) process.exitCode = build;
}
