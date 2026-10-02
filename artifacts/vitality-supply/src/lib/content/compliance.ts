/**
 * Deterministic compliance gate for generated research-reference pages.
 *
 * The site sells laboratory materials for in-vitro and analytical work. Pages
 * may describe identity, chemistry, analytical characterization, lot
 * documentation, and storage/handling of a reagent. They may never describe
 * or imply dosing, administration, reconstitution steps, cycles/stacks,
 * protocols, outcomes, health or cosmetic effects, human or animal use, or
 * consumer framing. This gate is intentionally conservative: a false positive
 * costs one regeneration, a false negative costs the business.
 *
 * Both this gate and the model self-audit must pass before a version is ever
 * served; a later failure of this gate (e.g. after a ruleset update) unpublishes
 * the page automatically. Bump RULESET_VERSION whenever the rules change so the
 * scheduler re-checks every published version against the new rules.
 */
import { RUO_SHORT } from "@/lib/legal";
import type { ContentBody, ContentFaq, ContentSection, GateReport, GateViolation } from "./types";

export const RULESET_VERSION = "2026-09-15.2";

/**
 * Phrases that legitimately contain otherwise-banned words. They are removed
 * before scanning. Keep this list short and literal: every entry is a phrase
 * that describes what the material is NOT, or a proper noun from the catalog.
 */
const ALLOWED_PHRASES: RegExp[] = [
  // The standard notice (and its key clause) may be quoted verbatim; longest phrases first.
  new RegExp(escapeRegExp(normalize(RUO_SHORT)), "g"),
  /\bnot for human or animal use, ingestion, administration, or diagnosis\/treatment\b/g,
  /\breconstitution water\b/g,
  /\bsafety data sheets?\b/g,
  /\bresearch[- ]use[- ]only\b/g,
  /\bfor research use\b/g,
  /\bnot for human or animal (use|consumption)\b/g,
  /\bnot for (human|animal|clinical|veterinary|diagnostic|therapeutic|consumer|cosmetic)(,? (or )?(human|animal|clinical|veterinary|diagnostic|therapeutic|consumer|cosmetic))* (use|consumption|application|purposes)\b/g,
  /\bnot fda[- ]approved\b/g,
  /\bnot approved by the (u\.?s\.? )?(food and drug administration|fda)\b/g,
  /\bnot (a|an) (medicine|medication|drug|finished drug product|dietary supplement|supplement|medical device|cosmetic|food)\b/g,
  /\bnot (medicines|medications|drugs|dietary supplements|supplements|medical devices|cosmetics|foods)\b/g,
  /\bnot intended to (diagnose|treat|cure|or prevent|prevent)( any disease)?\b/g,
  /\b(no|without|not|never) (an? )?(administration|dosing|dosage|reconstitution|preparation|use|usage|application)((, | or |, or )(administration|dosing|dosage|reconstitution|preparation|use|usage|application))* (protocols?|instructions?|guidance|directions|recommendations?|information|steps|advice)\b/g,
  /\bnot (directions|instructions|guidance|a protocol|protocols|a recommendation) for (use|preparation|administration)\b/g,
  /\bno (human|animal|clinical|veterinary|consumer) (use|application)\b/g,
  /\bmolecular weight\b/g,
  /\bmolecular[- ]weight\b/g,
  /\bformula weight\b/g,
  /\bweight[- ]average\b/g,
  /\bnet weight\b/g,
  /\bfatty acids?\b/g,
  /\benergy metabolism\b/g,
  /\bstorage conditions?\b/g,
  /\bchromatographic conditions?\b/g,
  /\banalytical conditions?\b/g,
  /\bambient conditions?\b/g,
  /\bfreeze[- ]thaw cycles?\b/g,
  /\b(temperature|thermal) cycl\w*\b/g,
  /\bionic strength\b/g,
  /\bsignal strength\b/g,
  /\b(column|method|system|chromatographic|instrument|separation|assay|analytical) performance\b/g,
  /\bprevent(s|ed|ing)? (moisture|water|contamination|degradation|light exposure|oxidation|hydrolysis|condensation|cross-contamination|repeated freez\w*|adsorption)\b/g,
  /\bimprov\w* (peak|resolution|separation|signal|column|method|chromatographic|sensitivity)\b/g,
  /\benhanc\w* (detection|sensitivity|resolution|ionization|signal)\b/g,
  /\boptimi[sz]\w* (gradient|method|separation|chromatographic|ionization|conditions|mobile phase)\b/g,
  /\buv absor\w*\b/g,
  /\babsorbance\b/g,
  /\b(of|the|to|native|endogenous|synthetic|recombinant|full-length|truncated|modified) human\b/g,
  /\banimal[- ](derived|free|origin)\b/g,
  /\bdrug[- ](discovery|development)\b/g,
  /\b(not|no|never|without) (a |an |any )?guarantee[sd]?\b/g,
  /\bdoes not guarantee\b/g,
  /\bthird[- ]party (coa|certificate|laboratory|lab|analysis|testing)\b/g,
  /\binsulin-like growth factor\b/g,
  /\bantimicrobial peptide (class|family|classes|families)\b/g,
  /\bgrowth[- ]hormone[- ]releasing hormone\b/g,
  /\bmelanocyte[- ]stimulating hormone\b/g,
  /\bthyrotropin[- ]releasing hormone\b/g,
  /\bvasoactive intestinal (peptide|polypeptide)\b/g,
  /\bglucagon[- ]like peptide\b/g,
  /\bglucose[- ]dependent insulinotropic (peptide|polypeptide)\b/g,
  /\bnicotinamide adenine dinucleotide\b/g,
  /\bmitochondrial[- ]derived\b/g,
  /\bmelanocortin receptor\w*\b/g,
  /\breceptor[- ]binding\b/g,
  /\bresearch (context|catalog|library|reference|materials?|compounds?|peptides?|reagents?|use|laborator(y|ies))\b/g,
  /\banalytical (results?|reporting|report|method|methods)\b/g,
  /\b(hplc|lc-ms|assay|test|chromatogra\w+|analysis|analytical|measurement|purity|identity|lot|coa|certificate) results?\b/g,
  /\bresults? (apply|applies|reported|refer|of the (analysis|assay|test|run|injection))\b/g,
  /\bthe (result|results) (section|column|field|line)\b/g,
  /\bvitality (chems|supply)\b/g,
];

type Rule = { id: string; pattern: RegExp };

/**
 * Banned language, grouped by policy category. Patterns run against a
 * lower-cased, whitespace-normalised copy of the text with ALLOWED_PHRASES
 * removed. Each match is reported with a bounded excerpt.
 */
export const BANNED_RULES: Rule[] = [
  {
    // The writer must produce a finished page, not narrate its brief.
    id: "meta-commentary",
    pattern:
      /\b((was|were|is|are) not (been )?(supplied|provided|given|listed in the facts)|(supplied|provided) (facts|brief|information|data|catalog set|catalog data|values)|(in|per|from|within|beyond) the (supplied|provided|available|listed) (facts|catalog set|brief|data|identity facts)|these instructions|the policy|this (page|entry) (identifies|states|lists|describes) only)\b/g,
  },
  {
    id: "human-or-animal-use",
    pattern:
      /\b(patients?|participants?|volunteers?|athletes?|bodybuild\w*|users?|consumers?|people|persons?|adults?|men|women|children|kids|humans|in human|human (use|body|bodies|studies|study|trials?|data|subjects?|consumption|health|application|volunteers?|patients?|clinical|testing|tissue samples from)|animals?|mice|mouse|rats?|rodents?|dogs?|cats?|horses?|livestock|pets?|in[- ]vivo)\b/g,
  },
  {
    id: "administration",
    pattern:
      /\b(inject\w*|injections?|syringes?|needles?|subcutaneous\w*|subq|intramuscular\w*|intravenous\w*|intranasal\w*|nasal\w*|oral(ly)?|sublingual\w*|buccal|topical(ly)?|transdermal\w*|ingest\w*|swallow\w*|consum(e|ed|es|ing)|consumption|administ\w*|self-administ\w*|apply (to|on) (the )?skin|absorbed (into|through|by)|absorption (rate|into|through)|bioavailab\w*|half-life|pharmacokinetic\w*|pharmacodynamic\w*|onset of action|peak (levels?|effects?|plasma)|route of (administration|delivery)|delivery (route|method|system))\b/g,
  },
  {
    id: "dosing-or-preparation",
    pattern:
      /\b(dos(e|es|ed|ing|age|ages)|microdos\w*|mcg|µg|iu\b|units? per|per kg|mg\/kg|per (day|week|month|dose|injection)|(once|twice|three times) (a|per) (day|week)|daily|weekly|nightly|every (day|other day|week|morning|night)|before bed|at bedtime|regimen|titrat\w*|loading (phase|dose)|maintenance (phase|dose)|cycle[sd]?|cycling|stack(s|ed|ing)?|protocols?|schedule[sd]?|how to (use|take|mix|prepare|inject|reconstitute|dose|administer|apply)|how often|how much (to|should|do|per)|reconstitut(e|ed|es|ing|ion)|bacteriostatic water|sterile water for injection|draw(ing)? up|dilut(e|ed|es|ing|ion) (for|before|prior to) (use|administration|injection)|calculator|calculate the dose|mixing (instructions?|guide)|preparation (instructions?|guide|steps)|(usage|use) (instructions?|guide|guidelines|directions)|instructions for use|directions for use)\b/g,
  },
  {
    id: "outcome-or-health-claim",
    pattern:
      /\b(weight[- ](loss|management|reduction|control|gain)|body[- ]weight|lose weight|losing weight|fat[- ](loss|burning|reduction)|body fat|appetite|satiety|food intake|caloric|calories?|obes\w*|diabet\w*|glycemic|blood (sugar|glucose|pressure)|glucose (control|levels?|tolerance)|insulin (resistance|sensitivity|levels?)|muscle\w*|lean mass|strength|endurance|stamina|performance|recovery|recover(s|ed|ing)?|heal(s|ed|ing)?|wounds?|injur\w*|tendons?|ligaments?|joints?|cartilage|gut|intestinal (repair|barrier|health)|pain|inflammat\w*|anti[- ]?inflammatory|anti[- ]?aging|aging|age[- ]related|longevity|lifespan|healthspan|wrinkles?|fine lines|skin(s|care)?|complexion|collagen (production|synthesis|stimulation)|hair (growth|loss|regrowth)|tan(s|ned|ning)?|pigment\w*|sunless|libido|sexual\w*|erectile|arousal|sleep\w*|insomnia|cognit\w*|memory|mood|anxiety|anxiolytic|depress\w*|stress (relief|reduction|response)|energy (levels?|boost)|more energy|boost(s|ed|ing)? energy|fatigue|immune\w*|immunity|infections?|antibiotics?|antiviral|disease[sd]?|disorders?|syndromes?|(medical|health) conditions?|conditions? such as|symptom\w*|diagnos\w*|treat(s|ed|ing|ment|ments|able)?|therap\w*|cure[sd]?|curing|prevent(s|ed|ing|ion|ative)?|remed\w*|relie(f|ve|ves|ved|ving)|benefit\w*|effective(ness|ly)?|efficacy|efficacious|potent|potency|powerful|improve\w*|enhanc\w*|boost\w*|optimi[sz]\w*|support(s|ing|ed)? (healthy|your|the body|overall)|wellness|well-being|wellbeing|health(y|ier|ful)?|rejuvenat\w*|regenerat\w*|repair\w*|restor(e|es|ed|ing|ative)|renew\w*|before[- ]and[- ]after|testimonial\w*|customers? (love|report|say)|safe(ly)? (to|for)|is safe|are safe|safe and effective|proven safe|safety (profile|data|studies|study|trials?|record)|side[- ]effects?|adverse|tolerab\w*|toxicity|overdos\w*|contraindicat\w*|pregnan\w*|breastfeed\w*|prescription\w*|prescrib\w*|pharmac(y|ies|ist)|pharmaceutical\w*|medicines?|medications?|medical (use|advice|purposes|treatment|supervision)|drugs?|compounding|compounded|doctors?|physicians?|clinic\w*|trials?|placebo|randomi[sz]ed|double[- ]blind|cohorts?|case (study|studies|report)|meta-analys\w*|systematic review|(fda|ema)[- ]approved|approved (by|for|drug)|indicated for|off[- ]label|supplement\w*|nutraceutical\w*|dietary|diet(s|ing)?|nootropic\w*|peptide therapy|hormones?|hrt|trt|steroid\w*|sarms?|doping|wada|biohack\w*|gym|workouts?|fitness|athletic|physique|anabolic|growth factor (levels?|release)|gh (release|levels?|pulse)|(elevat|increas|rais|lower|reduc|decreas)(e|es|ed|ing) (the )?(levels?|release|secretion|production) of|(promot|stimulat|induc|trigger)(e|es|ed|ing) (the )?(release|secretion|production|growth|repair|healing|synthesis) of|results? (in|within|after) \d+|(real|visible|noticeable|fast|quick|dramatic|amazing|proven) results?|see results|works? (fast|quickly|wonders)|life[- ]changing|game[- ]changer)\b/g,
  },
  {
    id: "unsubstantiated-claim",
    pattern:
      /\b(gmp|cgmp|usp[- ](grade|verified)|fda[- ](registered|inspected|cleared|authorized|licensed)|iso[- ]?\d{4,5}|iso[- ]certified|third[- ]party (verified|certified)|independently (verified|certified)|guaranteed purity|100% pure|pharma[- ]grade|medical[- ]grade|clinical[- ]grade|human[- ]grade|highest (purity|quality)|purest|best quality|premium|lab[- ]tested by)\b/g,
  },
  {
    id: "consumer-framing",
    pattern:
      /\b(your (body|health|goals?|journey|routine|results|progress|needs|lifestyle|wellness|skin|weight|life)|for (you|yourself|beginners|men|women|sale)|buy now|shop now|order now|add to cart|best (price|prices|deal|deals|value)|cheap(est|er)?|affordable|discount\w*|on sale|coupon\w*|promo\w*|free shipping|(same[- ]day|next[- ]day|fast|free|discreet) (dispatch|shipping|delivery)|ships? (today|fast|free)|prices?|priced|pricing|costs?|wholesale|bulk (discount|pricing)|money[- ]back|guarantee[sd]?|customers?|shoppers?|bestsell\w*|top[- ]rated|trusted by|thousands of|satisfaction|lifestyle|(customer|product|verified) reviews?|5[- ]star|star rating|beginner'?s? guide|ultimate guide|everything you need to know)\b/g,
  },
  {
    id: "external-citation-or-link",
    pattern:
      /(https?:\/\/|\bwww\.|\bdoi\.org\b|\bdoi:|\bpubmed\b|\bpmid\b|\bet al\.?|\bjournal of\b|\bpublished in\b|\baccording to (a|the) (study|paper|report|article|review)|\bstudies (show|have shown|suggest|demonstrate|indicate|found)|\bresearch (shows|has shown|suggests|demonstrates|indicates|found)|\bevidence (shows|suggests|indicates)|\bhas been shown to\b|\bhave been shown to\b|\bshown to\b|\bproven to\b|\bdemonstrated to\b)/g,
  },
];

const MAX_TOTAL_CHARS = 24_000;
const MAX_PARAGRAPH_CHARS = 1_400;
const MAX_TITLE_CHARS = 90;
const MIN_DESCRIPTION_CHARS = 40;
const MAX_DESCRIPTION_CHARS = 180;
const MAX_FAQ_ANSWER_CHARS = 700;
const MAX_FAQ_QUESTION_CHARS = 160;

function normalize(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

function stripAllowed(text: string) {
  let out = text;
  for (const phrase of ALLOWED_PHRASES) out = out.replace(phrase, " ");
  return out;
}

function excerptAround(text: string, index: number, length: number) {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + length + 40);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

/** Scan free text; returns every banned-term hit with a short excerpt. */
export function scanText(text: string, label = "text"): GateViolation[] {
  const normalized = stripAllowed(normalize(text));
  const violations: GateViolation[] = [];
  for (const rule of BANNED_RULES) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    let hits = 0;
    while ((match = rule.pattern.exec(normalized)) && hits < 5) {
      hits += 1;
      violations.push({
        rule: rule.id,
        excerpt: `${label}: ${excerptAround(normalized, match.index, match[0].length)}`,
      });
      if (match[0].length === 0) rule.pattern.lastIndex += 1;
    }
  }
  return violations;
}

/** Every model-authored string on a page, labelled for the report. */
export function authoredStrings(
  title: string,
  description: string,
  sections: ContentSection[],
  faq: ContentFaq[],
): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [
    { label: "title", text: title },
    { label: "description", text: description },
  ];
  sections.forEach((section, index) => {
    out.push({ label: `section[${index}].heading`, text: section.heading });
    section.paragraphs.forEach((paragraph, p) =>
      out.push({ label: `section[${index}].paragraph[${p}]`, text: paragraph }),
    );
  });
  faq.forEach((item, index) => {
    out.push({ label: `faq[${index}].q`, text: item.q });
    out.push({ label: `faq[${index}].a`, text: item.a });
  });
  return out;
}

export type GateInput = {
  title: string;
  description: string;
  body: ContentBody;
};

/**
 * Run the deterministic gate: banned language across every authored string,
 * structural bounds, and the mandatory research-use notice.
 */
export function runDeterministicGate(input: GateInput): GateReport["deterministic"] {
  const violations: GateViolation[] = [];
  const strings = authoredStrings(input.title, input.description, input.body.sections, input.body.faq);
  let checkedChars = 0;
  for (const entry of strings) {
    checkedChars += entry.text.length;
    violations.push(...scanText(entry.text, entry.label));
  }

  if (input.title.trim().length < 12 || input.title.length > MAX_TITLE_CHARS) {
    violations.push({ rule: "structure", excerpt: `title length ${input.title.length} outside 12–${MAX_TITLE_CHARS}` });
  }
  if (input.description.length < MIN_DESCRIPTION_CHARS || input.description.length > MAX_DESCRIPTION_CHARS) {
    violations.push({
      rule: "structure",
      excerpt: `description length ${input.description.length} outside ${MIN_DESCRIPTION_CHARS}–${MAX_DESCRIPTION_CHARS}`,
    });
  }
  if (input.body.sections.length < 3 || input.body.sections.length > 8) {
    violations.push({ rule: "structure", excerpt: `${input.body.sections.length} sections (expected 3–8)` });
  }
  input.body.sections.forEach((section, index) => {
    if (!section.heading.trim() || section.paragraphs.length === 0) {
      violations.push({ rule: "structure", excerpt: `section[${index}] is empty` });
    }
    section.paragraphs.forEach((paragraph, p) => {
      if (paragraph.trim().length < 40 || paragraph.length > MAX_PARAGRAPH_CHARS) {
        violations.push({
          rule: "structure",
          excerpt: `section[${index}].paragraph[${p}] length ${paragraph.length} outside 40–${MAX_PARAGRAPH_CHARS}`,
        });
      }
    });
  });
  if (input.body.faq.length < 3 || input.body.faq.length > 6) {
    violations.push({ rule: "structure", excerpt: `${input.body.faq.length} FAQ items (expected 3–6)` });
  }
  input.body.faq.forEach((item, index) => {
    if (item.q.length > MAX_FAQ_QUESTION_CHARS || item.a.length > MAX_FAQ_ANSWER_CHARS || item.a.trim().length < 30) {
      violations.push({ rule: "structure", excerpt: `faq[${index}] outside length bounds` });
    }
  });
  if (checkedChars > MAX_TOTAL_CHARS) {
    violations.push({ rule: "structure", excerpt: `${checkedChars} authored characters exceed ${MAX_TOTAL_CHARS}` });
  }
  if (input.body.notice !== RUO_SHORT) {
    violations.push({ rule: "notice", excerpt: "page body does not carry the standard research-use notice" });
  }
  return { ok: violations.length === 0, violations, checkedChars };
}

/** Text handed to the model self-audit: everything a visitor reads, in order. */
