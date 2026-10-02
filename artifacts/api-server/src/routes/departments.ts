import { Router, type Request, type Response } from "express";
import {
  getDepartments, getDepartment, getTestResults, getTalentPool,
  getCompetitionMetrics, runFullCompetition, runAbilityTests,
  runCompetitiveAppointments, seedDepartmentsIfEmpty,
} from "../lib/department-competition";

const router = Router();

router.get("/departments", async (_req: Request, res: Response) => {
  try {
    const departments = await getDepartments();
    res.json({ ok: true, data: departments, count: departments.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch departments" });
  }
});

router.get("/departments/metrics", async (_req: Request, res: Response) => {
  try {
    const metrics = await getCompetitionMetrics();
    res.json({ ok: true, data: metrics });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch metrics" });
  }
});

router.get("/departments/:id", async (req: Request, res: Response) => {
  try {
    const dept = await getDepartment(String(req.params.id));
    if (!dept) { res.status(404).json({ ok: false, error: "Department not found" }); return; }
    res.json({ ok: true, data: dept });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch department" });
  }
});

router.get("/talent-pool", async (_req: Request, res: Response) => {
  try {
    const pool = await getTalentPool();
    res.json({ ok: true, data: pool, count: pool.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch talent pool" });
  }
});

router.get("/test-results", async (req: Request, res: Response) => {
  try {
    const { agent } = req.query as { agent?: string };
    const results = await getTestResults(agent);
    res.json({ ok: true, data: results, count: results.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Failed to fetch test results" });
  }
});

router.post("/departments/competition", async (_req: Request, res: Response) => {
  try {
    const result = await runFullCompetition();
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Competition failed" });
  }
});

router.post("/departments/seed", async (_req: Request, res: Response) => {
  try {
    const seeded = await seedDepartmentsIfEmpty();
    res.json({ ok: true, data: { seeded } });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Seed failed" });
  }
});

export default router;
