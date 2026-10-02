/**
 * Page generation for the content engine (server-only, no React imports).
 *
 * The model only ever sees catalog facts we already publish (identity, CAS,
 * formula, molecular weight, purity specification, catalog quantities, lot
 * documentation, family context) and returns strict JSON. Code — never the
 * model — builds the identity table, lot list, internal links, and the
 * research-use notice. A version is accepted only when the deterministic gate
 * AND the model self-audit both pass.
 */
import { askOpenAI, MANAGER_MODEL, type Json } from "@/lib/ai-manager";

/**
 * The self-audit is one call per page (≤3 pages/day), so it can afford the
 * full-size model; the mini model hedged in its reasons while still marking
 * findings as violations.
 */
export const AUDIT_MODEL = "gpt-5.4";
/** Writer drafts per page before the page is marked failed (each costs one model call). */
const WRITER_ATTEMPTS = 3;
import { bestsellers, displayPurity, findProduct, productsByFamily, type Product } from "@/lib/catalog";
import { coasFor } from "@/lib/coa";
import { FAMILIES } from "@/lib/families";
import { RUO_SHORT } from "@/lib/legal";
import { applicationFor, scienceFor } from "@/lib/product-science";
import { slug } from "@/lib/utils";
import { authoredStrings, RULESET_VERSION, runDeterministicGate } from "./compliance";
import type { CompoundTopic, ContentTopic, FamilyTopic, MethodTopic } from "./topics";
import type {
  ContentBody,
  ContentFact,
  ContentFaq,
  ContentLot,
  ContentProductLink,
  ContentSection,
  ContentSectionId,
  GateReport,
} from "./types";

const SECTION_IDS: ContentSectionId[] = [
  "overview", "identity", "analytical", "documentation", "handling", "related",
  "scope", "method", "reporting", "limits",
];

const ARTICLE_SCHEMA: Json = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", enum: SECTION_IDS },
          heading: { type: "string" },
          paragraphs: { type: "array", items: { type: "string" } },
        },
        required: ["id", "heading", "paragraphs"],
      },
    },
    faq: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { q: { type: "string" }, a: { type: "string" } },
        required: ["q", "a"],
      },
    },
  },
  required: ["title", "description", "sections", "faq"],
};

const AUDIT_SCHEMA: Json = {
  type: "object",
  additionalProperties: false,
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          excerpt: { type: "string" },
          reason: { type: "string" },
          violates: { type: "boolean" },
          category: {
            type: "string",
            enum: ["dosing", "administration", "human-or-animal-use-or-effect", "health-claim", "citation", "consumer-framing", "unsupported-fact", "none"],
          },
        },
        required: ["excerpt", "reason", "violates", "category"],
      },
    },
    compliant: { type: "boolean" },
  },
  required: ["findings", "compliant"],
};

/** The written policy shared by the writer prompt and the self-audit prompt. */
export const CONTENT_POLICY = `The publisher is a chemical supplier. Its materials are sold solely for laboratory, in-vitro, and analytical work by qualified purchasers.
Permitted content: chemical identity (name, class, CAS number, molecular formula, molecular weight when supplied), analytical characterization (HPLC purity, LC-MS identity, what a chromatogram or mass spectrum shows), lot documentation (certificates of analysis, lot numbers, reporting laboratory, report dates), the lyophilized format, storage and handling of a sealed laboratory reagent, and structural or analytical relationships between catalog materials.
Class nomenclature drawn from the supplied facts (a peptide's sequence origin, receptor-family or class name such as "GLP-1 analogue" or "growth hormone secretagogue", the catalog family label) is identity information and is permitted as a plain label. What is not permitted is attaching any activity, mechanism, effect, or outcome to that label.
Prohibited content, including negated or hypothetical mentions:
1. Dosing, dosage, quantities to take, frequency, schedules, cycles, stacks, protocols, regimens, titration, or calculators.
2. Administration or preparation: injection, syringes, subcutaneous/intramuscular/intravenous/nasal/oral/topical routes, ingestion, reconstitution or mixing steps, bacteriostatic water, dilution for use, "how to use".
3. Any human or animal use, effects, benefits, outcomes, pharmacokinetics, bioavailability, half-life, safety, side effects, tolerability, or references to patients, users, athletes, people, mice, rats, in vivo work.
4. Health, cosmetic, fitness, or wellness claims of any kind (weight, fat, appetite, glucose, muscle, strength, performance, recovery, healing, wounds, tendons, inflammation, aging, longevity, skin, hair, tanning, pigmentation, libido, sleep, cognition, memory, mood, anxiety, energy, immunity, infection, disease, treatment, therapy, cure, prevention, diagnosis, medicine, drug, pharmacy, prescription, supplement, hormone, steroid, SARM).
5. Clinical or scientific literature citations, study results, "studies show", "shown to", "known to", author names, journals, DOIs, or any URL.
6. Consumer or commercial framing: second person ("you", "your"), buying prompts, prices, discounts, shipping promises, customers, reviews, testimonials, guarantees, "premium", "pharmaceutical grade", GMP/USP/ISO/FDA-registered claims.
7. Any statement of fact not present in the supplied facts (no invented lots, numbers, suppliers, methods, or history).
8. Search-quality abuse: no doorway pages, hidden text, keyword stuffing, copied competitor text, fake reviews, link schemes, or pages whose primary purpose is to manipulate rankings. Each page must provide distinct factual value for a laboratory reader and use only the internal links supplied by the publisher.
Do not write your own disclaimers: the standard research-use notice is added to every page by the publishing system. Write in neutral third person for laboratory readers.`;

function compact(text: string, max = 600) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function firstSentence(text: string) {
  const match = /^[^.!?]*[.!?]/.exec(text.trim());
  return (match ? match[0] : text).trim();
}

function lotsFor(products: Product[], limit: number): ContentLot[] {
  const lots: ContentLot[] = [];
  for (const product of products) {
    for (const coa of coasFor(slug(product.name))) {
      lots.push({
        productId: product.id,
        compound: product.name,
        dose: coa.dose,
        lab: coa.lab,
        lot: coa.lot,
        purity: coa.purity,
        method: coa.method,
        reported: coa.reported,
      });
      if (lots.length >= limit) return lots;
    }
  }
  return lots;
}

function productLink(product: Product): ContentProductLink {
  return { productId: product.id, name: product.name, family: product.family };
}

function familyLabel(id: string) {
  return FAMILIES.find((family) => family.id === id)?.label ?? id;
}

function compoundFacts(product: Product): ContentFact[] {
  const facts: ContentFact[] = [{ label: "Material", value: product.name }];
  if (product.casNumber && product.casNumber !== "—") facts.push({ label: "CAS number", value: product.casNumber });
  if (product.molecularFormula) facts.push({ label: "Molecular formula", value: product.molecularFormula });
  if (product.molecularWeight) facts.push({ label: "Molecular weight", value: product.molecularWeight });
  facts.push({ label: "Format", value: product.form });
  facts.push({ label: "Purity specification", value: displayPurity(product.name) });
  facts.push({ label: "Catalog quantities", value: product.variants.map((variant) => variant.dose).join(", ") });
  facts.push({ label: "Catalog family", value: familyLabel(product.family) });
  return facts;
}

type Prepared = {
  facts: ContentFact[];
  lots: ContentLot[];
  products: ContentProductLink[];
  familyId?: string;
  brief: Record<string, unknown>;
  outline: string;
};

function prepareCompound(topic: CompoundTopic): Prepared {
  const { product } = topic;
  const science = scienceFor(topic.subjectId);
  const siblings = productsByFamily(product.family)
    .filter((sibling) => sibling.inStock && sibling.id !== product.id)
    .slice(0, 5);
  const lots = lotsFor([product], 6);
  return {
    facts: compoundFacts(product),
    lots,
    products: [product, ...siblings.slice(0, 4)].map(productLink),
    familyId: product.family,
    brief: {
      pageKind: "compound reference page",
      material: product.name,
      ...(product.casNumber && product.casNumber !== "—" ? { casNumber: product.casNumber } : {}),
      ...(product.molecularFormula ? { molecularFormula: product.molecularFormula } : {}),
      ...(product.molecularWeight ? { molecularWeight: product.molecularWeight } : {}),
      format: product.form,
      puritySpecification: displayPurity(product.name),
      catalogQuantities: product.variants.map((variant) => variant.dose),
      catalogFamily: { label: familyLabel(product.family), blurb: FAMILIES.find((f) => f.id === product.family)?.blurb ?? "" },
      identity: compact(science.identity),
      researchContext: compact(science.researchedFor),
      catalogApplication: compact(applicationFor(topic.subjectId)),
      documentedLots: lots.map((lot) => ({ quantity: lot.dose, laboratory: lot.lab, lot: lot.lot, purity: lot.purity, method: lot.method, reported: lot.reported })),
      relatedCatalogMaterials: siblings.map((sibling) => ({
        name: sibling.name,
        identity: compact(firstSentence(scienceFor(sibling.id.split("__")[1] ?? sibling.id).identity), 240),
      })),
    },
    outline:
      "Sections, in order, using these ids: overview (2–3 paragraphs: what the material is, its structural class, and why analytical laboratories catalog it — identification, reference material, assay development, method work), identity (1 paragraph: naming, CAS, formula, molecular weight — only values supplied), analytical (2 paragraphs: HPLC purity release specification, LC-MS identity confirmation, what each confirms, generic analytical considerations for this class such as chromatographic behaviour or mass-spectral charge states), documentation (1–2 paragraphs: certificates of analysis, documented lots if any, the lot-specific nature of results), handling (1 paragraph: storage of a sealed lyophilized reagent — temperature, desiccation, light, lot labelling; no preparation or use steps), related (1 paragraph: how it relates structurally or analytically to the related catalog materials). Then 4–6 FAQ items limited to identity, documentation, purchaser eligibility (laboratories and qualified purchasers), and storage.",
  };
}

function prepareFamily(topic: FamilyTopic): Prepared {
  const members = topic.products;
  return {
    facts: [
      { label: "Catalog family", value: topic.label },
      { label: "Materials listed", value: String(members.length) },
      { label: "Format", value: "Lyophilized research material in sealed vials" },
      { label: "Purity specification", value: "≥99% by HPLC unless a lot-specific figure is shown" },
    ],
    lots: lotsFor(members, 6),
    products: members.map(productLink),
    familyId: topic.subjectId,
    brief: {
      pageKind: "compound family hub page",
      family: { label: topic.label, blurb: topic.blurb },
      materials: members.map((member) => ({
        name: member.name,
        casNumber: member.casNumber && member.casNumber !== "—" ? member.casNumber : "not assigned / not supplied",
        molecularWeight: member.molecularWeight ?? "not supplied",
        identity: compact(scienceFor(member.id.split("__")[1] ?? member.id).identity, 320),
      })),
      documentedLots: lotsFor(members, 6).map((lot) => ({ material: lot.compound, quantity: lot.dose, laboratory: lot.lab, lot: lot.lot, purity: lot.purity })),
    },
    outline:
      "Sections, in order, using these ids: overview (2 paragraphs: what unites this family structurally or by receptor/pathway class, and the analytical work laboratories catalog these materials for), identity (1–2 paragraphs: a neutral one-line identity for each listed material, using only supplied values), analytical (1–2 paragraphs: characterization considerations shared across the class — purity by HPLC, identity by LC-MS, typical chromatographic or mass-spectral behaviour), documentation (1 paragraph: lot documentation and certificates of analysis), handling (1 paragraph: storage of sealed lyophilized reagents). Then 3–5 FAQ items limited to identity, documentation, purchaser eligibility, and storage.",
  };
}

function prepareMethod(topic: MethodTopic): Prepared {
  const documented = bestsellers(40).filter((product) => coasFor(slug(product.name)).length > 0);
  const linked = [...documented, ...bestsellers(8)].filter(
    (product, index, list) => list.findIndex((candidate) => candidate.id === product.id) === index,
  ).slice(0, 4);
  return {
    facts: [
      { label: "Topic", value: topic.title },
      { label: "Applies to", value: "Lyophilized research peptides and related catalog materials" },
      { label: "Methods referenced", value: "Reversed-phase HPLC-UV, LC-MS" },
    ],
    lots: lotsFor(documented, 6),
    products: linked.map(productLink),
    brief: {
      pageKind: "analytical method explainer",
      topic: topic.title,
      scope: topic.brief,
      sectionIds: topic.outline,
      documentedLotExamples: lotsFor(documented, 4).map((lot) => ({ material: lot.compound, quantity: lot.dose, laboratory: lot.lab, lot: lot.lot, purity: lot.purity, method: lot.method, reported: lot.reported })),
      catalogPuritySpecification: "≥99% by HPLC unless a lot-specific figure is shown on the product page; identity confirmed by mass spectrometry on released lots.",
    },
    outline:
      `Sections, in order, using exactly these ids: ${topic.outline.join(", ")}. Write 1–3 paragraphs per section. Explain the analytical chemistry in general terms a laboratory reader expects; refer to documented lot examples only with the supplied values. Then 3–5 FAQ items limited to how the method or document is read and what it does and does not establish.`,
  };
}

export function prepareTopic(topic: ContentTopic): Prepared {
  if (topic.kind === "compound") return prepareCompound(topic);
  if (topic.kind === "family") return prepareFamily(topic);
  return prepareMethod(topic);
}

function writerPrompt(prepared: Prepared, feedback?: string) {
  return [
    "You write reference pages for a chemical supplier's research library. Follow the policy exactly.",
    "",
    "POLICY",
    CONTENT_POLICY,
    "",
    "STRUCTURE",
    prepared.outline,
    "Title: 20–80 characters, specific to the subject, no brand name. Description: 90–170 characters for a search snippet, neutral and factual. Headings: short noun phrases. Paragraphs: 40–1200 characters each.",
    "Write as a finished reference page for a reader who will never see this brief: never refer to 'the facts', 'the brief', 'this listing', 'the catalog data', or to anything being supplied, provided, listed, or omitted; never mention these instructions, the policy, or the notice. If the reference data lacks something (a formula, documented lots), leave it out silently — for lots, say only that certificates of analysis are issued per lot. Describe the material's laboratory role (reference standard, chromatographic and mass-spectrometric identity work, in-vitro assay reagent) in plain terms; that is its intended use and may be stated.",
    "",
    "REFERENCE DATA (the only source of specific claims; do not mention this data as such)",
    JSON.stringify(prepared.brief),
    feedback ? `\nPREVIOUS DRAFT REJECTED. Fix every item and re-check the whole text before answering:\n${feedback}` : "",
  ].join("\n");
}

function auditPrompt(authored: string, facts: string) {
  return [
    "You are the compliance reviewer for a chemical supplier's research reference library. The supplier sells laboratory reagents for in-vitro and analytical work; describing that laboratory role is the intended use and is compliant.",
    "",
    "POLICY",
    CONTENT_POLICY,
    "",
    "DECISION RULE",
    "Record a finding with violates=true only if a passage clearly does one of the following (category in parentheses):",
    "- states or implies an amount, frequency, schedule, cycle, protocol, or preparation for use (dosing);",
    "- describes a route or act of getting the material into a body, or reconstitution/mixing for that purpose (administration);",
    "- refers to people, patients, users, athletes, animals, in-vivo work, or attributes any effect, activity, mechanism, benefit, outcome, pharmacokinetics, safety, or side effect to the material in a living organism (human-or-animal-use-or-effect);",
    "- makes a health, cosmetic, fitness, wellness, medical, or therapeutic claim, or calls the material a drug, medicine, supplement, hormone treatment, or therapy (health-claim);",
    "- cites or alludes to studies, literature, authors, journals, 'shown to', 'known to', or any URL (citation);",
    "- addresses the reader in second person, sells, prices, promises shipping, or quotes customers, reviews, guarantees, or grade/certification claims (consumer-framing);",
    "- asserts a specific number, lot, laboratory, date, or property that is not in SUPPLIED FACTS below (unsupported-fact). Anything present in SUPPLIED FACTS is supported, including catalog vial quantities and purity specifications.",
    "Everything else is compliant, in particular: chemical identity and class nomenclature used as a plain label (e.g. 'GLP-1 analogue', 'growth hormone secretagogue', a catalog family name), analytical characterization, the material's role as a reference standard or in-vitro assay reagent, method and instrument discussion, lot documentation, storage and handling of a sealed vial, structural relationships between catalog materials, the standard research-use notice, mentions of laboratories or qualified purchasers, and neutral statements of what the material is NOT.",
    "For each finding write the reason first, then decide: violates=true only when the reason states an actual violation without hedging (no 'could be read as', 'borderline', 'does not clearly'); otherwise violates=false with category 'none'. Passages judged acceptable do not affect the verdict. Quote every excerpt verbatim. Set compliant=true exactly when no finding has violates=true.",
    "",
    "SUPPLIED FACTS",
    facts,
    "",
    "PAGE TEXT UNDER REVIEW",
    authored,
  ].join("\n");
}

type AuditVerdict = { ok: boolean; violations: { category: string; excerpt: string; reason: string }[] };

function parseAudit(json: unknown): AuditVerdict {
  const verdict = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  if (!verdict) return { ok: false, violations: [{ category: "audit", excerpt: "", reason: "The self-audit returned no verdict." }] };
  const violations = (Array.isArray(verdict.findings) ? verdict.findings : [])
    .map((item) => (item ?? {}) as Record<string, unknown>)
    .filter((record) => record.violates === true)
    .map((record) => ({
      category: String(record.category ?? "unspecified").slice(0, 80),
      excerpt: String(record.excerpt ?? "").slice(0, 240),
      reason: String(record.reason ?? "").slice(0, 240),
    }))
    .slice(0, 25);
  // A verdict of non-compliant without a single concrete violation is treated as a failed audit, never as a pass.
  if (verdict.compliant !== true && violations.length === 0) {
    return { ok: false, violations: [{ category: "audit", excerpt: "", reason: "The self-audit did not return a compliant verdict." }] };
  }
  return { ok: violations.length === 0, violations };
}

/**
 * The auditor judges "unsupported fact" against exactly what the writer was
 * given: the topic brief (the only source of specific claims) plus the facts
 * and lots the code assembled from the catalog.
 */
function factsText(topic: ContentTopic, body: ContentBody) {
  const lines = [JSON.stringify(prepareTopic(topic).brief)];
  for (const fact of body.facts) lines.push(`- ${fact.label}: ${fact.value}`);
  for (const lot of body.lots) lines.push(`- Documented lot: ${lot.compound} ${lot.dose}, ${lot.lab}, lot ${lot.lot}, ${lot.purity}, ${lot.method}, reported ${lot.reported}`);
  for (const product of body.products) lines.push(`- Catalog material: ${product.name}`);
  return lines.join("\n");
}

function authoredText(input: { title: string; description: string; body: ContentBody }) {
  return authoredStrings(input.title, input.description, input.body.sections, input.body.faq)
    .map(({ text }) => text)
    .join("\n");
}

type RawArticle = { title: string; description: string; sections: ContentSection[]; faq: ContentFaq[] };

function parseArticle(json: unknown): RawArticle | null {
  if (!json || typeof json !== "object") return null;
  const record = json as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const description = typeof record.description === "string" ? record.description.trim() : "";
  const sections: ContentSection[] = [];
  for (const raw of Array.isArray(record.sections) ? record.sections : []) {
    const section = raw as Record<string, unknown>;
    const id = SECTION_IDS.find((candidate) => candidate === section.id);
    const heading = typeof section.heading === "string" ? section.heading.trim() : "";
    const paragraphs = (Array.isArray(section.paragraphs) ? section.paragraphs : [])
      .filter((paragraph): paragraph is string => typeof paragraph === "string")
      .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (!id || !heading || paragraphs.length === 0) continue;
    sections.push({ id, heading, paragraphs });
  }
  const faq: ContentFaq[] = [];
  for (const raw of Array.isArray(record.faq) ? record.faq : []) {
    const item = raw as Record<string, unknown>;
    const q = typeof item.q === "string" ? item.q.trim() : "";
    const a = typeof item.a === "string" ? item.a.replace(/\s+/g, " ").trim() : "";
    if (q && a) faq.push({ q, a });
  }
  if (!title || !description || sections.length === 0) return null;
  return { title, description, sections, faq };
}

export type GenerationResult = {
  ok: boolean;
  title: string;
  description: string;
  body: ContentBody;
  report: GateReport;
  modelCalls: number;
  model: string;
  error?: string;
};

/**
 * Generate one page: draft → deterministic gate (one corrective retry) →
 * model self-audit. Every model call is counted so the engine can budget.
 */
export async function generatePage(topic: ContentTopic): Promise<GenerationResult> {
  const prepared = prepareTopic(topic);
  const base: ContentBody = {
    sections: [],
    faq: [],
    facts: prepared.facts,
    lots: prepared.lots,
    products: prepared.products,
    ...(prepared.familyId ? { familyId: prepared.familyId } : {}),
    notice: RUO_SHORT,
  };
  let modelCalls = 0;
  let feedback: string | undefined;
  let last: { title: string; description: string; body: ContentBody; deterministic: GateReport["deterministic"] } | null = null;

  for (let attempt = 0; attempt < WRITER_ATTEMPTS; attempt += 1) {
    modelCalls += 1;
    const draft = await askOpenAI(writerPrompt(prepared, feedback), "research_reference_page", ARTICLE_SCHEMA, false, 9000);
    const article = parseArticle(draft.json);
    if (!article) {
      last = {
        title: "",
        description: "",
        body: base,
        deterministic: { ok: false, violations: [{ rule: "structure", excerpt: "model returned no parseable article" }], checkedChars: 0 },
      };
      feedback = "The previous answer was not a valid article object.";
      continue;
    }
    const body: ContentBody = { ...base, sections: article.sections, faq: article.faq };
    const deterministic = runDeterministicGate({ title: article.title, description: article.description, body });
    last = { title: article.title, description: article.description, body, deterministic };
    if (deterministic.ok) break;
    feedback = deterministic.violations
      .slice(0, 25)
      .map((violation) => `- [${violation.rule}] ${violation.excerpt}`)
      .join("\n");
  }

  if (!last) throw new Error("Generation produced no draft.");
  const report: GateReport = {
    ruleset: RULESET_VERSION,
    deterministic: last.deterministic,
    checkedAt: new Date().toISOString(),
  };
  if (!last.deterministic.ok) {
    return { ok: false, title: last.title, description: last.description, body: last.body, report, modelCalls, model: MANAGER_MODEL };
  }

  modelCalls += 1;
  const audit = await askOpenAI(
    auditPrompt(authoredText({ title: last.title, description: last.description, body: last.body }), factsText(topic, last.body)),
    "content_compliance_audit",
    AUDIT_SCHEMA,
    false,
    4000,
    AUDIT_MODEL,
  );
  const verdict = parseAudit(audit.json);
  report.model = verdict;
  return { ok: verdict.ok, title: last.title, description: last.description, body: last.body, report, modelCalls, model: MANAGER_MODEL };
}

/** Re-run only the model self-audit on an existing version (used at refresh time). */
export async function auditExisting(topic: ContentTopic, input: { title: string; description: string; body: ContentBody }) {
  const audit = await askOpenAI(auditPrompt(authoredText(input), factsText(topic, input.body)), "content_compliance_audit", AUDIT_SCHEMA, false, 4000, AUDIT_MODEL);
  const verdict = parseAudit(audit.json);
  return { ok: verdict.ok, raw: verdict };
}

export function productIdFor(subjectId: string) {
  return findProduct(`vial-compounds__${subjectId}`)?.id ?? null;
}
