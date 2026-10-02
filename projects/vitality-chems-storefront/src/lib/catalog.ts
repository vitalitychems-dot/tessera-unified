import { slug } from "./utils";
import { applicationFor } from "./product-science";
import {
  FAMILY_BY_SLUG,
  formKindFromCategory,
  type FamilyId,
  type FormKind,
} from "./families";
import { offersFor } from "./wholesale";
import { hashedVial, hasHashedVial, GENERIC_VIAL } from "./vial-photos";
import { coaFor } from "./coa";

export type CategoryId =
  | "vial-compounds"
  | "liquid-formulations"
  | "encapsulated-formulations"
  | "nasal-formulations"
  | "topical-formulations"
  | "sarm-formulations"
  | "research-sets";

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "vial-compounds", label: "Vial Compounds" },
  { id: "liquid-formulations", label: "Liquid Formulations" },
  { id: "encapsulated-formulations", label: "Encapsulated Formulations" },
  { id: "nasal-formulations", label: "Nasal Formulations" },
  { id: "topical-formulations", label: "Topical Formulations" },
];

export type Variant = {
  dose: string;
  price: number;
  image?: string;
};

export type Product = {
  id: string;
  name: string;
  category: CategoryId;
  form: string;
  formKind: FormKind;
  family: FamilyId;
  molecularWeight?: string;
  molecularFormula?: string;
  casNumber?: string;
  variants: Variant[];
  featured?: boolean;
  rank: number;
  purity: string;
  applications: string;
  bestseller?: boolean;
  inStock: boolean;
  minPrice: number;
};

export type SarmProduct = {
  id: string;
  name: string;
  compounds: { name: string; mg: number }[];
  price: number;
  badge?: string;
};

export type ResearchSet = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  image: string;
  compounds: string[];
  badge?: string;
  perks: string[];
  monthly: number;
  annual: number;
  highlight?: boolean;
};

export type SearchHit = {
  kind: "product" | "sarm" | "set";
  id: string;
  name: string;
  subtitle: string;
  image: string;
  href: string;
  price: number;
};

const META: Record<
  string,
  { molecularWeight?: string; molecularFormula?: string; casNumber?: string }
> = {
  "5-amino-1mq": {
    molecularWeight: "162.19 g/mol",
    molecularFormula: "C₉H₁₀N₂O",
    casNumber: "20867-01-0",
  },
  "aod-9604": {
    molecularWeight: "1,815.1 g/mol",
    molecularFormula: "C₇₈H₁₂₃N₂₃O₂₃S₂",
    casNumber: "221231-10-3",
  },
  "bpc-157": {
    molecularWeight: "1,419.5 g/mol",
    molecularFormula: "C₆₂H₉₈N₁₆O₂₂",
    casNumber: "137525-51-0",
  },
  "cjc-1295-no-dac": { molecularWeight: "3,357.9 g/mol", casNumber: "863288-34-0" },
  "cjc-1295-with-dac": { molecularWeight: "3,647.3 g/mol", casNumber: "863288-34-0" },
  "cjc-1295-w-o-dac-ipamorelin": { molecularWeight: "4,069.8 g/mol", casNumber: "—" },
  "bpc-tb-blend": { molecularWeight: "—", casNumber: "—" },
  wolverine: { molecularWeight: "—", casNumber: "—" },
  epithalon: {
    molecularWeight: "390.4 g/mol",
    molecularFormula: "C₁₄H₂₂N₄O₉",
    casNumber: "307297-39-8",
  },
  "ghk-cu": {
    molecularWeight: "403.9 g/mol",
    molecularFormula: "C₁₄H₂₁CuN₆O₄",
    casNumber: "89030-95-5",
  },
  "ghrp-2": {
    molecularWeight: "817.9 g/mol",
    molecularFormula: "C₄₅H₅₅N₉O₆",
    casNumber: "158861-67-7",
  },
  "ghrp-6": {
    molecularWeight: "873.0 g/mol",
    molecularFormula: "C₄₆H₅₆N₁₂O₆",
    casNumber: "87616-84-0",
  },
  ipamorelin: {
    molecularWeight: "711.9 g/mol",
    molecularFormula: "C₃₈H₄₉N₉O₅",
    casNumber: "170851-70-4",
  },
  "mots-c": { molecularWeight: "2,174.5 g/mol", casNumber: "1448498-07-4" },
  "mt-2": {
    molecularWeight: "1,024.2 g/mol",
    molecularFormula: "C₅₀H₆₉N₁₅O₉",
    casNumber: "121062-08-6",
  },
  "pt-141": {
    molecularWeight: "1,025.2 g/mol",
    molecularFormula: "C₅₀H₆₈N₁₄O₁₀",
    casNumber: "189691-06-3",
  },
  retatrutide: { molecularWeight: "4,852.6 g/mol", casNumber: "2381089-83-2" },
  mazdutide: {
    molecularWeight: "4,563.1 g/mol",
    molecularFormula: "C₂₁₀H₃₂₂N₄₆O₆₇",
    casNumber: "2259884-03-0",
  },
  survodutide: {
    molecularWeight: "4,231.7 g/mol",
    molecularFormula: "C₁₉₂H₂₈₉N₄₇O₆₁",
    casNumber: "2805997-46-8",
  },
  selank: {
    molecularWeight: "751.0 g/mol",
    molecularFormula: "C₃₃H₅₇N₁₁O₉",
    casNumber: "129521-63-1",
  },
  semaglutide: { molecularWeight: "4,113.6 g/mol", casNumber: "910463-68-2" },
  sermorelin: { molecularWeight: "3,357.9 g/mol", casNumber: "86168-78-7" },
  "tb-500": { molecularWeight: "4,963.5 g/mol", casNumber: "77591-33-4" },
  tesamorelin: { molecularWeight: "5,135.9 g/mol", casNumber: "218949-48-5" },
  tirzepatide: { molecularWeight: "4,813.5 g/mol", casNumber: "2023788-19-2" },
  "ara-290": { molecularWeight: "1,761.0 g/mol", casNumber: "1208243-50-8" },
  cagrilintide: { molecularWeight: "3,858.4 g/mol", casNumber: "2016044-07-5" },
  dsip: {
    molecularWeight: "848.9 g/mol",
    molecularFormula: "C₃₅H₄₈N₁₀O₁₅",
    casNumber: "62568-57-4",
  },
  "frag-176-191": { molecularWeight: "1,817.1 g/mol", casNumber: "221231-10-3" },
  glutathione: {
    molecularWeight: "307.3 g/mol",
    molecularFormula: "C₁₀H₁₇N₃O₆S",
    casNumber: "70-18-8",
  },
  hcg: { molecularWeight: "36,700 g/mol", casNumber: "9002-61-3" },
  hexarelin: {
    molecularWeight: "887.0 g/mol",
    molecularFormula: "C₄₇H₅₈N₁₂O₆",
    casNumber: "140703-51-1",
  },
  "igf-1-lr3": { molecularWeight: "9,117.5 g/mol", casNumber: "143045-27-6" },
  kisspeptin: { molecularWeight: "1,302.5 g/mol", casNumber: "374683-24-0" },
  klow: { molecularWeight: "—", casNumber: "—" },
  glow: { molecularWeight: "—", casNumber: "—" },
  kpv: {
    molecularWeight: "376.4 g/mol",
    molecularFormula: "C₁₇H₃₂N₄O₆",
    casNumber: "66003-32-5",
  },
  "ll-37": { molecularWeight: "4,493.3 g/mol", casNumber: "154947-66-7" },
  "melanotan-1": { molecularWeight: "1,646.9 g/mol", casNumber: "75921-69-6" },
  nad: {
    molecularWeight: "663.4 g/mol",
    molecularFormula: "C₂₁H₂₇N₇O₁₄P₂",
    casNumber: "53-84-9",
  },
  oxytocin: {
    molecularWeight: "1,007.2 g/mol",
    molecularFormula: "C₄₃H₆₆N₁₂O₁₂S₂",
    casNumber: "50-56-6",
  },
  pinealon: { molecularWeight: "474.5 g/mol", casNumber: "133167-57-2" },
  semax: { molecularWeight: "813.0 g/mol", casNumber: "80714-61-0" },
  "slu-pp-332": { molecularWeight: "395.8 g/mol", casNumber: "2169481-81-4" },
  "snap-8": { molecularWeight: "1,075.3 g/mol", casNumber: "868844-74-0" },
  "ss-31": { molecularWeight: "640.8 g/mol", casNumber: "736992-21-5" },
  "thymosin-alpha-1-ta1": { molecularWeight: "3,108.5 g/mol", casNumber: "62304-98-7" },
  thymalin: { casNumber: "103300-74-9" },
  vip: { molecularWeight: "3,326.0 g/mol", casNumber: "37221-79-7" },
  orforglipron: {
    molecularWeight: "390.5 g/mol",
    molecularFormula: "C₂₃H₂₄F₃N₃O₂",
    casNumber: "2450271-68-6",
  },
  tesofensine: { molecularWeight: "422.9 g/mol", casNumber: "402856-42-2" },
  enclomiphene: { molecularWeight: "405.9 g/mol", casNumber: "15690-57-0" },
  nmn: { molecularWeight: "334.2 g/mol", casNumber: "1094-61-7" },
  dihexa: { molecularWeight: "476.6 g/mol", casNumber: "1165910-22-4" },
  aminotada: { molecularWeight: "389.4 g/mol", casNumber: "—" },
  noopept: { molecularWeight: "318.4 g/mol", casNumber: "157115-85-0" },
  "igf-1-des": { molecularWeight: "7,371.0 g/mol", casNumber: "—" },
};

const RANK: Record<string, number> = {
  semaglutide: 1,
  tirzepatide: 2,
  retatrutide: 3,
  mazdutide: 3,
  survodutide: 3,
  "bpc-157": 4,
  "tb-500": 5,
  "bpc-tb-blend": 6,
  wolverine: 6,
  klow: 7,
  glow: 7,
  "cjc-1295-w-o-dac-ipamorelin": 8,
  "ghk-cu": 9,
  nad: 10,
  tesamorelin: 11,
  ipamorelin: 12,
  "aod-9604": 13,
  "mots-c": 14,
  glutathione: 15,
  "pt-141": 16,
  "5-amino-1mq": 17,
  sermorelin: 18,
  "cjc-1295-no-dac": 19,
  "frag-176-191": 20,
  orforglipron: 21,
  epithalon: 22,
  "ghrp-2": 23,
  "ghrp-6": 24,
  hexarelin: 25,
  "igf-1-lr3": 26,
  cagrilintide: 27,
  "tb-500-bpc-157-blend": 28,
  "cjc-1295-ipamorelin-blend": 29,
  selank: 30,
  semax: 31,
  kisspeptin: 32,
  "ll-37": 33,
  kpv: 34,
  "ss-31": 35,
  "slu-pp-332": 36,
  "mt-2": 37,
  "melanotan-1": 38,
  tesofensine: 39,
  enclomiphene: 40,
  "thymosin-alpha-1-ta1": 41,
  thymalin: 42,
  "ara-290": 43,
  dsip: 44,
  oxytocin: 45,
  pinealon: 46,
  vip: 47,
  "snap-8": 48,
  hcg: 49,
  "cjc-1295-with-dac": 50,
  nmn: 51,
  dihexa: 52,
  aminotada: 53,
  "selank-semax-blend": 54,
  "igf-1-des": 55,
  "cjc-1295-w-o-dac": 56,
  "ghk-cu-cream": 57,
  "tb-500-bpc-157-blend-cream": 58,
  "methylene-blue-analytical-grade": 59,
  "compound-blend-g-01": 70,
  "ac-ac-blend": 71,
  "compound-blend-px-01-fenbendazole-ivermectin": 72,
  "compound-blend-px-02-ivermectin": 73,
  "reconstitution-water": 80,
};

const PURITY: Record<string, string> = {
  semaglutide: "99.7%",
  tirzepatide: "99.6%",
  retatrutide: "99.59%",
  mazdutide: "99.4%",
  survodutide: "99.3%",
  "bpc-157": ">99.80%",
  "tb-500": "99.35%",
  "bpc-tb-blend": ">99.80%",
  wolverine: "99.2%",
  klow: "99.4%",
  "cjc-1295-w-o-dac-ipamorelin": "99.3%",
  "ghk-cu": ">99.80%",
  nad: "99.5%",
  tesamorelin: "99.56%",
  ipamorelin: "99.4%",
  "aod-9604": "99.1%",
  "mots-c": "99.0%",
  glutathione: "99.6%",
  "pt-141": "99.2%",
  "5-amino-1mq": "99.3%",
  sermorelin: "99.1%",
  "cjc-1295-no-dac": "99.2%",
  "frag-176-191": "99.0%",
  orforglipron: "99.4%",
};

export function displayPurity(name: string, dose?: string) {
  const hit = coaFor(slug(name), dose);
  if (hit) return hit.purity;
  return PURITY[slug(name)] ?? "≥99%";
}

/** Exact vial photo only. Missing SKUs use the unlabeled generic vial. Non-vials: empty → SpecArt. */
export function productImage(name: string, dose?: string, formKind?: FormKind) {
  if (formKind && formKind !== "vial") return "";
  const n = slug(name);
  const doseSlug = dose ? slug(dose) : undefined;
  return hashedVial(n, doseSlug) ?? GENERIC_VIAL;
}

export function hasExactPhoto(name: string, dose?: string, formKind?: FormKind) {
  if (!dose || (formKind && formKind !== "vial")) return false;
  return hasHashedVial(slug(name), slug(dose));
}

export function hasStudioPhoto(name: string, dose?: string) {
  return hasExactPhoto(name, dose);
}


function formFor(category: CategoryId) {
  switch (category) {
    case "nasal-formulations":
      return "Aqueous formulation";
    case "encapsulated-formulations":
      return "Encapsulated solid formulation";
    case "topical-formulations":
      return "Topical preparation";
    case "liquid-formulations":
      return "Liquid solution";
    default:
      return "Lyophilized powder vial";
  }
}

function makeProduct(
  name: string,
  category: CategoryId,
  variants: Variant[],
  featured = false,
): Product {
  const id = slug(name);
  const meta = META[id] ?? {};
  const rank = RANK[id] ?? 800;
  return {
    id: `${category}__${id}`,
    name,
    category,
    form: id === "reconstitution-water"
      ? "Sterile laboratory diluent"
      : id === "ac-ac-blend"
        ? "Laboratory solvent blend"
        : formFor(category),
    formKind: formKindFromCategory(category),
    family: FAMILY_BY_SLUG[id] ?? "specialty",
    molecularWeight: meta.molecularWeight,
    molecularFormula: meta.molecularFormula,
    casNumber: meta.casNumber,
    variants: variants.map((v) => ({
      ...v,
      image: v.image ?? productImage(name, v.dose, formKindFromCategory(category)),
    })),
    featured: featured || rank <= 12,
    rank,
    purity: PURITY[id] ?? "≥99%",
    applications: applicationFor(id),
    bestseller: rank <= 12,
    inStock: true,
    minPrice: Math.min(...variants.map((v) => v.price)),
  };
}

function priced(name: string, category: CategoryId) {
  const rows = offersFor(formKindFromCategory(category), slug(name));
  if (!rows.length) {
    throw new Error(`Missing wholesale offers for ${category} / ${name} (${slug(name)})`);
  }
  return rows;
}

export const PRODUCTS: Product[] = [
  makeProduct("Semaglutide", "vial-compounds", priced("Semaglutide", "vial-compounds"), true),
  makeProduct("Tirzepatide", "vial-compounds", priced("Tirzepatide", "vial-compounds"), true),
  makeProduct("Retatrutide", "vial-compounds", priced("Retatrutide", "vial-compounds"), true),
  makeProduct("BPC-157", "vial-compounds", priced("BPC-157", "vial-compounds"), true),
  makeProduct("TB-500", "vial-compounds", priced("TB-500", "vial-compounds"), true),
  makeProduct("BPC/TB Blend", "vial-compounds", priced("BPC/TB Blend", "vial-compounds"), true),
  makeProduct("KLOW", "vial-compounds", priced("KLOW", "vial-compounds"), true),
  makeProduct("Glow", "vial-compounds", priced("Glow", "vial-compounds"), true),
  makeProduct(
    "CJC-1295 w/o DAC + Ipamorelin",
    "vial-compounds",
    priced("CJC-1295 w/o DAC + Ipamorelin", "vial-compounds"),
    true,
  ),
  makeProduct("GHK-Cu", "vial-compounds", priced("GHK-Cu", "vial-compounds"), true),
  makeProduct("NAD+", "vial-compounds", priced("NAD+", "vial-compounds"), true),
  makeProduct("Tesamorelin", "vial-compounds", priced("Tesamorelin", "vial-compounds"), true),
  makeProduct("Ipamorelin", "vial-compounds", priced("Ipamorelin", "vial-compounds")),
  makeProduct("AOD-9604", "vial-compounds", priced("AOD-9604", "vial-compounds")),
  makeProduct("MOTS-c", "vial-compounds", priced("MOTS-c", "vial-compounds")),
  makeProduct("Glutathione", "vial-compounds", priced("Glutathione", "vial-compounds")),
  makeProduct("PT-141", "vial-compounds", priced("PT-141", "vial-compounds")),
  makeProduct("5-Amino-1MQ", "vial-compounds", priced("5-Amino-1MQ", "vial-compounds")),
  makeProduct("Sermorelin", "vial-compounds", priced("Sermorelin", "vial-compounds")),
  makeProduct("CJC-1295 no DAC", "vial-compounds", priced("CJC-1295 no DAC", "vial-compounds")),
  makeProduct("Frag 176-191", "vial-compounds", priced("Frag 176-191", "vial-compounds")),
  makeProduct("Epithalon", "vial-compounds", priced("Epithalon", "vial-compounds")),
  makeProduct("GHRP-2", "vial-compounds", priced("GHRP-2", "vial-compounds")),
  makeProduct("GHRP-6", "vial-compounds", priced("GHRP-6", "vial-compounds")),
  makeProduct("Hexarelin", "vial-compounds", priced("Hexarelin", "vial-compounds")),
  makeProduct("IGF-1 LR3", "vial-compounds", priced("IGF-1 LR3", "vial-compounds")),
  makeProduct("Cagrilintide", "vial-compounds", priced("Cagrilintide", "vial-compounds")),
  makeProduct("Selank", "vial-compounds", priced("Selank", "vial-compounds")),
  makeProduct("Semax", "vial-compounds", priced("Semax", "vial-compounds")),
  makeProduct("Kisspeptin", "vial-compounds", priced("Kisspeptin", "vial-compounds")),
  makeProduct("LL-37", "vial-compounds", priced("LL-37", "vial-compounds")),
  makeProduct("KPV", "vial-compounds", priced("KPV", "vial-compounds")),
  makeProduct("SS-31", "vial-compounds", priced("SS-31", "vial-compounds")),
  makeProduct("SLU-PP-332", "vial-compounds", priced("SLU-PP-332", "vial-compounds")),
  makeProduct("MT-2", "vial-compounds", priced("MT-2", "vial-compounds")),
  makeProduct("Melanotan-1", "vial-compounds", priced("Melanotan-1", "vial-compounds")),
  makeProduct("Thymosin Alpha-1 (TA1)", "vial-compounds", priced("Thymosin Alpha-1 (TA1)", "vial-compounds")),
  makeProduct("Thymalin", "vial-compounds", priced("Thymalin", "vial-compounds")),
  makeProduct("ARA-290", "vial-compounds", priced("ARA-290", "vial-compounds")),
  makeProduct("DSIP", "vial-compounds", priced("DSIP", "vial-compounds")),
  makeProduct("Oxytocin", "vial-compounds", priced("Oxytocin", "vial-compounds")),
  makeProduct("Pinealon", "vial-compounds", priced("Pinealon", "vial-compounds")),
  makeProduct("VIP", "vial-compounds", priced("VIP", "vial-compounds")),
  makeProduct("Snap-8", "vial-compounds", priced("Snap-8", "vial-compounds")),
  makeProduct("HCG", "vial-compounds", priced("HCG", "vial-compounds")),
  makeProduct("CJC-1295 with DAC", "vial-compounds", priced("CJC-1295 with DAC", "vial-compounds")),
  makeProduct("AC/AC Blend", "vial-compounds", priced("AC/AC Blend", "vial-compounds")),
  makeProduct("Reconstitution Water", "vial-compounds", priced("Reconstitution Water", "vial-compounds")),

  makeProduct("GHK-Cu", "liquid-formulations", priced("GHK-Cu", "liquid-formulations")),
  makeProduct("Aminotada", "liquid-formulations", priced("Aminotada", "liquid-formulations")),
  makeProduct(
    "Methylene Blue (Analytical Grade)",
    "liquid-formulations",
    priced("Methylene Blue (Analytical Grade)", "liquid-formulations"),
  ),

  makeProduct("Orforglipron", "encapsulated-formulations", priced("Orforglipron", "encapsulated-formulations")),
  makeProduct("AOD-9604", "encapsulated-formulations", priced("AOD-9604", "encapsulated-formulations")),
  makeProduct("GHK-Cu", "encapsulated-formulations", priced("GHK-Cu", "encapsulated-formulations")),
  makeProduct("BPC-157", "encapsulated-formulations", priced("BPC-157", "encapsulated-formulations")),
  makeProduct("TB-500", "encapsulated-formulations", priced("TB-500", "encapsulated-formulations")),
  makeProduct(
    "TB-500/BPC-157 Blend",
    "encapsulated-formulations",
    priced("TB-500/BPC-157 Blend", "encapsulated-formulations"),
  ),
  makeProduct("KPV", "encapsulated-formulations", priced("KPV", "encapsulated-formulations")),
  makeProduct("Tesofensine", "encapsulated-formulations", priced("Tesofensine", "encapsulated-formulations")),
  makeProduct("5-Amino-1MQ", "encapsulated-formulations", priced("5-Amino-1MQ", "encapsulated-formulations")),
  makeProduct("Enclomiphene", "encapsulated-formulations", priced("Enclomiphene", "encapsulated-formulations")),
  makeProduct("NMN", "encapsulated-formulations", priced("NMN", "encapsulated-formulations")),
  makeProduct("Dihexa", "encapsulated-formulations", priced("Dihexa", "encapsulated-formulations")),
  makeProduct("Aminotada", "encapsulated-formulations", priced("Aminotada", "encapsulated-formulations")),
  makeProduct("Oxytocin", "encapsulated-formulations", priced("Oxytocin", "encapsulated-formulations")),
  makeProduct(
    "PARA X — Expel Blend",
    "encapsulated-formulations",
    priced("PARA X — Expel Blend", "encapsulated-formulations"),
  ),
  makeProduct(
    "PARA X — Ivermectin",
    "encapsulated-formulations",
    priced("PARA X — Ivermectin", "encapsulated-formulations"),
  ),

  makeProduct("AOD-9604", "nasal-formulations", priced("AOD-9604", "nasal-formulations")),
  makeProduct("Ipamorelin", "nasal-formulations", priced("Ipamorelin", "nasal-formulations")),
  makeProduct("CJC-1295 w/o DAC", "nasal-formulations", priced("CJC-1295 w/o DAC", "nasal-formulations")),
  makeProduct(
    "CJC-1295/Ipamorelin Blend",
    "nasal-formulations",
    priced("CJC-1295/Ipamorelin Blend", "nasal-formulations"),
  ),
  makeProduct("IGF-1 DES", "nasal-formulations", priced("IGF-1 DES", "nasal-formulations")),
  makeProduct("Frag 176-191", "nasal-formulations", priced("Frag 176-191", "nasal-formulations")),
  makeProduct("MT-2", "nasal-formulations", priced("MT-2", "nasal-formulations")),
  makeProduct("PT-141", "nasal-formulations", priced("PT-141", "nasal-formulations")),
  makeProduct("Semax", "nasal-formulations", priced("Semax", "nasal-formulations")),
  makeProduct("Selank", "nasal-formulations", priced("Selank", "nasal-formulations")),
  makeProduct("Selank/Semax Blend", "nasal-formulations", priced("Selank/Semax Blend", "nasal-formulations")),
  makeProduct("NAD+", "nasal-formulations", priced("NAD+", "nasal-formulations")),
  makeProduct("BPC-157", "nasal-formulations", priced("BPC-157", "nasal-formulations")),
  makeProduct("TB-500", "nasal-formulations", priced("TB-500", "nasal-formulations")),
  makeProduct(
    "TB-500/BPC-157 Blend",
    "nasal-formulations",
    priced("TB-500/BPC-157 Blend", "nasal-formulations"),
  ),

  makeProduct("GHK-Cu Cream", "topical-formulations", priced("GHK-Cu Cream", "topical-formulations")),
  makeProduct(
    "TB-500/BPC-157 Blend Cream",
    "topical-formulations",
    priced("TB-500/BPC-157 Blend Cream", "topical-formulations"),
  ),
];

export const SARMS: SarmProduct[] = [];

export const SET_QTY = [
  { mg: 5, multiplier: 0.65 },
  { mg: 10, multiplier: 1 },
  { mg: 20, multiplier: 1.85 },
];

export function setPrice(base: number, mg: number, compounds: number) {
  const multiplier = SET_QTY.find((q) => q.mg === mg)?.multiplier ?? 1;
  return Math.round(base * multiplier * compounds * 100) / 100;
}

export const RESEARCH_SETS: ResearchSet[] = [];

export const FREE_SHIPPING_AT = Number.POSITIVE_INFINITY;
export const SHIPPING_FLAT = 12.95;
export const SHIPPING_EXPRESS = 24.95;
export const CRYPTO_SAVE = 0.08;
export const RECON_ID = "vial-compounds__reconstitution-water";

export function shippingFor(subtotal: number, speed: "standard" | "express" = "standard") {
  if (subtotal <= 0) return 0;
  return speed === "express" ? SHIPPING_EXPRESS : SHIPPING_FLAT;
}

function byRank(list: Product[]) {
  return [...list].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
}

export function productsByCategory(category: CategoryId) {
  return byRank(PRODUCTS.filter((p) => p.category === category));
}

export function findProduct(id: string) {
  if (id.includes("wolverine")) {
    return PRODUCTS.find((p) => p.id.endsWith("__bpc-tb-blend")) ?? PRODUCTS.find((p) => p.id === id);
  }
  return PRODUCTS.find((p) => p.id === id);
}

export function productsByFamily(family: FamilyId) {
  return byRank(PRODUCTS.filter((p) => p.family === family && p.category === "vial-compounds"));
}

export function filterProducts(opts: {
  family?: FamilyId | "all";
  form?: FormKind | "all";
  min?: number;
  max?: number;
  query?: string;
}) {
  const q = opts.query?.trim().toLowerCase() ?? "";
  return byRank(
    PRODUCTS.filter((p) => {
      if (opts.family && opts.family !== "all" && p.family !== opts.family) return false;
      if (opts.form && opts.form !== "all" && p.formKind !== opts.form) return false;
      if (opts.min != null && p.minPrice < opts.min) return false;
      if (opts.max != null && Number.isFinite(opts.max) && p.minPrice > opts.max) return false;
      if (q && !`${p.name} ${p.casNumber ?? ""} ${p.form}`.toLowerCase().includes(q)) return false;
      return true;
    }),
  );
}

export function bestsellers(limit = 12) {
  return byRank(PRODUCTS.filter((p) => p.category === "vial-compounds")).slice(0, limit);
}

export function relatedProducts(product: Product, limit = 4) {
  return byRank(PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id)).slice(
    0,
    limit,
  );
}

export function batchId(product: Product) {
  return `VS-${slug(product.name).replace(/-/g, "").slice(0, 8).toUpperCase()}-2608`;
}

export function searchCatalog(query: string): SearchHit[] {
  const t = query.trim().toLowerCase();
  if (t.length < 1) return [];
  const hits: SearchHit[] = [];
  for (const p of PRODUCTS) {
    if (`${p.name} ${p.casNumber ?? ""} ${p.form}`.toLowerCase().includes(t)) {
      hits.push({
        kind: "product",
        id: p.id,
        name: p.name,
        subtitle: `${p.form} · from ${p.variants[0]?.dose ?? ""}`,
        image: p.variants[0]?.image ?? productImage(p.name),
        href: `/product/${p.id}`,
        price: p.variants[0]?.price ?? 0,
      });
    }
  }
  for (const s of SARMS) {
    if (`${s.name} ${s.compounds.map((c) => c.name).join(" ")}`.toLowerCase().includes(t)) {
      hits.push({
        kind: "sarm",
        id: s.id,
        name: s.name,
        subtitle: s.compounds.map((c) => c.name).join(" · "),
        image: GENERIC_VIAL,
        href: "/#sarms",
        price: s.price,
      });
    }
  }
  for (const set of RESEARCH_SETS) {
    if (`${set.name} ${set.compounds.join(" ")}`.toLowerCase().includes(t)) {
      hits.push({
        kind: "set",
        id: set.id,
        name: set.name,
        subtitle: set.compounds.join(" · "),
        image: set.image,
        href: "/#sets",
        price: set.price,
      });
    }
  }
  return hits.slice(0, 12);
}
