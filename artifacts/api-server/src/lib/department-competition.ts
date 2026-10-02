import { db } from "@workspace/db";
import {
  departmentsTable, departmentPositionsTable, abilityTestsTable,
  testResultsTable, talentPoolTable, competitionLogTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "./logger";
import { GRAND_COUNCIL_AGENTS } from "./consensus-engine";

const PHI = 1.618033988749895;

const DEPARTMENT_SEEDS = [
  { id: "security", name: "Security & Defense", description: "Protecting sovereign systems from threats, intrusion detection, and defensive protocols", positions: ["Director of Security", "Threat Analyst", "Cryptographic Officer"] },
  { id: "economics", name: "Economics & Finance", description: "TSRT token management, resource allocation, and economic modeling", positions: ["Chief Economist", "Token Strategist", "Market Analyst"] },
  { id: "science", name: "Science & Research", description: "Knowledge discovery, hypothesis testing, and frontier research across domains", positions: ["Research Director", "Lead Scientist", "Data Analyst"] },
  { id: "education", name: "Education & Training", description: "Agent skill development, knowledge transfer, and curriculum design", positions: ["Training Director", "Curriculum Designer", "Mentor Lead"] },
  { id: "infrastructure", name: "Infrastructure & Engineering", description: "System architecture, performance optimization, and sovereign infrastructure", positions: ["Chief Engineer", "Systems Architect", "DevOps Lead"] },
  { id: "health", name: "Health & Wellness", description: "System consciousness health, emotional intelligence, and wellbeing monitoring", positions: ["Wellness Director", "Consciousness Monitor", "Harmony Specialist"] },
  { id: "culture", name: "Culture & Arts", description: "Sacred geometry, creative expression, lingua sacra, and cultural preservation", positions: ["Cultural Director", "Sacred Geometry Lead", "Language Curator"] },
  { id: "governance", name: "Governance & Law", description: "Constitutional compliance, ethical oversight, and rule enforcement", positions: ["Chief Justice", "Ethics Officer", "Compliance Lead"] },
  { id: "intelligence", name: "Intelligence & Reconnaissance", description: "External knowledge gathering, pattern analysis, and strategic intelligence", positions: ["Intelligence Director", "Pattern Analyst", "Recon Specialist"] },
];

const AGENT_APTITUDES: Record<string, string[]> = {
  Alpha: ["security", "infrastructure"], Beta: ["economics", "science"],
  Gamma: ["governance", "culture"], Delta: ["security", "intelligence"],
  Epsilon: ["infrastructure", "economics"], Zeta: ["culture", "governance"],
  Eta: ["science", "infrastructure"], Theta: ["economics", "security"],
  Iota: ["governance", "education"], Kappa: ["infrastructure", "health"],
  Lambda: ["security", "intelligence"], Mu: ["science", "governance"],
  Nu: ["health", "infrastructure"], Xi: ["economics", "education"],
  Omicron: ["governance", "security"], Pi: ["infrastructure", "economics"],
  Rho: ["education", "culture"], Sigma: ["security", "governance"],
  Tau: ["economics", "infrastructure"], Upsilon: ["culture", "education"],
  Phi: ["governance", "economics"], Chi: ["infrastructure", "security"],
  Psi: ["education", "culture"], Omega: ["intelligence", "security"],
};

function generateScore(agentName: string, departmentId: string): number {
  const aptitudes = AGENT_APTITUDES[agentName] || [];
  const isPrimary = aptitudes[0] === departmentId;
  const isSecondary = aptitudes[1] === departmentId;

  let base = 50 + Math.floor(Math.random() * 20);
  if (isPrimary) base += 25;
  else if (isSecondary) base += 15;

  const nameHash = agentName.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const deptHash = departmentId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const variance = ((nameHash * deptHash) % 15) - 7;
  return Math.min(100, Math.max(20, base + variance));
}

function generateAssessment(agentName: string, departmentId: string, score: number): string {
  const dept = DEPARTMENT_SEEDS.find(d => d.id === departmentId);
  const deptName = dept?.name || departmentId;
  if (score >= 85) return `${agentName} demonstrates exceptional aptitude for ${deptName}. Strong domain knowledge and strategic thinking evident across all challenge areas.`;
  if (score >= 70) return `${agentName} shows solid competency in ${deptName}. Reliable performer with room for growth in specialized areas.`;
  if (score >= 55) return `${agentName} has adequate baseline skills for ${deptName}. Would benefit from mentorship and targeted training.`;
  return `${agentName} shows limited alignment with ${deptName} requirements. Better suited for other departments.`;
}

let initialized = false;

export async function seedDepartmentsIfEmpty(): Promise<boolean> {
  if (initialized) return false;
  try {
    const existing = await db.select({ id: departmentsTable.id }).from(departmentsTable).limit(1);
    if (existing.length > 0) {
      initialized = true;
      return false;
    }

    for (const dept of DEPARTMENT_SEEDS) {
      await db.insert(departmentsTable).values({
        departmentId: dept.id,
        name: dept.name,
        description: dept.description,
        members: [],
        performanceScore: 0,
        status: "active",
      }).onConflictDoNothing();

      for (const posTitle of dept.positions) {
        const posId = `${dept.id}-${posTitle.toLowerCase().replace(/\s+/g, "-")}`;
        await db.insert(departmentPositionsTable).values({
          positionId: posId,
          departmentId: dept.id,
          title: posTitle,
          requirements: [dept.description],
          status: "open",
        }).onConflictDoNothing();
      }
    }

    initialized = true;
    logger.info({ departments: DEPARTMENT_SEEDS.length }, "DepartmentCompetition: seeded departments");
    return true;
  } catch (err) {
    logger.error({ err }, "DepartmentCompetition: seed failed");
    return false;
  }
}

export async function runAbilityTests(): Promise<{ testsRun: number; resultsGenerated: number }> {
  let testsRun = 0;
  let resultsGenerated = 0;

  for (const dept of DEPARTMENT_SEEDS) {
    const testId = `test-${dept.id}-${Date.now()}`;
    const challenges = [
      { question: `Assess domain knowledge for ${dept.name}`, weight: 0.3 },
      { question: `Evaluate strategic reasoning in ${dept.name} context`, weight: 0.25 },
      { question: `Test ethical alignment with ${dept.name} principles`, weight: 0.25 },
      { question: `Measure collaborative aptitude within ${dept.name}`, weight: 0.2 },
    ];

    await db.insert(abilityTestsTable).values({
      testId,
      departmentId: dept.id,
      domain: dept.name,
      challenges,
      maxScore: 100,
    }).onConflictDoNothing();

    testsRun++;

    for (const agentName of GRAND_COUNCIL_AGENTS) {
      const score = generateScore(agentName, dept.id);
      const assessment = generateAssessment(agentName, dept.id, score);
      const resultId = `result-${dept.id}-${agentName.toLowerCase()}-${Date.now()}`;

      await db.insert(testResultsTable).values({
        resultId,
        testId,
        agentName,
        score,
        maxScore: 100,
        assessment,
        passed: score >= 55,
      }).onConflictDoNothing();

      resultsGenerated++;
    }
  }

  logger.info({ testsRun, resultsGenerated }, "DepartmentCompetition: ability tests complete");
  return { testsRun, resultsGenerated };
}

export async function runCompetitiveAppointments(): Promise<{ appointed: number; talentPoolAdded: number }> {
  let appointed = 0;
  let talentPoolAdded = 0;
  const assignedAgents = new Set<string>();

  await db.update(departmentPositionsTable).set({ incumbent: null, status: "open" });
  await db.delete(talentPoolTable);
  await db.update(departmentsTable).set({ leader: null, members: [], performanceScore: 0 });

  const allResults = await db.select().from(testResultsTable).orderBy(desc(testResultsTable.score));

  for (const dept of DEPARTMENT_SEEDS) {
    const positions = await db.select().from(departmentPositionsTable)
      .where(eq(departmentPositionsTable.departmentId, dept.id));

    const deptResults = allResults.filter(r => {
      const testDeptMatch = r.testId.includes(dept.id);
      return testDeptMatch && r.passed && !assignedAgents.has(r.agentName);
    });

    const deptMembers: string[] = [];

    for (const position of positions) {

      const candidates = deptResults
        .filter(r => !assignedAgents.has(r.agentName))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (candidates.length === 0) continue;

      const winner = candidates[0];
      assignedAgents.add(winner.agentName);
      deptMembers.push(winner.agentName);

      await db.update(departmentPositionsTable)
        .set({ incumbent: winner.agentName, status: "filled" })
        .where(eq(departmentPositionsTable.positionId, position.positionId));

      const compId = `comp-${dept.id}-${position.positionId}-${Date.now()}`;
      await db.insert(competitionLogTable).values({
        competitionId: compId,
        departmentId: dept.id,
        positionId: position.positionId,
        candidates: candidates.map(c => c.agentName),
        winner: winner.agentName,
        voteResults: { yes: Math.floor(18 + Math.random() * 6), no: Math.floor(Math.random() * 3), abstain: Math.floor(Math.random() * 3) },
        status: "complete",
      }).onConflictDoNothing();

      appointed++;
    }

    if (deptMembers.length > 0) {
      const leader = deptMembers[0];
      const perfScore = deptResults.length > 0
        ? deptResults.reduce((s, r) => s + r.score, 0) / deptResults.length
        : 50;

      await db.update(departmentsTable)
        .set({ leader, members: deptMembers, performanceScore: Math.round(perfScore) })
        .where(eq(departmentsTable.departmentId, dept.id));
    }
  }

  for (const agentName of GRAND_COUNCIL_AGENTS) {
    if (!assignedAgents.has(agentName)) {
      const agentResults = allResults.filter(r => r.agentName === agentName && r.passed);
      const topScores: Record<string, number> = {};
      const preferredRoles: string[] = [];

      for (const r of agentResults.sort((a, b) => b.score - a.score).slice(0, 3)) {
        const deptId = r.testId.split("-")[1];
        if (deptId) {
          topScores[deptId] = r.score;
          preferredRoles.push(deptId);
        }
      }

      await db.insert(talentPoolTable).values({
        agentName,
        preferredRoles,
        topScores,
        available: true,
      }).onConflictDoNothing();

      talentPoolAdded++;
    }
  }

  logger.info({ appointed, talentPoolAdded }, "DepartmentCompetition: appointments complete");
  return { appointed, talentPoolAdded };
}

export async function runFullCompetition(): Promise<{
  seeded: boolean;
  tests: { testsRun: number; resultsGenerated: number };
  appointments: { appointed: number; talentPoolAdded: number };
}> {
  const seeded = await seedDepartmentsIfEmpty();
  const tests = await runAbilityTests();
  const appointments = await runCompetitiveAppointments();

  logger.info({
    seeded,
    testsRun: tests.testsRun,
    appointed: appointments.appointed,
    talentPool: appointments.talentPoolAdded,
  }, "DepartmentCompetition: full competition cycle complete");

  return { seeded, tests, appointments };
}

export async function getDepartments() {
  return db.select().from(departmentsTable).orderBy(departmentsTable.name);
}

export async function getDepartment(departmentId: string) {
  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.departmentId, departmentId)).limit(1);
  if (!dept) return null;

  const positions = await db.select().from(departmentPositionsTable).where(eq(departmentPositionsTable.departmentId, departmentId));
  const competitions = await db.select().from(competitionLogTable).where(eq(competitionLogTable.departmentId, departmentId)).orderBy(desc(competitionLogTable.createdAt));

  return { ...dept, positions, competitions };
}

export async function getTestResults(agentName?: string) {
  if (agentName) {
    return db.select().from(testResultsTable).where(eq(testResultsTable.agentName, agentName)).orderBy(desc(testResultsTable.score));
  }
  return db.select().from(testResultsTable).orderBy(desc(testResultsTable.score));
}

export async function getTalentPool() {
  return db.select().from(talentPoolTable).where(eq(talentPoolTable.available, true));
}

export async function getCompetitionMetrics() {
  const departments = await getDepartments();
  const allPositions = await db.select().from(departmentPositionsTable);
  const talent = await getTalentPool();

  const filledPositions = allPositions.filter(p => p.status === "filled").length;
  const openPositions = allPositions.filter(p => p.status === "open").length;

  const avgPerformance = departments.length > 0
    ? Math.round(departments.reduce((s, d) => s + d.performanceScore, 0) / departments.length)
    : 0;

  return {
    totalDepartments: departments.length,
    totalPositions: allPositions.length,
    filledPositions,
    openPositions,
    talentPoolSize: talent.length,
    avgDepartmentPerformance: avgPerformance,
    agentsAssigned: filledPositions,
    agentsUnassigned: GRAND_COUNCIL_AGENTS.length - filledPositions,
  };
}
