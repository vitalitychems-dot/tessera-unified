#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertUniqueServicePorts, isLoopbackPostgresUrl } from "./suite-policy.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const envFile = join(root, ".env.local");
try {
  process.loadEnvFile(envFile);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const port = (name, fallback) => {
  const value = process.env[name] ?? String(fallback);
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be a valid TCP port (1-65535)`);
  }
  return String(parsed);
};

const apiPort = port("TESSERA_API_PORT", 5000);
const services = [
  {
    label: "Tessera web",
    selector: "@workspace/tessera",
    port: port("TESSERA_WEB_PORT", 3000),
    env: {
      PORT: port("TESSERA_WEB_PORT", 3000),
      BASE_PATH: process.env.TESSERA_BASE_PATH || "/",
      VITE_API_URL: process.env.VITE_API_URL || `http://localhost:${apiPort}`,
    },
  },
  {
    label: "Vitality Supply",
    selector: "@workspace/vitality-supply",
    port: port("VITALITY_SUPPLY_PORT", 4173),
    databaseVariable: "VITALITY_SUPPLY_DATABASE_URL",
    env: {
      PORT: port("VITALITY_SUPPLY_PORT", 4173),
      BASE_PATH: process.env.VITALITY_SUPPLY_BASE_PATH || "/",
    },
  },
  {
    label: "Vitality Chems storefront",
    selector: "app-builder-workspace",
    port: port("VITALITY_STOREFRONT_PORT", 8080),
    databaseVariable: "VITALITY_STOREFRONT_DATABASE_URL",
    env: { PORT: port("VITALITY_STOREFRONT_PORT", 8080) },
  },
  {
    label: "UI preview sandbox",
    selector: "@workspace/mockup-sandbox",
    port: port("MOCKUP_SANDBOX_PORT", 5173),
    env: {
      PORT: port("MOCKUP_SANDBOX_PORT", 5173),
      BASE_PATH: process.env.MOCKUP_SANDBOX_BASE_PATH || "/",
    },
  },
];

const tesseraDatabaseUrl = process.env.DATABASE_URL?.trim();
if (tesseraDatabaseUrl && isLoopbackPostgresUrl(tesseraDatabaseUrl)) {
  services.unshift({
    label: "Tessera API",
    selector: "@workspace/api-server",
    port: apiPort,
    env: { PORT: apiPort },
    databaseUrl: tesseraDatabaseUrl,
  });
} else {
  console.warn(tesseraDatabaseUrl
    ? "[suite] Tessera API is skipped: the unified runner only auto-connects to a local DATABASE_URL."
    : "[suite] Tessera API is skipped: set a local DATABASE_URL in the ignored .env.local to enable it.");
}

assertUniqueServicePorts(services);

const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const children = new Map();
let stopping = false;
let exitCode = 0;

console.log("\nTessera Unified suite\n");
for (const service of services) {
  console.log(`  ${service.label.padEnd(28)} http://localhost:${service.port}`);
}
console.log("\nUse Ctrl+C to stop all services.\n");

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  exitCode = code;
  for (const child of children.keys()) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  }
  const timer = setTimeout(() => {
    for (const child of children.keys()) {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
  }, 5000);
  timer.unref();
}

process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));

for (const service of services) {
  if (stopping) break;
  const childEnv = { ...process.env, ...service.env };
  delete childEnv.TESSERA_TEST_DATABASE_URL;
  delete childEnv.TESSERA_TEST_FATHER_NATAL_CHART_JSON;
  if (service.selector !== "@workspace/api-server") {
    delete childEnv.FATHER_NATAL_CHART_JSON;
  }
  delete childEnv.DATABASE_URL;
  if (service.databaseUrl) childEnv.DATABASE_URL = service.databaseUrl;
  if (service.databaseVariable) {
    const appDatabaseUrl = process.env[service.databaseVariable]?.trim();
    if (appDatabaseUrl && isLoopbackPostgresUrl(appDatabaseUrl)) {
      childEnv.DATABASE_URL = appDatabaseUrl;
    } else if (appDatabaseUrl) {
      console.warn(`[suite] ${service.label} will use its isolated local data store; its configured database is not loopback.`);
    }
  }
  const child = spawn(
    packageManager,
    ["--filter", service.selector, "run", "dev"],
    { cwd: root, env: childEnv, stdio: "inherit" },
  );
  children.set(child, service);
  child.once("error", (error) => {
    console.error(`[suite] ${service.label} failed to start: ${error.message}`);
    stop(1);
  });
  child.once("exit", (code, signal) => {
    if (!stopping) {
      console.error(
        `[suite] ${service.label} exited (${code ?? signal ?? "unknown"}); stopping the suite.`,
      );
      stop(code && code > 0 ? code : 1);
    }
  });
}

process.on("exit", () => {
  process.exitCode = exitCode;
});
