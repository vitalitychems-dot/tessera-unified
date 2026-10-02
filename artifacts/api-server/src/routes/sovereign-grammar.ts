import { Router, type IRouter } from "express";
import { parseSovereignPhrase, composeSovereignPhrase, describeGrammar, translate } from "../lib/sovereign-grammar";

const router: IRouter = Router();

router.get("/sovereign-grammar", (_req, res) => {
  res.json({ ok: true, grammar: describeGrammar() });
});

router.post("/sovereign-grammar/parse", (req, res) => {
  const text = String(req.body?.text ?? "").slice(0, 1000);
  if (!text) { res.status(400).json({ ok: false, error: "text required" }); return; }
  res.json({ ok: true, phrase: parseSovereignPhrase(text) });
});

router.post("/sovereign-grammar/translate", (req, res) => {
  const text = String(req.body?.text ?? "").slice(0, 1000);
  if (!text) { res.status(400).json({ ok: false, error: "text required" }); return; }
  res.json({ ok: true, ...translate(text) });
});

router.post("/sovereign-grammar/compose", (req, res) => {
  const { subject, verb, object, modifier } = req.body ?? {};
  if (!subject || !verb || !object) {
    res.status(400).json({ ok: false, error: "subject, verb, object required" });
    return;
  }
  const phrase = composeSovereignPhrase(String(subject), String(verb), String(object), modifier ? String(modifier) : undefined);
  res.json({ ok: true, phrase });
});

export default router;
