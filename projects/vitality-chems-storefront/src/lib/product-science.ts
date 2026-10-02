import { IL_NOTICE } from "./business";

const DEFAULT_APPLICATION =
  "Defined research compound supplied for laboratory identification, assay development, and analytical method work. Research use only — not for human or animal use.";

export type CompoundScience = {
  identity: string;
  researchedFor: string;
  disclaimer: string;
};

const DEFAULT_SCIENCE: CompoundScience = {
  identity:
    "A defined research compound supplied as a laboratory material for identification, assay development, and analytical method work.",
  researchedFor:
    "Published experimental literature has examined related structural analogues in controlled in-vitro and non-clinical models. Those publications are not directions for use of this material and do not make this material a medicine.",
  disclaimer: IL_NOTICE,
};

const SCIENCE: Record<string, Partial<CompoundScience>> = {
  semaglutide: {
    identity:
      "Semaglutide is a synthetic GLP-1 receptor analogue supplied as lyophilized powder in a sealed research vial. CAS 910463-68-2. It is an analytical material, not a finished drug product.",
    researchedFor:
      "Laboratory literature describes GLP-1 receptor binding, chromatographic method development, and in-vitro incretin-pathway assays. This listing does not offer the compound for metabolic, weight, or clinical use.",
  },
  tirzepatide: {
    identity:
      "Tirzepatide is a dual GIP/GLP-1 receptor analogue supplied lyophilized for laboratory identification. CAS 2023788-19-2.",
    researchedFor:
      "Experimental papers use dual incretin analogues in receptor-binding and HPLC identity work. Nothing here is a protocol for human administration.",
  },
  retatrutide: {
    identity:
      "Retatrutide is a triple GIP/GLP-1/glucagon receptor analogue supplied as a lyophilized research material.",
    researchedFor:
      "Non-clinical literature examines multi-agonist incretin analogues in receptor assays and analytical characterization. Not offered as a treatment or consumer product.",
  },
  mazdutide: {
    identity:
      "Mazdutide is an oxyntomodulin analogue (GLP-1/glucagon) supplied for in-vitro receptor-binding and chromatographic identification.",
    researchedFor:
      "Published work on dual GLP-1/glucagon analogues is limited to experimental models. This material is not a medicine.",
  },
  survodutide: {
    identity:
      "Survodutide is a dual GLP-1/glucagon receptor agonist analogue supplied as lyophilized powder for laboratory use.",
    researchedFor:
      "Research use includes receptor studies and HPLC method development. Not for clinical, veterinary, or consumer use.",
  },
  "bpc-157": {
    identity:
      "BPC-157 is a synthetic pentadecapeptide (CAS 137525-51-0) supplied lyophilized for laboratory identification.",
    researchedFor:
      "Experimental literature has studied this sequence in cell-culture and animal models of tissue and gastric pathways. Those models are not instructions for use of this vial.",
  },
  "tb-500": {
    identity:
      "TB-500 is a thymosin beta-4 fragment analogue supplied as lyophilized powder for laboratory work.",
    researchedFor:
      "Published assays examine cytoskeletal organization and cell-migration pathways in vitro. This is not a wound-care product.",
  },
  "bpc-tb-blend": {
    identity:
      "A defined two-compound blend of BPC-157 and TB-500 (also labeled Wolverine on some lots) for comparative laboratory assay work.",
    researchedFor:
      "Used when a lab needs both fragment analogues in a single vial for method development. Not a therapeutic combination.",
  },
  wolverine: {
    identity:
      "BPC-157 / TB-500 10 mg/10 mg blend. Same defined materials as the BPC/TB Blend listing.",
    researchedFor:
      "Comparative tissue-pathway assays and chromatographic identity work. Research use only.",
  },
  klow: {
    identity:
      "Multi-compound blend of GHK-Cu, BPC-157, TB-500 and KPV supplied for laboratory comparison.",
    researchedFor:
      "Intended for labs running parallel copper-peptide and fragment identity methods. Not a cosmetic or injectable product.",
  },
  glow: {
    identity:
      "Three-compound blend (BPC-157, TB-500, GHK-Cu) supplied lyophilized for comparative assay work.",
    researchedFor:
      "Copper-peptide and fragment analogue characterization in vitro. Not for skin, clinical, or consumer use.",
  },
  "cjc-1295-w-o-dac-ipamorelin": {
    identity:
      "Paired GHRH analogue (CJC-1295 without DAC) and ghrelin-mimetic (ipamorelin) in one research vial.",
    researchedFor:
      "Co-assay, chromatographic separation, and receptor-binding studies. Not a secretagogue product for people.",
  },
  "ghk-cu": {
    identity:
      "GHK-Cu is a copper-tripeptide complex (CAS 89030-95-5) supplied for peptide–metal characterization.",
    researchedFor:
      "In-vitro work on copper-peptide coordination and analytical methods. Not a cosmetic cream unless the listing is the topical research preparation, which remains RUO.",
  },
  nad: {
    identity:
      "Nicotinamide adenine dinucleotide, oxidized form (NAD+), supplied as a laboratory redox cofactor standard.",
    researchedFor:
      "Enzymatic assay calibration, redox studies, and identity confirmation. Not a supplement.",
  },
  tesamorelin: {
    identity: "Tesamorelin is a GHRH analogue supplied lyophilized for laboratory receptor work.",
    researchedFor:
      "Receptor-binding and chromatographic identity confirmation. Not offered as a clinical GHRH product.",
  },
  ipamorelin: {
    identity: "Ipamorelin is a selective ghrelin-receptor analogue for in-vitro binding assays.",
    researchedFor:
      "Peptide identification and ghrelin-receptor studies in laboratory systems. Not for human use.",
  },
  "aod-9604": {
    identity: "AOD-9604 is a C-terminal hGH fragment analogue supplied for analytical characterization.",
    researchedFor:
      "Laboratory assay development around growth-hormone fragment identity. Not a fat-loss product.",
  },
  "mots-c": {
    identity: "MOTS-c is a mitochondrial-derived peptide supplied for in-vitro metabolic-pathway studies.",
    researchedFor: "Identification and pathway assays in cell systems. Not a metabolic drug.",
  },
  glutathione: {
    identity: "Glutathione (γ-glutamyl-cysteinyl-glycine) as a thiol standard for laboratory calibration.",
    researchedFor: "Redox assay calibration and HPLC method work. Not an injectable or supplement.",
  },
  "pt-141": {
    identity: "PT-141 (bremelanotide analogue) is a melanocortin-receptor analogue for binding assays.",
    researchedFor:
      "Melanocortin receptor identification in vitro. Not offered for sexual-medicine or consumer use.",
  },
  "5-amino-1mq": {
    identity: "5-Amino-1MQ is a small-molecule NNMT-pathway research compound.",
    researchedFor: "In-vitro enzymatic assays and analytical identification. Not a weight-loss capsule.",
  },
  sermorelin: {
    identity: "Sermorelin is GHRH (1-29) analogue for laboratory receptor studies.",
    researchedFor: "Peptide identity confirmation and receptor-binding work. Not a clinical secretagogue.",
  },
  "cjc-1295-no-dac": {
    identity: "Modified GHRH analogue without DAC, supplied lyophilized.",
    researchedFor: "In-vitro receptor-binding and HPLC method development.",
  },
  "cjc-1295-with-dac": {
    identity: "CJC-1295 with DAC (drug-affinity complex) analogue for laboratory characterization.",
    researchedFor: "Comparative GHRH-analogue assays. Research use only.",
  },
  "frag-176-191": {
    identity: "hGH fragment 176–191 analogue for analytical characterization.",
    researchedFor: "Laboratory assay work on growth-hormone fragments. Not a fat-loss agent.",
  },
  epithalon: {
    identity: "Epithalon (Ala-Glu-Asp-Gly) tetrapeptide analogue.",
    researchedFor:
      "Experimental pineal-pathway and aging-model assays in laboratory settings. Not a longevity supplement.",
  },
  "ghrp-2": {
    identity: "GHRP-2 is a ghrelin-mimetic hexapeptide for receptor-binding assays.",
    researchedFor: "Chromatographic identification and in-vitro receptor studies.",
  },
  "ghrp-6": {
    identity: "GHRP-6 is a ghrelin-mimetic hexapeptide supplied for laboratory receptor work.",
    researchedFor: "In-vitro secretagogue-receptor assays. Not for human use.",
  },
  hexarelin: {
    identity: "Hexarelin is a growth-hormone secretagogue analogue for laboratory binding assays.",
    researchedFor: "Receptor identification work. Not a clinical product.",
  },
  "igf-1-lr3": {
    identity: "Long R3 IGF-1 analogue for in-vitro receptor studies.",
    researchedFor: "Peptide characterization in cell-culture systems. Not for human or animal use.",
  },
  cagrilintide: {
    identity: "Cagrilintide is an amylin analogue for laboratory receptor-assay development.",
    researchedFor: "Amylin-pathway identification in vitro. Not a medicine.",
  },
  selank: {
    identity: "Selank is a tuftsin-derived heptapeptide for neuropeptide assay work.",
    researchedFor: "In-vitro neuropeptide identification. Not an anxiolytic drug.",
  },
  semax: {
    identity: "Semax is an ACTH (4-10) analogue for laboratory neuropeptide characterization.",
    researchedFor: "Assay development in neural-peptide models. Not a nootropic product.",
  },
  kisspeptin: {
    identity: "Kisspeptin-10 analogue for GnRH-pathway receptor assays.",
    researchedFor: "Chromatographic identification and receptor work. Not a fertility drug.",
  },
  "ll-37": {
    identity: "LL-37 is a cathelicidin-derived peptide for in-vitro antimicrobial-peptide characterization.",
    researchedFor: "Assay work on host-defense peptides. Not an antibiotic for people.",
  },
  kpv: {
    identity: "KPV is the C-terminal α-MSH fragment (Lys-Pro-Val) for laboratory identification.",
    researchedFor: "Peptide assay development. Not an anti-inflammatory medicine.",
  },
  "ss-31": {
    identity: "SS-31 (elamipretide analogue) is a mitochondria-targeted tetrapeptide.",
    researchedFor: "In-vitro organelle and peptide-identity studies. Not a mitochondrial drug.",
  },
  "slu-pp-332": {
    identity: "SLU-PP-332 is an ERR agonist research compound for in-vitro receptor assays.",
    researchedFor: "Analytical identification of ERR ligands. Not a performance product.",
  },
  "mt-2": {
    identity: "Melanotan-2 analogue for melanocortin receptor-binding assays.",
    researchedFor: "Chromatographic method development. Not a tanning product.",
  },
  "melanotan-1": {
    identity: "Melanotan-1 (afamelanotide analogue) for laboratory melanocortin-receptor studies.",
    researchedFor: "Identity confirmation in vitro. Not for pigmentation or consumer use.",
  },
  orforglipron: {
    identity: "Non-peptide GLP-1 receptor agonist analogue supplied as an encapsulated research solid.",
    researchedFor: "In-vitro binding assays and analytical work. Not a prescription tablet.",
  },
  tesofensine: {
    identity: "Triple monoamine reuptake research compound for in-vitro assay work.",
    researchedFor: "Analytical identification. Not an appetite or weight product.",
  },
  enclomiphene: {
    identity: "Trans-isomer SERM analogue for laboratory receptor-binding work.",
    researchedFor: "Chromatographic and receptor studies. Not a hormone therapy.",
  },
  nmn: {
    identity: "Nicotinamide mononucleotide for enzymatic assay calibration.",
    researchedFor: "Analytical identification of NAD-pathway intermediates. Not a supplement.",
  },
  dihexa: {
    identity: "Angiotensin IV analogue for in-vitro receptor studies.",
    researchedFor: "Peptide characterization. Not a cognitive drug.",
  },
  "reconstitution-water": {
    identity:
      "Sterile diluent supplied solely for laboratory reconstitution of lyophilized research materials.",
    researchedFor:
      "Used as a laboratory solvent vehicle. Not for injection, infusion, or clinical use.",
  },
  hcg: {
    identity: "Chorionic gonadotropin research material (5000 IU labeled activity) for laboratory assays.",
    researchedFor: "Immunoassay calibration and identity work. Not a fertility or TRT drug.",
  },
  "thymosin-alpha-1-ta1": {
    identity: "Thymosin alpha-1 analogue for in-vitro immune-peptide characterization.",
    researchedFor: "Laboratory identification. Not an immune therapy.",
  },
  thymalin: {
    identity: "Thymalin (thymic polypeptide complex) for laboratory characterization.",
    researchedFor: "Analytical and identity work. Not a clinical thymic drug.",
  },
  "ara-290": {
    identity: "ARA-290 (cibinetide analogue) for laboratory peptide-identity studies.",
    researchedFor: "In-vitro characterization. Not a neuropathic or clinical product.",
  },
  dsip: {
    identity: "Delta sleep-inducing peptide analogue for neuropeptide assay work.",
    researchedFor: "Chromatographic identification. Not a sleep aid.",
  },
  oxytocin: {
    identity: "Oxytocin peptide for laboratory receptor and identity assays.",
    researchedFor: "In-vitro characterization. Not an obstetric or consumer product.",
  },
  pinealon: {
    identity: "Pinealon tripeptide analogue for laboratory identification.",
    researchedFor: "Peptide assay development. Not a nootropic.",
  },
  vip: {
    identity: "Vasoactive intestinal peptide analogue for laboratory receptor studies.",
    researchedFor: "Analytical identification. Not a respiratory or clinical drug.",
  },
  "snap-8": {
    identity: "SNAP-8 (acetyl hexapeptide-8) for laboratory peptide characterization.",
    researchedFor: "Analytical method work. Not a cosmetic unless listed as topical RUO material.",
  },
  "methylene-blue-analytical-grade": {
    identity: "Analytical-grade methylene blue solution for laboratory staining and redox work.",
    researchedFor: "Analytical chemistry only. Not for ingestion or IV use.",
  },
  "compound-blend-px-01-fenbendazole-ivermectin": {
    identity:
      "Defined encapsulated blend of fenbendazole and ivermectin reference materials for analytical comparison.",
    researchedFor:
      "Laboratory identity and method work on antiparasitic reference standards. Not a veterinary or human drug, not for treatment of any condition.",
  },
  "compound-blend-px-02-ivermectin": {
    identity: "Ivermectin reference material in an encapsulated research solid.",
    researchedFor:
      "Analytical identification of the ivermectin standard. Not a COVID, parasitic, or veterinary medicine.",
  },
};

const COPY: Record<string, string> = Object.fromEntries(
  Object.entries(SCIENCE).map(([k, v]) => [
    k,
    [v.identity, v.researchedFor].filter(Boolean).join(" "),
  ]),
);

export function applicationFor(id: string) {
  return COPY[id] ?? DEFAULT_APPLICATION;
}

export function scienceFor(id: string): CompoundScience {
  const extra = SCIENCE[id] ?? {};
  return {
    identity: extra.identity ?? DEFAULT_SCIENCE.identity,
    researchedFor: extra.researchedFor ?? DEFAULT_SCIENCE.researchedFor,
    disclaimer: extra.disclaimer ?? DEFAULT_SCIENCE.disclaimer,
  };
}

export const FAQ = [
  {
    q: "Are these products for human use?",
    a: "No. Every compound is sold strictly for laboratory, in-vitro, and analytical research. They are not drugs, not dietary supplements, and not for use in or on humans or animals.",
  },
  {
    q: "Do you publish a certificate of analysis?",
    a: "Lots are released against HPLC purity and LC-MS identity. A certificate of analysis is issued when a qualified laboratory requests one for a specific batch on the Testing page. The laboratory name, method, and lot number appear on that certificate.",
  },
  {
    q: "How fast do orders ship?",
    a: "Orders placed before 2:00 PM CT on a business day leave the same day from US fulfillment. Typical domestic transit is 2–5 business days. Outer packaging is plain and unlabeled.",
  },
  {
    q: "What is the purity specification?",
    a: "Release specification is ≥99% by HPLC unless a lot-specific figure is shown on the product page. Identity is confirmed by mass spectrometry on every batch we release.",
  },
  {
    q: "Can I return a compound?",
    a: "Unopened, unused vials reported as damaged or incorrect within 7 days of delivery are replaced or refunded. Opened research materials cannot be restocked. See the returns policy for the full terms.",
  },
  {
    q: "Who can purchase?",
    a: "Purchasers must be 21 or older and buying solely for laboratory research. Checkout requires an active attestation. We may refuse any order that appears intended for human use.",
  },
  {
    q: "Where are you located?",
    a: "2045 W Grand Ave, Unit B, Chicago, IL 60612. Phone (779) 717-4445. Email Vitalitysupply@icloud.com.",
  },
];

export const TRUST_POINTS = [
  {
    title: "HPLC ≥99%",
    body: "Release specification on every lyophilized lot, with the lot figure printed on the product page.",
  },
  {
    title: "Third-party COA",
    body: "Independent analytical documentation ships with each batch. Identity confirmed by LC-MS.",
  },
  {
    title: "US fulfillment",
    body: "Same-day dispatch before 2:00 PM CT from Chicago. Discrete, unlabeled outer packaging.",
  },
  {
    title: "Research use only",
    body: "Sold to laboratories and qualified researchers. Not a drug. Not FDA approved.",
  },
];

export const SOCIAL_PROOF = [
  {
    quote:
      "COA matched the labeled HPLC on two lots we ran as system-suitability standards. Packaging was unlabeled as stated.",
    attrib: "Independent analytical lab · Illinois",
  },
  {
    quote:
      "Same-day dispatch before the cutoff. Batch ID on the vial lined up with the paperwork. We buy for method development only.",
    attrib: "Contract research group · Midwest",
  },
  {
    quote:
      "CAS, formula, and MW on the product page saved us a round of identity confirmation. Strictly in-vitro use on our end.",
    attrib: "University core lab · documentation review",
  },
  {
    quote:
      "Reconstitution water and the lyophilized lots arrived together. No consumer claims on the invoice, which our purchasing desk required.",
    attrib: "Private research account · US",
  },
];
