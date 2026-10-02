/**
 * Long-lived content-engine scheduler. Spawned by scripts/start.mjs next to
 * the manager scheduler; polls every minute and runs when a manual run is
 * queued or the two-hour cadence is due. Runs are fenced in the database, so a
 * second instance is harmless.
 *
 *   tsx scripts/content-scheduler.ts          # long-lived loop
 *   tsx scripts/content-scheduler.ts --once   # force one run now, then exit
 */
import { runContentEngine } from "../src/lib/content/engine.server";

const POLL_MS = 60 * 1000;
const once = process.argv.includes("--once");

async function tick(mode: "due" | "force") {
  try {
    const summary = await runContentEngine(mode);
    if (!summary.skipped) console.log("[content-scheduler] run:", JSON.stringify(summary));
  } catch (error) {
    console.error("[content-scheduler] tick failed:", error instanceof Error ? error.message : "unknown error");
  }
}

let stopping = false;
let waitTimer: NodeJS.Timeout | undefined;

async function main() {
  if (once) {
    await tick("force");
    return;
  }
  await tick("due");
  while (!stopping) {
    await new Promise<void>((resolve) => {
      waitTimer = setTimeout(resolve, POLL_MS);
    });
    waitTimer = undefined;
    if (!stopping) await tick("due");
  }
}

function stop() {
  stopping = true;
  if (waitTimer) clearTimeout(waitTimer);
}
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
void main()
  .then(() => {
    if (once) process.exit(0);
  })
  .catch((error) => {
    console.error("[content-scheduler] fatal:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  });
