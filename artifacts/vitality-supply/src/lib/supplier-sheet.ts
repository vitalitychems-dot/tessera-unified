import { slug } from "./utils";

/**
 * Transcription of the uploaded supplier sheet. The sheet is the source of
 * truth for current vial costs. Retail cost uses the 1 KIT (10) column / 10;
 * the 5 KITS (50) and 10 KITS (100) columns are retained for projections.
 *
 * Source: attached_assets/0_IMG_1851_1789486695113.png
 * Visual transcription and reconciliation date: 2026-09-15
 *
 * The replacement sheet was reviewed at full size with enlarged crops of all
 * three pricing panels. Its legible values reconcile to the existing map; no
 * numeric row was changed without an exact product + strength match. The
 * one-bottle column is retained as supplier reference only and is never used
 * as the standard vial cost.
 */
export const SUPPLIER_SHEET_ASSET =
  "attached_assets/0_IMG_1851_1789486695113.png";

export type SupplierTierCosts = {
  bottle: number;
  kit10: number;
  kits50: number;
  kits100: number;
  standardUnit: number;
  unit50: number;
  unit100: number;
};

function row(
  name: string,
  dose: string,
  bottle: number,
  kit10: number,
  kits50: number,
  kits100: number,
): [string, SupplierTierCosts] {
  return [
    `${slug(name)}:${slug(dose)}`,
    {
      bottle,
      kit10,
      kits50,
      kits100,
      standardUnit: kit10 / 10,
      unit50: kits50 / 50,
      unit100: kits100 / 100,
    },
  ];
}

/** Exact product + strength rows that are legible in the uploaded sheet. */
export const SUPPLIER_SHEET_COSTS: Record<string, SupplierTierCosts> = Object.fromEntries([
  row("5-Amino-1MQ", "5mg", 26, 243, 1209, 2067),
  row("AC/AC Blend", "3mL", 6, 56, 260, 455),
  row("AOD-9604", "5mg", 32, 299, 1404, 2457),
  row("ARA-290", "10mg", 20, 189, 884, 1547),
  row("BPC/TB Blend", "10mg/10mg", 52, 477, 2236, 3913),
  row("BPC-157", "5mg", 52, 299, 1404, 2457),
  row("BPC-157", "10mg", 30, 299, 1404, 2457),
  row("Cagrilintide", "10mg", 60, 553, 2600, 4550),
  row("CJC-1295 with DAC", "5mg", 43, 398, 1872, 3276),
  row("CJC-1295 w/o DAC + Ipamorelin", "5mg/5mg", 29, 265, 1248, 2184),
  row("CJC-1295 no DAC", "5mg", 23, 211, 988, 1729),
  row("CJC-1295 no DAC", "10mg", 41, 376, 1768, 3094),
  row("DSIP", "5mg", 18, 167, 780, 1365),
  row("Epithalon", "10mg", 14, 133, 624, 1092),
  row("Epithalon", "50mg", 43, 398, 1872, 3276),
  row("Frag 176-191", "5mg", 26, 243, 1209, 2067),
  row("GHK-Cu", "50mg", 20, 189, 884, 1547),
  row("GHK-Cu", "100mg", 34, 299, 1404, 2457),
  row("GHRP-2", "5mg", 19, 167, 780, 1365),
  row("GHRP-2", "10mg", 24, 222, 1040, 1820),
  row("GHRP-6", "5mg", 19, 167, 780, 1365),
  row("GHRP-6", "10mg", 24, 222, 1040, 1820),
  row("Glow", "10/10/50mg", 65, 595, 2808, 4914),
  row("Glutathione", "1500mg", 26, 243, 1209, 2067),
  row("Hexarelin", "5mg", 26, 243, 1209, 2067),
  row("IGF-1 LR3", "1mg", 58, 530, 2496, 4368),
  row("Ipamorelin", "5mg", 18, 167, 780, 1365),
  row("Ipamorelin", "10mg", 24, 289, 1326, 2457),
  row("Kisspeptin", "5mg", 22, 265, 1248, 2184),
  row("Kisspeptin", "10mg", 38, 354, 1716, 3003),
  row("KLOW", "80mg", 72, 663, 3120, 5460),
  row("KPV", "10mg", 20, 189, 884, 1547),
  row("LL-37", "5mg", 26, 243, 1209, 2067),
  row("Melanotan-1", "10mg", 17, 155, 728, 1365),
  row("MOTS-C", "10mg", 36, 338, 1560, 2730),
  row("MOTS-C", "40mg", 46, 420, 2028, 3458),
  row("MT-2", "10mg", 19, 177, 832, 1456),
  row("NAD+", "500mg", 36, 338, 1560, 2730),
  row("Oxytocin", "10mg", 14, 133, 624, 1092),
  row("Oxytocin", "5mg", 18, 167, 780, 1365),
  row("Pinealon", "10mg", 20, 189, 884, 1547),
  row("PT-141", "10mg", 24, 243, 1209, 2067),
  row("Retatrutide", "10mg", 30, 277, 1300, 2275),
  row("Retatrutide", "20mg", 54, 498, 2340, 4095),
  row("Retatrutide", "30mg", 78, 719, 3380, 5915),
  row("Selank", "5mg", 18, 167, 780, 1365),
  row("Selank", "10mg", 26, 243, 1209, 2067),
  row("Semaglutide", "5mg", 36, 338, 1560, 2730),
  row("Semaglutide", "10mg", 54, 498, 2340, 4095),
  row("Semaglutide", "20mg", 108, 995, 4680, 8190),
  row("Semaglutide", "30mg", 132, 1216, 5720, 10010),
  row("Semax", "10mg", 29, 265, 1248, 2184),
  row("Sermorelin", "5mg", 24, 220, 1040, 1820),
  row("Sermorelin", "10mg", 42, 387, 1820, 3185),
  row("Snap-8", "10mg", 22, 265, 1248, 2184),
  row("SS-31", "10mg", 26, 243, 1209, 2067),
  row("SS-31", "50mg", 89, 818, 3952, 6916),
  row("Thymosin Alpha-1", "5mg", 34, 309, 1560, 2730),
  row("Thymosin Alpha-1", "10mg", 49, 454, 2288, 4004),
  row("TB-500", "5mg", 30, 277, 1300, 2275),
  row("TB-500", "10mg", 48, 442, 2080, 3640),
  row("Tesamorelin", "5mg", 31, 287, 1352, 3366),
  row("Tesamorelin", "10mg", 53, 486, 2288, 4004),
  row("Tirzepatide", "10mg", 60, 553, 2600, 4550),
  row("Tirzepatide", "20mg", 120, 1105, 5200, 9100),
  row("Tirzepatide", "30mg", 180, 1658, 7800, 13650),
  row("Tirzepatide", "60mg", 216, 2067, 9360, 16380),
  row("Thymalin", "10mg", 17, 155, 728, 1365),
  row("VIP", "10mg", 35, 321, 1612, 2821),
]);

const SUPPLIER_NAME_ALIASES: Record<string, string> = {
  "thymosin-alpha-1-ta1": "thymosin-alpha-1",
};

export function supplierSheetKey(name: string, dose: string) {
  const nameSlug = SUPPLIER_NAME_ALIASES[slug(name)] ?? slug(name);
  return `${nameSlug}:${slug(dose)}`;
}

export function supplierTierCosts(name: string, dose: string) {
  return SUPPLIER_SHEET_COSTS[supplierSheetKey(name, dose)];
}

/** The standard cost used by retail and profit calculations. */
export function supplierStandardCost(name: string, dose: string) {
  return supplierTierCosts(name, dose)?.standardUnit ?? null;
}

/** Supplier cost for a projected lot, expressed per vial. */
export function supplierProjectedUnitCost(name: string, dose: string, qty: number) {
  const costs = supplierTierCosts(name, dose);
  if (!costs) return null;
  if (qty >= 100) return costs.unit100;
  if (qty >= 50) return costs.unit50;
  return costs.standardUnit;
}

/**
 * These current catalog rows have no exact supplier-sheet row. They remain
 * price-visible with a null cost rather than having cost inferred from another
 * strength; cost-based projections stay unknown until matched. The retired HCG
 * row remains in this audit list for historical traceability, but it is not
 * part of PRODUCTS and therefore cannot enter active P&L or recommendations.
 */
export const SUPPLIER_SHEET_AMBIGUITIES = [
  "Semaglutide 15mg — no exact row on the uploaded sheet",
  "Tirzepatide 15mg — no exact row on the uploaded sheet",
  "HCG 5000IU — no exact row on the uploaded sheet",
  "SLU-PP-332 5mg — no exact row on the uploaded sheet",
] as const;

/**
 * Legible supplier-sheet rows deliberately outside the current buyable
 * catalog. Keep this list explicit so a sheet refresh cannot silently expand
 * the catalog or financial projections.
 */
export const SUPPLIER_SHEET_OMISSIONS = [
  "FST/Follistatin 344 95%, 1mg",
  "Tesamorelin 6mg + Ipam 3mg + CJC 3mg",
  "Tesamorelin 10mg + Ipam 10mg",
  "Thymosin Alpha-1 (TA1), 10mg",
  "Kisspeptin 10mg",
  "Methylene Blue 50mg",
  "Oxytocin 10mg",
  "NAC 600mg",
  "Taurine 10g",
  "Klotho (KLB) 10mg",
  "PEG-MGF 2mg",
  "IGF-1 DES 1mg",
  "Vitality 10mg",
] as const;