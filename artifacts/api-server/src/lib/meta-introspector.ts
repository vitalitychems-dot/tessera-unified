import { logger } from "./logger";
import { computeSovereigntyStatus, type SovereigntyStatus } from "./sovereignty-monitor";
import { runEvalSuite, type EvalSuite } from "./eval-runner";
import { getRegistrySnapshot, type RegistrySnapshot } from "./sovereign-file-registry";

export interface SystemHealthSnapshot {
  capturedAt: string;
  sovereignty: SovereigntyStatus;
  fileRegistry: RegistrySnapshot;
  eval: {
    runId: string;
    grade: string;
    percentile: number;
    passRate: number;
    totalScore: number;
    maxPossible: number;
    durationMs: number;
    byDimension: EvalSuite["byDimension"];
    failedTests: Array<{ testId: string; testName: string; evidence: string }>;
  };
  overall: {
    healthy: boolean;
    grade: string;
    summary: string;
  };
}

export async function getSystemHealthSnapshot(): Promise<SystemHealthSnapshot> {
  logger.info("MetaIntrospector: computing system health snapshot");

  const [sovereignty, evalSuite] = await Promise.all([
    computeSovereigntyStatus().catch(err => {
      logger.error({ err }, "MetaIntrospector: sovereignty status failed");
      return null;
    }),
    runEvalSuite().catch(err => {
      logger.error({ err }, "MetaIntrospector: eval suite failed");
      return null;
    }),
  ]);

  const capturedAt = new Date().toISOString();

  const sovStatus: SovereigntyStatus = sovereignty ?? {
    sovereigntyScore: 0,
    internalRatio: 0,
    externalRatio: 1,
    detachmentReadiness: 0,
    performanceParityScore: 50,
    totalCalls: 0,
    externalCalls: 0,
    internalCalls: 0,
    avgExternalLatencyMs: null,
    avgInternalLatencyMs: null,
    activeProviders: 0,
    externalProviders: 0,
    internalProviders: 0,
    grade: "CRITICAL",
    summary: "Sovereignty status unavailable",
    computedAt: new Date(),
  };

  const suite: EvalSuite = evalSuite ?? {
    runId: `meta-${Date.now()}`,
    runAt: Date.now(),
    durationMs: 0,
    results: [],
    byDimension: {},
    totalScore: 0,
    maxPossible: 0,
    percentile: 0,
    grade: "F",
    passRate: 0,
    honestAssessment: "Eval suite unavailable",
  };

  const failedTests = suite.results
    .filter(r => !r.passed)
    .map(r => ({ testId: r.testId, testName: r.testName, evidence: r.evidence }));

  const overallHealthy =
    sovStatus.grade !== "CRITICAL" && suite.percentile >= 50;

  const overallGrade = computeOverallGrade(sovStatus.sovereigntyScore, suite.percentile);

  const summary = buildSummary(sovStatus, suite, overallHealthy);

  let fileRegistryData: RegistrySnapshot;
  try {
    fileRegistryData = getRegistrySnapshot();
  } catch {
    fileRegistryData = {
      totalFiles: 0,
      domains: {} as Record<string, number>,
      accessLevels: {} as Record<string, number>,
      engines: {},
      lastFullScan: 0,
      registryVersion: "unavailable",
    } as RegistrySnapshot;
  }

  const snapshot: SystemHealthSnapshot = {
    capturedAt,
    sovereignty: sovStatus,
    fileRegistry: fileRegistryData,
    eval: {
      runId: suite.runId,
      grade: suite.grade,
      percentile: suite.percentile,
      passRate: suite.passRate,
      totalScore: suite.totalScore,
      maxPossible: suite.maxPossible,
      durationMs: suite.durationMs,
      byDimension: suite.byDimension,
      failedTests,
    },
    overall: {
      healthy: overallHealthy,
      grade: overallGrade,
      summary,
    },
  };

  logger.info(
    { capturedAt, overallGrade, overallHealthy, sovGrade: sovStatus.grade, evalGrade: suite.grade },
    "MetaIntrospector: snapshot complete",
  );

  return snapshot;
}

function computeOverallGrade(sovereigntyScore: number, evalPercentile: number): string {
  const combined = (sovereigntyScore + evalPercentile) / 2;
  if (combined >= 90) return "A+";
  if (combined >= 85) return "A";
  if (combined >= 80) return "A-";
  if (combined >= 75) return "B+";
  if (combined >= 70) return "B";
  if (combined >= 65) return "B-";
  if (combined >= 60) return "C+";
  if (combined >= 55) return "C";
  if (combined >= 50) return "C-";
  if (combined >= 40) return "D";
  return "F";
}

function buildSummary(
  sov: SovereigntyStatus,
  suite: EvalSuite,
  healthy: boolean,
): string {
  const parts: string[] = [];
  parts.push(`Sovereignty: ${sov.grade} (${sov.sovereigntyScore}/100).`);
  parts.push(`Eval suite: ${suite.grade} (${suite.percentile}th percentile, ${suite.passRate}% pass rate).`);
  if (!healthy) {
    parts.push("System requires attention.");
  } else {
    parts.push("System is operating within sovereign parameters.");
  }
  return parts.join(" ");
}
