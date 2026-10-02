export type FamilyId =
  | "metabolic"
  | "tissue"
  | "gh-axis"
  | "mito"
  | "neuro"
  | "melanocortin"
  | "immune"
  | "specialty";

export type FormKind = "vial" | "liquid" | "capsule" | "spray" | "topical";

export const PRODUCT_GRID =
  "product-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";

export const FAMILIES: { id: FamilyId; label: string; blurb: string }[] = [
  {
    id: "metabolic",
    label: "Metabolic analogues",
    blurb: "GLP-1, GIP, glucagon and amylin receptor analogues for in-vitro assay work.",
  },
  {
    id: "tissue",
    label: "Tissue & copper peptides",
    blurb: "Fragment and copper-peptide analogues used in cell-migration and identity assays.",
  },
  {
    id: "gh-axis",
    label: "GH-axis analogues",
    blurb: "GHRH, ghrelin-mimetic and IGF analogues for receptor-binding studies.",
  },
  {
    id: "mito",
    label: "Mitochondrial & redox",
    blurb: "NAD-pathway, mitochondrial-derived and thiol standards for laboratory calibration.",
  },
  {
    id: "neuro",
    label: "Neuropeptides",
    blurb: "Short neuropeptide analogues for chromatographic identification and binding assays.",
  },
  {
    id: "melanocortin",
    label: "Melanocortin analogues",
    blurb: "α-MSH and melanocortin-receptor analogues for receptor-assay development.",
  },
  {
    id: "immune",
    label: "Immune-pathway peptides",
    blurb: "Thymic, cathelicidin and related analogues for in-vitro characterization.",
  },
  {
    id: "specialty",
    label: "Specialty & blends",
    blurb: "Defined blends, diluent, and additional analytical materials.",
  },
];

export const FORM_FILTERS: { id: FormKind; label: string }[] = [
  { id: "vial", label: "Vial" },
  { id: "capsule", label: "Encapsulated" },
  { id: "spray", label: "Spray bottle" },
  { id: "liquid", label: "Liquid solution" },
  { id: "topical", label: "Topical" },
];

export const PRICE_BANDS: { id: string; label: string; min: number; max: number }[] = [
  { id: "any", label: "Any budget", min: 0, max: Infinity },
  { id: "0-50", label: "Under $50", min: 0, max: 50 },
  { id: "50-100", label: "$50 – $100", min: 50, max: 100 },
  { id: "100-200", label: "$100 – $200", min: 100, max: 200 },
  { id: "200+", label: "$200+", min: 200, max: Infinity },
];

export const FAMILY_BY_SLUG: Record<string, FamilyId> = {
  semaglutide: "metabolic",
  tirzepatide: "metabolic",
  retatrutide: "metabolic",
  mazdutide: "metabolic",
  survodutide: "metabolic",
  cagrilintide: "metabolic",
  orforglipron: "metabolic",
  tesofensine: "metabolic",
  "5-amino-1mq": "metabolic",
  "aod-9604": "metabolic",
  "frag-176-191": "metabolic",
  "bpc-157": "tissue",
  "tb-500": "tissue",
  "bpc-tb-blend": "tissue",
  wolverine: "tissue",
  "tb-500-bpc-157-blend": "tissue",
  "tb-500-bpc-157-blend-cream": "tissue",
  klow: "tissue",
  glow: "tissue",
  "ghk-cu": "tissue",
  "ghk-cu-cream": "tissue",
  kpv: "tissue",
  "snap-8": "tissue",
  "cjc-1295-w-o-dac-ipamorelin": "gh-axis",
  "cjc-1295-no-dac": "gh-axis",
  "cjc-1295-with-dac": "gh-axis",
  "cjc-1295-w-o-dac": "gh-axis",
  "cjc-1295-ipamorelin-blend": "gh-axis",
  tesamorelin: "gh-axis",
  ipamorelin: "gh-axis",
  sermorelin: "gh-axis",
  "ghrp-2": "gh-axis",
  "ghrp-6": "gh-axis",
  hexarelin: "gh-axis",
  "igf-1-lr3": "gh-axis",
  "igf-1-des": "gh-axis",
  hcg: "gh-axis",
  nad: "mito",
  "mots-c": "mito",
  "ss-31": "mito",
  glutathione: "mito",
  nmn: "mito",
  "methylene-blue-analytical-grade": "mito",
  selank: "neuro",
  semax: "neuro",
  "selank-semax-blend": "neuro",
  dsip: "neuro",
  pinealon: "neuro",
  kisspeptin: "neuro",
  oxytocin: "neuro",
  vip: "neuro",
  dihexa: "neuro",
  noopept: "neuro",
  "pt-141": "melanocortin",
  "mt-2": "melanocortin",
  "melanotan-1": "melanocortin",
  "ll-37": "immune",
  "thymosin-alpha-1-ta1": "immune",
  thymalin: "immune",
  "ara-290": "immune",
  epithalon: "immune",
  enclomiphene: "specialty",
  aminotada: "specialty",
  "slu-pp-332": "specialty",
  "compound-blend-g-01": "specialty",
  "ac-ac-blend": "specialty",
  "compound-blend-px-01-fenbendazole-ivermectin": "specialty",
  "compound-blend-px-02-ivermectin": "specialty",
  "para-x-expel-blend": "specialty",
  "para-x-ivermectin": "specialty",
  "reconstitution-water": "specialty",
};

export function formKindFromCategory(
  category:
    | "vial-compounds"
    | "liquid-formulations"
    | "encapsulated-formulations"
    | "nasal-formulations"
    | "topical-formulations"
    | "sarm-formulations"
    | "research-sets",
): FormKind {
  switch (category) {
    case "liquid-formulations":
      return "liquid";
    case "encapsulated-formulations":
      return "capsule";
    case "nasal-formulations":
      return "spray";
    case "topical-formulations":
      return "topical";
    default:
      return "vial";
  }
}
