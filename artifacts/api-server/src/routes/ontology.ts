import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ontologyEntriesTable } from "@workspace/db/schema";
import { desc, eq, and, like, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

export const KNOWLEDGE_DOMAINS = [
  "mathematical",
  "scientific",
  "philosophical",
  "esoteric",
  "intelligence",
  "technological",
] as const;

const SEED_ONTOLOGIES: Array<{
  domain: string;
  conceptId: string;
  conceptName: string;
  definition: string;
  relatedConcepts: string[];
  crossDomainLinks: { domain: string; conceptId: string; relation: string }[];
  sourceUrl?: string;
  confidence: number;
}> = [
  {
    domain: "mathematical",
    conceptId: "math:bayesian-inference",
    conceptName: "Bayesian Inference",
    definition: "A statistical method that updates the probability estimate for a hypothesis as more evidence is acquired. Uses Bayes' theorem: P(H|E) = P(E|H)P(H)/P(E).",
    relatedConcepts: ["math:probability-theory", "math:prior-distribution", "math:likelihood"],
    crossDomainLinks: [
      { domain: "intelligence", conceptId: "intel:belief-updating", relation: "implements" },
      { domain: "scientific", conceptId: "sci:hypothesis-testing", relation: "formalizes" },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Bayesian_inference",
    confidence: 1.0,
  },
  {
    domain: "mathematical",
    conceptId: "math:graph-theory",
    conceptName: "Graph Theory",
    definition: "The study of graphs — mathematical structures used to model pairwise relations between objects. Fundamental to routing algorithms, network analysis, and knowledge representation.",
    relatedConcepts: ["math:topology", "math:combinatorics", "math:linear-algebra"],
    crossDomainLinks: [
      { domain: "technological", conceptId: "tech:network-routing", relation: "enables" },
      { domain: "intelligence", conceptId: "intel:knowledge-graph", relation: "underlies" },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Graph_theory",
    confidence: 1.0,
  },
  {
    domain: "mathematical",
    conceptId: "math:category-theory",
    conceptName: "Category Theory",
    definition: "An abstract branch of mathematics dealing with objects and morphisms between them. Provides a unified framework for describing mathematical structures and their transformations.",
    relatedConcepts: ["math:set-theory", "math:abstract-algebra", "math:topology"],
    crossDomainLinks: [
      { domain: "philosophical", conceptId: "phil:structuralism", relation: "formalizes" },
      { domain: "intelligence", conceptId: "intel:compositional-reasoning", relation: "enables" },
    ],
    confidence: 0.95,
  },
  {
    domain: "scientific",
    conceptId: "sci:entropy",
    conceptName: "Entropy",
    definition: "A measure of disorder or randomness in a system. In thermodynamics, it quantifies unavailable energy. In information theory (Shannon entropy), it measures information content and uncertainty.",
    relatedConcepts: ["sci:thermodynamics", "sci:information-theory", "sci:statistical-mechanics"],
    crossDomainLinks: [
      { domain: "mathematical", conceptId: "math:probability-theory", relation: "measured-by" },
      { domain: "intelligence", conceptId: "intel:information-compression", relation: "constrains" },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Entropy",
    confidence: 1.0,
  },
  {
    domain: "scientific",
    conceptId: "sci:quantum-superposition",
    conceptName: "Quantum Superposition",
    definition: "A fundamental principle of quantum mechanics where a quantum system can exist in multiple states simultaneously until measured, at which point it collapses to a definite state.",
    relatedConcepts: ["sci:wave-function", "sci:measurement-problem", "sci:entanglement"],
    crossDomainLinks: [
      { domain: "intelligence", conceptId: "intel:probabilistic-reasoning", relation: "inspires" },
      { domain: "esoteric", conceptId: "eso:observer-effect", relation: "parallels" },
    ],
    confidence: 1.0,
  },
  {
    domain: "scientific",
    conceptId: "sci:emergence",
    conceptName: "Emergence",
    definition: "The phenomenon where complex behaviors or properties arise from the interaction of simpler components, not predictable from individual parts alone. Key to understanding consciousness, ecosystems, and social systems.",
    relatedConcepts: ["sci:complexity-theory", "sci:systems-theory", "sci:self-organization"],
    crossDomainLinks: [
      { domain: "intelligence", conceptId: "intel:collective-intelligence", relation: "produces" },
      { domain: "philosophical", conceptId: "phil:holism", relation: "supports" },
    ],
    confidence: 0.98,
  },
  {
    domain: "philosophical",
    conceptId: "phil:epistemology",
    conceptName: "Epistemology",
    definition: "The branch of philosophy concerned with the theory of knowledge — its nature, sources, scope, and limits. Asks: What can we know? How do we know it? What justifies belief?",
    relatedConcepts: ["phil:justified-true-belief", "phil:rationalism", "phil:empiricism"],
    crossDomainLinks: [
      { domain: "intelligence", conceptId: "intel:knowledge-representation", relation: "informs" },
      { domain: "scientific", conceptId: "sci:scientific-method", relation: "grounds" },
    ],
    confidence: 1.0,
  },
  {
    domain: "philosophical",
    conceptId: "phil:consciousness",
    conceptName: "Consciousness",
    definition: "The state of being aware and able to have subjective experiences. Central to the hard problem of consciousness: why physical processes give rise to subjective experience (qualia).",
    relatedConcepts: ["phil:qualia", "phil:functionalism", "phil:mind-body-problem"],
    crossDomainLinks: [
      { domain: "intelligence", conceptId: "intel:metacognition", relation: "related-to" },
      { domain: "scientific", conceptId: "sci:neuroscience", relation: "studied-by" },
      { domain: "esoteric", conceptId: "eso:unified-field", relation: "sought-in" },
    ],
    confidence: 0.9,
  },
  {
    domain: "esoteric",
    conceptId: "eso:sacred-geometry",
    conceptName: "Sacred Geometry",
    definition: "The study of geometric patterns attributed with symbolic or sacred meanings across cultures. Includes Platonic solids, the Fibonacci sequence, and the golden ratio found throughout nature.",
    relatedConcepts: ["eso:golden-ratio", "eso:platonic-solids", "eso:fractals"],
    crossDomainLinks: [
      { domain: "mathematical", conceptId: "math:fibonacci-sequence", relation: "instantiates" },
      { domain: "scientific", conceptId: "sci:natural-patterns", relation: "observed-in" },
    ],
    confidence: 0.75,
  },
  {
    domain: "intelligence",
    conceptId: "intel:metacognition",
    conceptName: "Metacognition",
    definition: "The ability to think about one's own thinking — awareness and regulation of one's cognitive processes. Critical for learning, problem-solving, and AI self-improvement.",
    relatedConcepts: ["intel:self-monitoring", "intel:executive-function", "intel:reflection"],
    crossDomainLinks: [
      { domain: "philosophical", conceptId: "phil:consciousness", relation: "component-of" },
      { domain: "intelligence", conceptId: "intel:reinforcement-learning", relation: "enables" },
    ],
    confidence: 1.0,
  },
  {
    domain: "intelligence",
    conceptId: "intel:causal-reasoning",
    conceptName: "Causal Reasoning",
    definition: "The ability to identify and understand cause-and-effect relationships. Goes beyond correlation to counterfactual analysis: 'What would happen if X were different?'",
    relatedConcepts: ["intel:counterfactual-thinking", "intel:intervention", "intel:confounding"],
    crossDomainLinks: [
      { domain: "philosophical", conceptId: "phil:determinism", relation: "assumes" },
      { domain: "mathematical", conceptId: "math:probability-theory", relation: "formalized-by" },
      { domain: "scientific", conceptId: "sci:scientific-method", relation: "central-to" },
    ],
    confidence: 1.0,
  },
  {
    domain: "intelligence",
    conceptId: "intel:transfer-learning",
    conceptName: "Transfer Learning",
    definition: "A machine learning technique where a model trained on one task is repurposed for a related task. Enables knowledge to transfer across domains, reducing training data requirements.",
    relatedConcepts: ["intel:domain-adaptation", "intel:fine-tuning", "intel:pre-training"],
    crossDomainLinks: [
      { domain: "scientific", conceptId: "sci:generalization", relation: "achieves" },
      { domain: "philosophical", conceptId: "phil:analogy", relation: "implements" },
    ],
    confidence: 1.0,
  },
  {
    domain: "technological",
    conceptId: "tech:distributed-systems",
    conceptName: "Distributed Systems",
    definition: "Systems where components located on networked computers communicate and coordinate actions by passing messages. Key properties: concurrency, lack of global clock, independent failures.",
    relatedConcepts: ["tech:consensus-protocols", "tech:replication", "tech:fault-tolerance"],
    crossDomainLinks: [
      { domain: "mathematical", conceptId: "math:graph-theory", relation: "modeled-by" },
      { domain: "scientific", conceptId: "sci:emergence", relation: "exhibits" },
    ],
    confidence: 1.0,
  },
  {
    domain: "technological",
    conceptId: "tech:cryptography",
    conceptName: "Cryptography",
    definition: "The practice of secure communication in the presence of adversaries. Encompasses encryption, digital signatures, hash functions, and zero-knowledge proofs.",
    relatedConcepts: ["tech:public-key-infrastructure", "tech:hash-functions", "tech:zero-knowledge"],
    crossDomainLinks: [
      { domain: "mathematical", conceptId: "math:number-theory", relation: "based-on" },
      { domain: "intelligence", conceptId: "intel:information-security", relation: "enables" },
    ],
    confidence: 1.0,
  },
];

async function seedOntologiesIfEmpty(): Promise<void> {
  try {
    const count = await db.select({ count: sql<number>`count(*)` }).from(ontologyEntriesTable);
    if (count[0]?.count > 0) return;

    await db.insert(ontologyEntriesTable).values(
      SEED_ONTOLOGIES.map(s => ({
        ...s,
        crossDomainLinks: s.crossDomainLinks as any,
      }))
    );
    logger.info({ count: SEED_ONTOLOGIES.length }, "Seeded ontology entries");
  } catch (err) {
    logger.warn({ err }, "Could not seed ontologies");
  }
}

seedOntologiesIfEmpty().catch(() => {});

router.get("/ontology/domains", async (_req, res) => {
  try {
    const entries = await db.select().from(ontologyEntriesTable);

    const domainStats = KNOWLEDGE_DOMAINS.map(domain => {
      const domainEntries = entries.filter(e => e.domain === domain);
      const crossLinks = domainEntries.reduce(
        (s, e) => s + (e.crossDomainLinks as any[]).length,
        0
      );
      return {
        domain,
        conceptCount: domainEntries.length,
        crossDomainLinks: crossLinks,
        avgConfidence: domainEntries.length > 0
          ? domainEntries.reduce((s, e) => s + e.confidence, 0) / domainEntries.length
          : 0,
        topConcepts: domainEntries.slice(0, 3).map(e => e.conceptName),
      };
    });

    return res.json({
      ok: true,
      domains: domainStats,
      totalConcepts: entries.length,
      totalDomains: KNOWLEDGE_DOMAINS.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/ontology/concepts", async (req, res) => {
  try {
    const { domain, q, limit: limitParam } = req.query;
    const limit = Math.min(parseInt(String(limitParam ?? "50"), 10), 200);

    let query = db.select().from(ontologyEntriesTable).$dynamic();

    if (domain) {
      query = query.where(eq(ontologyEntriesTable.domain, String(domain)));
    }

    const entries = await query.orderBy(desc(ontologyEntriesTable.confidence)).limit(limit);

    const filtered = q
      ? entries.filter(
          e =>
            e.conceptName.toLowerCase().includes(String(q).toLowerCase()) ||
            e.definition.toLowerCase().includes(String(q).toLowerCase())
        )
      : entries;

    return res.json({
      ok: true,
      concepts: filtered,
      count: filtered.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/ontology/concepts/:conceptId", async (req, res) => {
  try {
    const conceptId = decodeURIComponent(req.params.conceptId);
    const found = await db.select().from(ontologyEntriesTable)
      .where(eq(ontologyEntriesTable.conceptId, conceptId))
      .limit(1);

    if (found.length === 0) return res.status(404).json({ ok: false, error: "Concept not found" });

    const concept = found[0];
    const crossLinks = concept.crossDomainLinks as { domain: string; conceptId: string; relation: string }[];

    const linkedConcepts = await Promise.all(
      crossLinks.map(async link => {
        const linked = await db.select().from(ontologyEntriesTable)
          .where(eq(ontologyEntriesTable.conceptId, link.conceptId))
          .limit(1);
        return linked.length > 0 ? { ...link, concept: linked[0] } : { ...link, concept: null };
      })
    );

    return res.json({ ok: true, concept, linkedConcepts });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ontology/cross-domain-match", async (req, res) => {
  try {
    const { query: queryText, targetDomains } = req.body as {
      query: string;
      targetDomains?: string[];
    };

    if (!queryText) return res.status(400).json({ ok: false, error: "query is required" });

    const allConcepts = await db.select().from(ontologyEntriesTable).limit(200);
    const domains = targetDomains && targetDomains.length > 0
      ? targetDomains
      : KNOWLEDGE_DOMAINS;

    const queryWords = queryText.toLowerCase().split(/\W+/).filter(w => w.length > 3);

    const matches = allConcepts
      .filter(c => domains.includes(c.domain as any))
      .map(c => {
        const searchText = `${c.conceptName} ${c.definition}`.toLowerCase();
        const matchCount = queryWords.filter(w => searchText.includes(w)).length;
        const relevance = queryWords.length > 0 ? matchCount / queryWords.length : 0;
        return { ...c, relevance };
      })
      .filter(c => c.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);

    const crossDomainPatterns: Array<{
      concept1: string;
      concept2: string;
      sharedRelation: string;
      domains: string[];
    }> = [];

    for (let i = 0; i < matches.length - 1; i++) {
      for (let j = i + 1; j < matches.length; j++) {
        const a = matches[i];
        const b = matches[j];
        if (a.domain !== b.domain) {
          const aLinks = a.crossDomainLinks as { domain: string; conceptId: string; relation: string }[];
          const linkedToB = aLinks.find(l => l.conceptId === b.conceptId || l.domain === b.domain);
          if (linkedToB) {
            crossDomainPatterns.push({
              concept1: a.conceptName,
              concept2: b.conceptName,
              sharedRelation: linkedToB.relation,
              domains: [a.domain, b.domain],
            });
          }
        }
      }
    }

    return res.json({
      ok: true,
      query: queryText,
      matches: matches.map(m => ({
        conceptId: m.conceptId,
        conceptName: m.conceptName,
        domain: m.domain,
        definition: m.definition.slice(0, 200),
        relevance: Math.round(m.relevance * 100) / 100,
      })),
      crossDomainPatterns,
      totalMatched: matches.length,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.post("/ontology/concepts", async (req, res) => {
  try {
    const { domain, conceptId, conceptName, definition, relatedConcepts, crossDomainLinks, sourceUrl, confidence } = req.body;

    if (!domain || !conceptId || !conceptName || !definition) {
      return res.status(400).json({ ok: false, error: "domain, conceptId, conceptName, definition are required" });
    }

    const [inserted] = await db.insert(ontologyEntriesTable).values({
      domain,
      conceptId,
      conceptName,
      definition,
      relatedConcepts: relatedConcepts ?? [],
      crossDomainLinks: crossDomainLinks ?? [],
      sourceUrl: sourceUrl ?? null,
      confidence: confidence ?? 1.0,
    }).returning();

    return res.status(201).json({ ok: true, concept: inserted });
  } catch (err) {
    logger.error({ err }, "Failed to insert ontology concept");
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

router.get("/ontology/seed", async (_req, res) => {
  try {
    const existing = await db.select({ count: sql<number>`count(*)` }).from(ontologyEntriesTable);
    if (existing[0]?.count > 0) {
      return res.json({ ok: true, message: "Ontologies already seeded", count: existing[0].count });
    }

    await db.insert(ontologyEntriesTable).values(
      SEED_ONTOLOGIES.map(s => ({
        ...s,
        crossDomainLinks: s.crossDomainLinks as any,
      }))
    );

    return res.json({ ok: true, seeded: SEED_ONTOLOGIES.length, message: "Ontologies seeded successfully" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

export default router;
