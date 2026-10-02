import { runEvalSuite } from "../lib/eval-runner";
import type { EvalResult } from "../lib/eval-runner";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return GREEN;
  if (grade.startsWith("B")) return CYAN;
  if (grade.startsWith("C")) return YELLOW;
  return RED;
}

function passIcon(passed: boolean): string {
  return passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
}

function bar(score: number, max: number, width = 20): string {
  const filled = Math.round((score / max) * width);
  return `[${"█".repeat(filled)}${"░".repeat(width - filled)}]`;
}

async function main(): Promise<void> {
  console.log(`\n${BOLD}╔═══════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║      TESSERA SOVEREIGN EVAL SUITE              ║${RESET}`);
  console.log(`${BOLD}╚═══════════════════════════════════════════════╝${RESET}\n`);
  console.log(`${DIM}Running eval suite — this may take 30–60 seconds...${RESET}\n`);

  const suite = await runEvalSuite();

  console.log(`${BOLD}── Results by Dimension ─────────────────────────${RESET}\n`);

  for (const [dimension, data] of Object.entries(suite.byDimension)) {
    const pct = Math.round((data.score / data.maxScore) * 100);
    const passedCount = data.tests.filter((t: EvalResult) => t.passed).length;
    console.log(`${BOLD}${dimension}${RESET} — ${pct}% (${passedCount}/${data.tests.length} passed)`);
    console.log(`  ${bar(data.score, data.maxScore)} ${data.score}/${data.maxScore}`);

    for (const test of data.tests) {
      const icon = passIcon(test.passed);
      const scoreStr = `${test.score}/${test.maxScore}`;
      const latency = `${test.durationMs}ms`;
      console.log(`  ${icon} ${test.testName} ${DIM}[${scoreStr}] [${latency}]${RESET}`);
      if (!test.passed || process.env.EVAL_VERBOSE === "1") {
        console.log(`      ${DIM}${test.evidence.slice(0, 120)}${RESET}`);
      }
    }
    console.log();
  }

  console.log(`${BOLD}── Summary ───────────────────────────────────────${RESET}\n`);

  const gradeStr = `${gradeColor(suite.grade)}${BOLD}${suite.grade}${RESET}`;
  const passed = suite.results.filter((r: EvalResult) => r.passed).length;
  const total = suite.results.length;

  console.log(`  Grade:       ${gradeStr}`);
  console.log(`  Score:       ${suite.totalScore} / ${suite.maxPossible} (${suite.percentile}th percentile)`);
  console.log(`  Pass Rate:   ${GREEN}${passed}${RESET} / ${total} tests (${suite.passRate}%)`);
  console.log(`  Duration:    ${suite.durationMs}ms`);
  console.log(`  Run ID:      ${DIM}${suite.runId}${RESET}`);

  const failed = suite.results.filter((r: EvalResult) => !r.passed);
  if (failed.length > 0) {
    console.log(`\n${BOLD}── Failed Tests ─────────────────────────────────${RESET}\n`);
    for (const r of failed) {
      console.log(`  ${RED}✗${RESET} ${r.testName} (${r.dimension})`);
      console.log(`    ${DIM}${r.evidence.slice(0, 160)}${RESET}`);
      if (r.error) {
        console.log(`    ${RED}Error: ${r.error}${RESET}`);
      }
    }
  }

  console.log(`\n${DIM}${suite.honestAssessment}${RESET}\n`);

  const exitCode = suite.percentile >= 50 ? 0 : 1;
  process.exit(exitCode);
}

main().catch(err => {
  console.error(`${RED}Eval suite threw an unhandled error:${RESET}`, err);
  process.exit(1);
});
