import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(root, path), "utf8");

test("catalog family slugs stay stable while visible labels use laboratory terminology", () => {
  const families = source("src/lib/families.ts");
  const home = source("src/routes/index.tsx");

  for (const id of ["metabolic", "tissue", "gh-axis", "mito", "neuro", "immune", "specialty"]) {
    assert.match(families, new RegExp(`id: "${id}"`));
    assert.match(home, new RegExp(`\\{ id: "${id}"`));
  }

  for (const legacyLabel of [
    "Metabolic analogues",
    "Tissue & copper peptides",
    "GH-axis analogues",
    "Mitochondrial & redox",
    "Immune-pathway peptides",
    "Specialty & blends",
  ]) {
    assert.doesNotMatch(families, new RegExp(legacyLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(home, new RegExp(legacyLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const label of [
    "Receptor-pathway compounds",
    "Peptide & copper compounds",
    "Peptide receptor ligands",
    "Cofactor & redox compounds",
    "Neuropeptide compounds",
    "Peptide assay compounds",
    "Analytical blends & materials",
  ]) {
    assert.match(families, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("public compound descriptions avoid outcome-oriented identity wording", () => {
  const science = source("src/lib/product-science.ts");

  for (const legacyPhrase of [
    "growth-hormone secretagogue",
    "sleep-inducing peptide",
    "topical research preparation",
    "Not offered as a consumer product",
  ]) {
    assert.doesNotMatch(
      science,
      new RegExp(legacyPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    );
  }
});

test("catalog identifiers and RUO notices remain intact", () => {
  const catalog = source("src/lib/catalog.ts");
  const families = source("src/lib/families.ts");
  const legal = source("src/lib/legal.ts");
  const emails = source("src/lib/newsletter/templates.ts");

  assert.match(catalog, /id: `\$\{category\}__\$\{id\}`/);
  for (const [compound, family] of [
    ["semaglutide", "metabolic"],
    ["bpc-157", "tissue"],
    ["nad", "mito"],
    ["selank", "neuro"],
    ["pt-141", "melanocortin"],
    ["ll-37", "immune"],
    ["reconstitution-water", "specialty"],
  ]) {
    assert.ok(
      families.includes(`${compound}: "${family}"`) ||
        families.includes(`"${compound}": "${family}"`),
      `family assignment for ${compound} should remain ${family}`,
    );
  }

  assert.match(legal, /Research use only \(RUO\)/);
  assert.match(legal, /Not for human or animal use/);
  assert.match(legal, /Not FDA approved/);
  assert.match(legal, /does not establish regulatory legality/);
  assert.match(emails, /For research use only\. Not for human or animal consumption/);
});

test("empty public sets, chatbot copy, offers, and static metadata stay research-only", () => {
  const catalog = source("src/lib/catalog.ts");
  const chat = source("src/components/research-chat.tsx");
  const header = source("src/components/site-header.tsx");
  const newsletterPopup = source("src/components/newsletter-popup.tsx");
  const newsletterTemplates = source("src/lib/newsletter/templates.ts");
  const subscriptions = source("src/routes/subscriptions.tsx");
  const promo = source("src/lib/promo.ts");
  // llms.txt is served dynamically from the crawl builder, so the wording lives in source.
  const llms = source("src/lib/content/crawl.ts");
  const robots = source("public/robots.txt");

  assert.match(catalog, /export const RESEARCH_SETS: ResearchSet\[\] = \[\];/);
  assert.match(chat, /Research desk\./);
  assert.match(chat, /I can look up compounds, COA, shipping, and research-use terms/);
  assert.match(chat, /not a protocol/);

  const publicCopy = [
    header,
    newsletterPopup,
    newsletterTemplates,
    subscriptions,
    promo,
  ].join("\n");
  assert.doesNotMatch(publicCopy, /weight.?loss|fat.?loss|anti.?aging|longevity|recovery|bodybuilding|beauty|muscle/i);

  assert.match(llms, /RUO_SHORT/);
  assert.match(source("src/lib/legal.ts"), /Not for human or animal use/);
  assert.match(llms, /does not establish regulatory legality|RUO_SHORT/);
  assert.match(robots, /Sitemap: https:\/\/vitalitychems\.com\/sitemap\.xml/);
  assert.match(robots, /User-agent: GPTBot/);
});