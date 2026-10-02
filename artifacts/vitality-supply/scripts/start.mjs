#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rawPort = process.env.PORT;
const port = Number(rawPort);
if (!rawPort || !Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error("[start] PORT must be a valid TCP port (1-65535).");
  process.exit(1);
}

const server = spawn(process.execPath, [join(root, ".output", "server", "index.mjs")], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

/**
 * Background schedulers run as sibling processes so audits and content
 * publishing continue without any request traffic. Each is fenced in the
 * database, and if either dies the whole service restarts.
 */
const tsx = join(root, "node_modules", ".bin", "tsx");
const schedulers = [
  { name: "manager scheduler", script: "manager-scheduler.ts" },
  { name: "content scheduler", script: "content-scheduler.ts" },
  { name: "email scheduler", script: "email-scheduler.ts" },
].map(({ name, script }) => ({
  name,
  child: spawn(tsx, [join(root, "scripts", script)], { cwd: root, env: process.env, stdio: "inherit" }),
}));

let shuttingDown = false;
const stop = (signal) => {
  shuttingDown = true;
  server.kill(signal);
  for (const { child } of schedulers) child.kill(signal);
};
process.once("SIGTERM", () => stop("SIGTERM"));
process.once("SIGINT", () => stop("SIGINT"));
server.once("exit", (code, signal) => {
  shuttingDown = true;
  for (const { child } of schedulers) child.kill("SIGTERM");
  process.exit(code ?? (signal ? 1 : 0));
});
for (const { name, child } of schedulers) {
  child.once("error", (error) => {
    if (shuttingDown) return;
    console.error(`[start] ${name} failed to spawn:`, error?.message || "unknown error");
    stop("SIGTERM");
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[start] ${name} exited (${code ?? signal ?? "unknown"}); stopping server.`);
    stop("SIGTERM");
    process.exitCode = 1;
  });
}
