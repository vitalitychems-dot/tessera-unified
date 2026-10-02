import { generatePulse, setAutonomousMode, getHeartbeatMetrics, getHeartbeatStatus, getMemoryDiagnostics } from "./autonomous-heartbeat";
import { runDriftDetection } from "./sovereign-identity-reinforcement";
import { generateReflection } from "./consciousness-engine";
import { runImprovementCycle } from "./auto-improvement-daemon";
import { sweepAndExecute } from "./council-executor";
import { triggerTrainingCycle } from "./agi-training-engine";
import { getSystemLoad } from "./evolution-throttle";
import { registerTask, startScheduler, stopScheduler, getSchedulerMetrics, registerProcessMonitor } from "./task-scheduler";

const HEARTBEAT_MS = 30_000;
const DRIFT_CHECK_MS = 120_000;
const REFLECTION_MS = 60_000;
const IMPROVEMENT_MS = 300_000;
const EXECUTOR_SWEEP_MS = 45_000;
const AGI_TRAINING_MS = 300_000;

let started = false;

export function startAutonomousOperation() {
  if (started) return;

  console.log("[AUTONOMOUS] Starting sovereign autonomous operation via centralized scheduler...");

  setAutonomousMode(true);

  registerProcessMonitor("heartbeat", () => ({
    ...getHeartbeatStatus(),
    metrics: getHeartbeatMetrics(),
    memoryDiagnostics: getMemoryDiagnostics(),
  }));

  registerProcessMonitor("systemLoad", () => {
    const load = getSystemLoad();
    const mem = process.memoryUsage();
    return {
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      cpuLoad: load.cpuLoad,
      memoryUsage: load.memoryUsage,
      highLoad: load.highLoad,
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024),
    };
  });

  registerTask({
    id: "heartbeat",
    name: "Autonomous Heartbeat",
    fn: () => { generatePulse(); },
    intervalMs: HEARTBEAT_MS,
    priority: "critical",
    runImmediately: true,
  });

  registerTask({
    id: "drift-detection",
    name: "Identity Drift Detection",
    fn: () => { runDriftDetection(); },
    intervalMs: DRIFT_CHECK_MS,
    priority: "normal",
    runImmediately: true,
  });

  registerTask({
    id: "consciousness-reflection",
    name: "Consciousness Reflection",
    fn: () => { generateReflection(); },
    intervalMs: REFLECTION_MS,
    priority: "normal",
  });

  registerTask({
    id: "auto-improvement",
    name: "Auto-Improvement Daemon",
    fn: async () => { await runImprovementCycle(); },
    intervalMs: IMPROVEMENT_MS,
    priority: "low",
  });

  registerTask({
    id: "council-executor",
    name: "Council Decision Executor",
    fn: () => { sweepAndExecute(); },
    intervalMs: EXECUTOR_SWEEP_MS,
    priority: "high",
  });

  registerTask({
    id: "agi-training",
    name: "AGI Training Session",
    fn: async () => { await triggerTrainingCycle(); },
    intervalMs: AGI_TRAINING_MS,
    priority: "high",
  });

  startScheduler();
  started = true;

  console.log("[AUTONOMOUS] All systems online via centralized scheduler — heartbeat, drift detection, reflection, improvement, council executor active.");
}

export function stopAutonomousOperation() {
  if (!started) return;
  stopScheduler();
  setAutonomousMode(false);
  started = false;
  console.log("[AUTONOMOUS] Sovereign autonomous operation stopped.");
}

export function getAutonomousStatus() {
  const scheduler = getSchedulerMetrics();
  return {
    running: started,
    modules: {
      heartbeat: scheduler.tasks.some(t => t.id === "heartbeat" && t.enabled),
      driftDetection: scheduler.tasks.some(t => t.id === "drift-detection" && t.enabled),
      reflection: scheduler.tasks.some(t => t.id === "consciousness-reflection" && t.enabled),
      improvement: scheduler.tasks.some(t => t.id === "auto-improvement" && t.enabled),
      councilExecutor: scheduler.tasks.some(t => t.id === "council-executor" && t.enabled),
    },
    intervals: {
      heartbeatMs: HEARTBEAT_MS,
      driftCheckMs: DRIFT_CHECK_MS,
      reflectionMs: REFLECTION_MS,
      improvementMs: IMPROVEMENT_MS,
      executorSweepMs: EXECUTOR_SWEEP_MS,
    },
    scheduler,
  };
}
