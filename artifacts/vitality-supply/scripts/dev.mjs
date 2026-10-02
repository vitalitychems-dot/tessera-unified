#!/usr/bin/env node
import { readFile, readlink, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error("[dev] PORT must be a valid TCP port (1-65535).");
  process.exit(1);
}

const pidFile = `/tmp/vitality-supply-vite-${port}.pid`;
try {
  const previousPid = Number((await readFile(pidFile, "utf8")).trim());
  if (Number.isInteger(previousPid) && previousPid > 1) {
    const [command, cwd] = await Promise.all([
      readFile(`/proc/${previousPid}/cmdline`, "utf8").catch(() => ""),
      readlink(`/proc/${previousPid}/cwd`).catch(() => ""),
    ]);
    if (command.includes("vite") && (!cwd || cwd.includes("vitality-supply"))) {
      console.warn(`[dev] stopping stale Vite listener ${previousPid} before binding port ${port}`);
      process.kill(previousPid, "SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }
} catch {
  // Missing or stale pid files are normal.
}

const vite = spawn(
  "pnpm",
  ["exec", "vite", "--config", "vite.config.ts", "--host", "0.0.0.0", "--port", String(port), "--strictPort"],
  { cwd: root, env: process.env, stdio: "inherit" },
);
await writeFile(pidFile, String(vite.pid));

let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  vite.kill(signal);
}
process.once("SIGTERM", () => stop("SIGTERM"));
process.once("SIGINT", () => stop("SIGINT"));
vite.once("error", async (error) => {
  console.error("[dev] unable to start Vite:", error.message);
  await rm(pidFile, { force: true });
  process.exit(1);
});
vite.once("exit", async (code, signal) => {
  await rm(pidFile, { force: true });
  process.exit(code ?? (signal ? 1 : 0));
});