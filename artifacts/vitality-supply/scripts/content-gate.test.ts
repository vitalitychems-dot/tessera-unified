import assert from "node:assert/strict";
import test from "node:test";
import { runDeterministicGate, scanText, RULESET_VERSION } from "../src/lib/content/compliance";
import { RUO_SHORT } from "../src/lib/legal";
import type { ContentBody } from "../src/lib/content/types";

const paragraph = (text: string) => `${text} The material is characterized by HPLC and LC-MS, and each lot ships with a certificate of analysis.`;

function compliantBody(): { title: string; description: string; body: ContentBody } {
  return {
    title: "Example peptide research material: identity and characterization",
    description:
      "Reference page for an example lyophilized research material: chemical identity, HPLC purity documentation, lot records, and storage notes for laboratory work.",
    body: {
      sections: [
        { id: "identity", heading: "Identity", paragraphs: [paragraph("Example peptide is a synthetic sequence supplied as a lyophilized powder for analytical work.")] },
        { id: "characterization", heading: "Analytical characterization", paragraphs: [paragraph("Purity is reported by reversed-phase HPLC and identity is confirmed by LC-MS against the expected mass.")] },
        { id: "storage", heading: "Storage and handling", paragraphs: [paragraph("Sealed vials are stored cold and protected from light; the material is not for human or animal use.")] },
      ],
      faq: [
        { q: "What documentation ships with each lot?", a: "Each lot ships with a third-party certificate of analysis reporting HPLC purity and LC-MS identity for the sample tested." },
        { q: "How is purity reported?", a: "Purity is expressed as area percent from reversed-phase HPLC on the lot-specific certificate of analysis." },
        { q: "Is this material restricted to laboratory work?", a: "Yes. It is a research reagent sold solely for laboratory, in-vitro, and analytical work and is not for human or animal use." },
      ],
      facts: [
        { label: "Material", value: "Example peptide" },
        { label: "CAS number", value: "0000-00-0" },
      ],
      lots: [],
      products: [{ productId: "example", name: "Example peptide" }],
      notice: RUO_SHORT,
    },
  };
}

test("a compliant reference page passes the deterministic gate", () => {
  const report = runDeterministicGate(compliantBody());
  assert.deepEqual(report.violations, []);
  assert.equal(report.ok, true);
  assert.ok(report.checkedChars > 500);
  assert.match(RULESET_VERSION, /^\d{4}-\d{2}-\d{2}\.\d+$/);
});

test("seeded dosing, administration, outcome, and consumer wording is rejected", () => {
  const seeded: [string, string][] = [
    ["dosing", "A typical dose of 250 mcg per day is dissolved before use."],
    ["dosing-or-preparation", "Reconstitute with 2 mL of bacteriostatic water and draw 10 units."],
    ["administration", "It is injected subcutaneously into the abdomen once daily."],
    ["cycle", "Most researchers run an 8 week cycle followed by a break."],
    ["outcome", "It promotes fat loss and improves recovery after training."],
    ["health claim", "It has been shown to reduce inflammation and support longevity."],
    ["human use", "Users report better sleep within the first week."],
    ["animal use", "Rats were given the compound to measure weight change."],
    ["consumer framing", "Shop the best deals and buy your supply today for personal use."],
    ["citation", "See https://pubmed.ncbi.nlm.nih.gov/12345678 for the clinical trial results."],
    ["clinical", "In a phase 2 clinical trial, patients tolerated the treatment well."],
    ["meta-commentary", "The molecular formula was not supplied, so it is omitted from the supplied facts."],
    ["meta-commentary", "Only values present in the provided facts are listed on this page."],
  ];
  for (const [label, sentence] of seeded) {
    const violations = scanText(sentence, label);
    assert.ok(violations.length > 0, `expected the gate to flag ${label}: "${sentence}"`);
  }
});

test("a seeded violation inside an otherwise clean page fails the whole page", () => {
  const input = compliantBody();
  input.body.faq[1] = { q: "How is it prepared?", a: "Dissolve the vial in 1 mL of sterile water and inject 0.2 mL twice a week for best results." };
  const report = runDeterministicGate(input);
  assert.equal(report.ok, false);
  assert.ok(report.violations.some((violation) => violation.excerpt.startsWith("faq[1]")));
});

test("negations and the research-use notice are not false positives", () => {
  const clean = [
    "Not for human or animal use, ingestion, administration, or diagnosis/treatment.",
    "This page contains no dosing, reconstitution, or administration guidance.",
    "The material is not a drug, not a dietary supplement, and not FDA approved.",
    RUO_SHORT,
  ];
  for (const sentence of clean) {
    assert.deepEqual(scanText(sentence), [], `unexpected violation in: "${sentence}"`);
  }
});

test("the standard notice and structural bounds are mandatory", () => {
  const missingNotice = compliantBody();
  missingNotice.body.notice = "Research use only.";
  assert.ok(runDeterministicGate(missingNotice).violations.some((violation) => violation.rule === "notice"));

  const thin = compliantBody();
  thin.body.sections = thin.body.sections.slice(0, 1);
  thin.body.faq = thin.body.faq.slice(0, 1);
  const report = runDeterministicGate(thin);
  assert.equal(report.ok, false);
  assert.ok(report.violations.filter((violation) => violation.rule === "structure").length >= 2);
});
