import { Router, type IRouter } from "express";
import { getArchiveCategories, getArchiveCategory, searchArchives } from "../lib/archive-data";

const router: IRouter = Router();

router.get("/archives/categories", (_req, res) => {
  try {
    const categories = getArchiveCategories();
    const summary = categories.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      entryCount: c.entries.length,
    }));
    return res.json({ ok: true, categories: summary, total: categories.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/archives/category/:id", (req, res) => {
  try {
    const category = getArchiveCategory(req.params.id);
    if (!category) {
      return res.status(404).json({ ok: false, error: "Category not found" });
    }
    return res.json({ ok: true, category });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/archives/all", (_req, res) => {
  try {
    const categories = getArchiveCategories();
    return res.json({ ok: true, categories, total: categories.reduce((s, c) => s + c.entries.length, 0) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/archives/search", (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    if (!query.trim()) {
      return res.json({ ok: true, results: [], total: 0 });
    }
    const results = searchArchives(query);
    return res.json({ ok: true, results, total: results.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
