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
      "Laboratory context includes receptor-binding assays, chromatographic method development, and in-vitro analytical characterization. This listing is not a protocol or finished product.",
  },
  tirzepatide: {
    identity:
      "Tirzepatide is a dual GIP/GLP-1 receptor analogue supplied lyophilized for laboratory identification. CAS 2023788-19-2.",
    researchedFor:
      "Experimental papers use dual incretin analogues in receptor-binding and HPLC identity work. This listing provides no administration protocol.",
  },
  retatrutide: {
    identity:
      "Retatrutide is a triple GIP/GLP-1/glucagon receptor analogue supplied as a lyophilized research material.",
    researchedFor:
      "Laboratory context includes receptor assays and analytical characterization of multi-receptor analogues. This listing is limited to research work.",
  },
  mazdutide: {
    identity:
      "Mazdutide is an oxyntomodulin analogue (GLP-1/glucagon) supplied for in-vitro receptor-binding and chromatographic identification.",
    researchedFor:
      "Laboratory context includes identity confirmation and receptor-assay method development. This material is not offered as a finished product.",
  },
  survodutide: {
    identity:
      "Survodutide is a dual GLP-1/glucagon receptor agonist analogue supplied as lyophilized powder for laboratory use.",
    researchedFor:
      "Laboratory context includes receptor studies and HPLC method development. Research use only.",
  },
  "bpc-157": {
    identity:
      "BPC-157 is a synthetic pentadecapeptide (CAS 137525-51-0) supplied lyophilized for laboratory identification.",
    researchedFor:
      "Laboratory context includes sequence identity work and cell-system assay development. Experimental literature is not an instruction for use of this vial.",
  },
  "tb-500": {
    identity:
      "TB-500 is a thymosin beta-4 fragment analogue supplied as lyophilized powder for laboratory work.",
    researchedFor:
      "Laboratory context includes in-vitro peptide characterization and cell-system assay development. Not offered as a finished product.",
  },
  "bpc-tb-blend": {
    identity:
      "A defined two-compound blend of BPC-157 and TB-500 (also labeled Wolverine on some lots) for comparative laboratory assay work.",
    researchedFor:
      "Used when a lab needs both fragment analogues in a single vial for comparative method development. Research use only.",
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
      "Intended for labs running parallel copper-peptide and fragment identity methods. Research use only.",
  },
  glow: {
    identity:
      "Three-compound blend (BPC-157, TB-500, GHK-Cu) supplied lyophilized for comparative assay work.",
    researchedFor:
      "Copper-peptide and fragment analogue characterization in vitro. Research use only.",
  },
  "cjc-1295-w-o-dac-ipamorelin": {
    identity:
      "Paired GHRH analogue (CJC-1295 without DAC) and ghrelin-mimetic (ipamorelin) in one research vial.",
    researchedFor:
      "Co-assay, chromatographic separation, and receptor-binding studies. Research use only.",
  },
  "ghk-cu": {
    identity:
      "GHK-Cu is a copper-tripeptide complex (CAS 89030-95-5) supplied for peptide–metal characterization.",
    researchedFor:
      "In-vitro work on copper-peptide coordination and analytical methods. Any preparation made from this material remains RUO.",
  },
  nad: {
    identity:
      "Nicotinamide adenine dinucleotide, oxidized form (NAD+), supplied as a laboratory redox cofactor standard.",
    researchedFor:
      "Enzymatic assay calibration, redox studies, and identity confirmation. Research use only.",
  },
  tesamorelin: {
    identity: "Tesamorelin is a GHRH analogue supplied lyophilized for laboratory receptor work.",
    researchedFor:
      "Receptor-binding and chromatographic identity confirmation. Research use only.",
  },
  ipamorelin: {
    identity: "Ipamorelin is a selective ghrelin-receptor analogue for in-vitro binding assays.",
    researchedFor:
      "Peptide identification and ghrelin-receptor studies in laboratory systems. Research use only.",
  },
  "aod-9604": {
    identity: "AOD-9604 is a C-terminal hGH fragment analogue supplied for analytical characterization.",
    researchedFor:
      "Laboratory assay development around fragment identity. Not offered as a finished product.",
  },
  "mots-c": {
    identity: "MOTS-c is a mitochondrial-derived peptide supplied for in-vitro biochemical-pathway studies.",
    researchedFor: "Identification and pathway assays in cell systems. Research use only.",
  },
  glutathione: {
    identity: "Glutathione (γ-glutamyl-cysteinyl-glycine) as a thiol standard for laboratory calibration.",
    researchedFor: "Redox assay calibration and HPLC method work. Research use only.",
  },
  "pt-141": {
    identity: "PT-141 (bremelanotide analogue) is a melanocortin-receptor analogue for binding assays.",
    researchedFor:
      "Melanocortin receptor identification in vitro. Research use only.",
  },
  "5-amino-1mq": {
    identity: "5-Amino-1MQ is a small-molecule NNMT-pathway research compound.",
    researchedFor: "In-vitro enzymatic assays and analytical identification. Research use only.",
  },
  sermorelin: {
    identity: "Sermorelin is GHRH (1-29) analogue for laboratory receptor studies.",
    researchedFor: "Peptide identity confirmation and receptor-binding work. Research use only.",
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
    researchedFor: "Laboratory assay work on peptide-fragment identity. Research use only.",
  },
  epithalon: {
    identity: "Epithalon (Ala-Glu-Asp-Gly) tetrapeptide analogue.",
    researchedFor:
      "Experimental peptide characterization and analytical assays in laboratory settings. Research use only.",
  },
  "ghrp-2": {
    identity: "GHRP-2 is a ghrelin-mimetic hexapeptide for receptor-binding assays.",
    researchedFor: "Chromatographic identification and in-vitro receptor studies.",
  },
  "ghrp-6": {
    identity: "GHRP-6 is a ghrelin-mimetic hexapeptide supplied for laboratory receptor work.",
    researchedFor: "In-vitro receptor-assay work. Research use only.",
  },
  hexarelin: {
    identity: "Hexarelin is a peptide receptor-ligand analogue for laboratory binding assays.",
    researchedFor: "Receptor identification work. Research use only.",
  },
  "igf-1-lr3": {
    identity: "Long R3 IGF-1 analogue for in-vitro receptor studies.",
    researchedFor: "Peptide characterization in cell-culture systems. Research use only.",
  },
  cagrilintide: {
    identity: "Cagrilintide is an amylin analogue for laboratory receptor-assay development.",
    researchedFor: "Amylin-pathway identification in vitro. Research use only.",
  },
  selank: {
    identity: "Selank is a tuftsin-derived heptapeptide for neuropeptide assay work.",
    researchedFor: "In-vitro neuropeptide identification. Research use only.",
  },
  semax: {
    identity: "Semax is an ACTH (4-10) analogue for laboratory neuropeptide characterization.",
    researchedFor: "Assay development in neural-peptide models. Research use only.",
  },
  kisspeptin: {
    identity: "Kisspeptin-10 analogue for GnRH-pathway receptor assays.",
    researchedFor: "Chromatographic identification and receptor work. Research use only.",
  },
  "ll-37": {
    identity: "LL-37 is a cathelicidin-derived peptide for in-vitro antimicrobial-peptide characterization.",
    researchedFor: "Assay work on peptide characterization in laboratory systems. Research use only.",
  },
  kpv: {
    identity: "KPV is the C-terminal α-MSH fragment (Lys-Pro-Val) for laboratory identification.",
    researchedFor: "Peptide assay development in laboratory systems. Research use only.",
  },
  "ss-31": {
    identity: "SS-31 (elamipretide analogue) is a mitochondria-targeted tetrapeptide.",
    researchedFor: "In-vitro organelle and peptide-identity studies. Research use only.",
  },
  "slu-pp-332": {
    identity: "SLU-PP-332 is an ERR agonist research compound for in-vitro receptor assays.",
    researchedFor: "Analytical identification of ERR ligands. Research use only.",
  },
  "mt-2": {
    identity: "Melanotan-2 analogue for melanocortin receptor-binding assays.",
    researchedFor: "Chromatographic method development. Research use only.",
  },
  "melanotan-1": {
    identity: "Melanotan-1 (afamelanotide analogue) for laboratory melanocortin-receptor studies.",
    researchedFor: "Identity confirmation in vitro. Research use only.",
  },
  orforglipron: {
    identity: "Non-peptide GLP-1 receptor agonist analogue supplied as an encapsulated research solid.",
    researchedFor: "In-vitro binding assays and analytical work. Research use only.",
  },
  tesofensine: {
    identity: "Triple monoamine reuptake research compound for in-vitro assay work.",
    researchedFor: "Analytical identification. Research use only.",
  },
  enclomiphene: {
    identity: "Trans-isomer SERM analogue for laboratory receptor-binding work.",
    researchedFor: "Chromatographic and receptor studies. Research use only.",
  },
  nmn: {
    identity: "Nicotinamide mononucleotide for enzymatic assay calibration.",
    researchedFor: "Analytical identification of NAD-pathway intermediates. Research use only.",
  },
  dihexa: {
    identity: "Angiotensin IV analogue for in-vitro receptor studies.",
    researchedFor: "Peptide characterization in laboratory systems. Research use only.",
  },
  "reconstitution-water": {
    identity:
      "Sterile diluent supplied solely for laboratory reconstitution of lyophilized research materials.",
    researchedFor:
      "Used as a laboratory solvent vehicle. Research use only.",
  },
  hcg: {
    identity: "Chorionic gonadotropin research material (5000 IU labeled activity) for laboratory assays.",
    researchedFor: "Immunoassay calibration and identity work. Research use only.",
  },
  "thymosin-alpha-1-ta1": {
    identity: "Thymosin alpha-1 analogue for in-vitro immune-peptide characterization.",
    researchedFor: "Laboratory identification. Research use only.",
  },
  thymalin: {
    identity: "Thymalin (thymic polypeptide complex) for laboratory characterization.",
    researchedFor: "Analytical and identity work. Research use only.",
  },
  "ara-290": {
    identity: "ARA-290 (cibinetide analogue) for laboratory peptide-identity studies.",
    researchedFor: "In-vitro characterization. Research use only.",
  },
  dsip: {
    identity: "DSIP peptide analogue for neuropeptide assay work.",
    researchedFor: "Chromatographic identification. Research use only.",
  },
  oxytocin: {
    identity: "Oxytocin peptide for laboratory receptor and identity assays.",
    researchedFor: "In-vitro characterization. Research use only.",
  },
  pinealon: {
    identity: "Pinealon tripeptide analogue for laboratory identification.",
    researchedFor: "Peptide assay development. Research use only.",
  },
  vip: {
    identity: "Vasoactive intestinal peptide analogue for laboratory receptor studies.",
    researchedFor: "Analytical identification. Research use only.",
  },
  "snap-8": {
    identity: "SNAP-8 (acetyl hexapeptide-8) for laboratory peptide characterization.",
    researchedFor: "Analytical method work. Research use only.",
  },
  "methylene-blue-analytical-grade": {
    identity: "Analytical-grade methylene blue solution for laboratory staining and redox work.",
    researchedFor: "Analytical chemistry only. Research use only.",
  },
  "compound-blend-px-01-fenbendazole-ivermectin": {
    identity:
      "Defined encapsulated blend of fenbendazole and ivermectin reference materials for analytical comparison.",
    researchedFor:
      "Laboratory identity and method work on reference standards. Research use only.",
  },
  "compound-blend-px-02-ivermectin": {
    identity: "Ivermectin reference material in an encapsulated research solid.",
    researchedFor:
      "Analytical identification of the ivermectin standard. Research use only.",
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
    q: "What is the intended research context?",
    a: "Every compound is sold strictly for laboratory, in-vitro, and analytical research. They are not drugs, not dietary supplements, and not for use in or on humans or animals.",
  },
  {
    q: "Do you publish a certificate of analysis?",
    a: "Lots are released against HPLC purity and LC-MS identity. A certificate of analysis is issued when a qualified laboratory requests one for a specific batch on the Testing page. The laboratory name, method, and lot number appear on that certificate.",
  },
  {
    q: "How fast do orders ship?",
    a: "Orders placed before 2:00 PM CT on a business day may be prepared for same-day dispatch from US fulfillment. Typical domestic transit is 2–5 business days, but these are estimates rather than guarantees and may vary with review, carrier, weather, destination, or other restrictions. Outer packaging is plain and unlabeled.",
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
    a: "Purchasers must be 18 or older, qualified for the stated laboratory work, and buying solely for lawful research. Checkout requires an active attestation. Purchasers must determine the rules that apply to their order; RUO labeling does not establish regulatory legality. We may review, hold, refuse, or cancel an order.",
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
    body: "Lot-specific analytical documentation is available for documented lots. Identity is reported by LC-MS where shown.",
  },
  {
    title: "US fulfillment",
    body: "Same-day dispatch before 2:00 PM CT from Chicago. Discrete, unlabeled outer packaging.",
  },
  {
    title: "Research use only",
    body: "Sold to laboratories and qualified researchers under an RUO notice. Not FDA approved.",
  },
];
