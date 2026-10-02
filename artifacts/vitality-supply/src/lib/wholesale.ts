/** Your Integrity Research invoice cost vs storefront sell. Not shown to customers. */

import { supplierStandardCost } from "./supplier-sheet";

export type Offer = { dose: string; cost: number | null; sell: number; pricingFlag?: "cost-missing" };

export type FormKey = "vial" | "liquid" | "capsule" | "spray" | "topical";

/** Owner-supplied single-unit cost and deterministic retail; see docs/pricing-model.md. */
export const RETAIL_PRICE_CHANGES = [
  {
    sku: "Tirzepatide 30mg",
    priorRetail: 330.99,
    currentRetail: 331.99,
    reason: "Supplier-sheet cost floor",
  },
  {
    sku: "Ipamorelin 10mg",
    priorRetail: 54.99,
    currentRetail: 57.99,
    reason: "Supplier-sheet cost floor",
  },
  {
    sku: "Kisspeptin 5mg",
    priorRetail: 49.99,
    currentRetail: 53.99,
    reason: "Supplier-sheet cost floor",
  },
  {
    sku: "Snap-8 10mg",
    priorRetail: 49.99,
    currentRetail: 53.99,
    reason: "Supplier-sheet cost floor",
  },
] as const;

export const OFFERS: Record<string, Offer[]> = {
  "vial:semaglutide": [
    { dose: "5mg", cost: supplierStandardCost("Semaglutide", "5mg"), sell: 69.99 },
    { dose: "10mg", cost: supplierStandardCost("Semaglutide", "10mg"), sell: 109 },
    { dose: "15mg", cost: null, sell: 159, pricingFlag: "cost-missing" },
    { dose: "20mg", cost: supplierStandardCost("Semaglutide", "20mg"), sell: 219 },
    { dose: "30mg", cost: supplierStandardCost("Semaglutide", "30mg"), sell: 259 },
  ],
  "vial:tirzepatide": [
    { dose: "10mg", cost: supplierStandardCost("Tirzepatide", "10mg"), sell: 110.99 },
    { dose: "15mg", cost: null, sell: 179, pricingFlag: "cost-missing" },
    { dose: "20mg", cost: supplierStandardCost("Tirzepatide", "20mg"), sell: 239 },
    { dose: "30mg", cost: supplierStandardCost("Tirzepatide", "30mg"), sell: 331.99 },
    { dose: "60mg", cost: supplierStandardCost("Tirzepatide", "60mg"), sell: 429 },
  ],
  "vial:retatrutide": [
    { dose: "10mg", cost: supplierStandardCost("Retatrutide", "10mg"), sell: 143.99 },
    { dose: "20mg", cost: supplierStandardCost("Retatrutide", "20mg"), sell: 199 },
    { dose: "30mg", cost: supplierStandardCost("Retatrutide", "30mg"), sell: 269 },
  ],
  "vial:bpc-157": [
    { dose: "5mg", cost: supplierStandardCost("BPC-157", "5mg"), sell: 64.99 },
    { dose: "10mg", cost: supplierStandardCost("BPC-157", "10mg"), sell: 79 },
  ],
  "vial:tb-500": [
    { dose: "5mg", cost: supplierStandardCost("TB-500", "5mg"), sell: 74.99 },
    { dose: "10mg", cost: supplierStandardCost("TB-500", "10mg"), sell: 119 },
  ],
  "vial:bpc-tb-blend": [{ dose: "10mg/10mg", cost: supplierStandardCost("BPC/TB Blend", "10mg/10mg"), sell: 119 }],
  "vial:klow": [{ dose: "80mg", cost: supplierStandardCost("KLOW", "80mg"), sell: 169 }],
  "vial:glow": [{ dose: "10/10/50mg", cost: supplierStandardCost("Glow", "10/10/50mg"), sell: 149 }],
  "vial:cjc-1295-w-o-dac-ipamorelin": [{ dose: "5mg/5mg", cost: supplierStandardCost("CJC-1295 w/o DAC + Ipamorelin", "5mg/5mg"), sell: 64.99 }],
  "vial:ghk-cu": [
    { dose: "50mg", cost: supplierStandardCost("GHK-Cu", "50mg"), sell: 59.99 },
    { dose: "100mg", cost: supplierStandardCost("GHK-Cu", "100mg"), sell: 89.99 },
  ],
  "vial:nad": [{ dose: "500mg", cost: supplierStandardCost("NAD+", "500mg"), sell: 89.99 }],
  "vial:tesamorelin": [
    { dose: "5mg", cost: supplierStandardCost("Tesamorelin", "5mg"), sell: 69.99 },
    { dose: "10mg", cost: supplierStandardCost("Tesamorelin", "10mg"), sell: 109.99 },
  ],
  "vial:ipamorelin": [
    { dose: "5mg", cost: supplierStandardCost("Ipamorelin", "5mg"), sell: 44.99 },
    { dose: "10mg", cost: supplierStandardCost("Ipamorelin", "10mg"), sell: 57.99 },
  ],
  "vial:aod-9604": [{ dose: "5mg", cost: supplierStandardCost("AOD-9604", "5mg"), sell: 69.99 }],
  "vial:mots-c": [
    { dose: "10mg", cost: supplierStandardCost("MOTS-C", "10mg"), sell: 79.99 },
    { dose: "40mg", cost: supplierStandardCost("MOTS-C", "40mg"), sell: 99 },
  ],
  "vial:glutathione": [{ dose: "1500mg", cost: supplierStandardCost("Glutathione", "1500mg"), sell: 59.99 }],
  "vial:pt-141": [{ dose: "10mg", cost: supplierStandardCost("PT-141", "10mg"), sell: 54.99 }],
  "vial:5-amino-1mq": [{ dose: "5mg", cost: supplierStandardCost("5-Amino-1MQ", "5mg"), sell: 59.99 }],
  "vial:sermorelin": [
    { dose: "5mg", cost: supplierStandardCost("Sermorelin", "5mg"), sell: 54.99 },
    { dose: "10mg", cost: supplierStandardCost("Sermorelin", "10mg"), sell: 89.99 },
  ],
  "vial:cjc-1295-no-dac": [
    { dose: "5mg", cost: supplierStandardCost("CJC-1295 no DAC", "5mg"), sell: 54.99 },
    { dose: "10mg", cost: supplierStandardCost("CJC-1295 no DAC", "10mg"), sell: 89.99 },
  ],
  "vial:frag-176-191": [{ dose: "5mg", cost: supplierStandardCost("Frag 176-191", "5mg"), sell: 59.99 }],
  "vial:epithalon": [
    { dose: "10mg", cost: supplierStandardCost("Epithalon", "10mg"), sell: 39.99 },
    { dose: "50mg", cost: supplierStandardCost("Epithalon", "50mg"), sell: 94.99 },
  ],
  "vial:ghrp-2": [
    { dose: "5mg", cost: supplierStandardCost("GHRP-2", "5mg"), sell: 44.99 },
    { dose: "10mg", cost: supplierStandardCost("GHRP-2", "10mg"), sell: 54.99 },
  ],
  "vial:ghrp-6": [
    { dose: "5mg", cost: supplierStandardCost("GHRP-6", "5mg"), sell: 44.99 },
    { dose: "10mg", cost: supplierStandardCost("GHRP-6", "10mg"), sell: 54.99 },
  ],
  "vial:hexarelin": [{ dose: "5mg", cost: supplierStandardCost("Hexarelin", "5mg"), sell: 59.99 }],
  "vial:igf-1-lr3": [{ dose: "1mg", cost: supplierStandardCost("IGF-1 LR3", "1mg"), sell: 119 }],
  "vial:cagrilintide": [{ dose: "10mg", cost: supplierStandardCost("Cagrilintide", "10mg"), sell: 119 }],
  "vial:selank": [
    { dose: "5mg", cost: supplierStandardCost("Selank", "5mg"), sell: 44.99 },
    { dose: "10mg", cost: supplierStandardCost("Selank", "10mg"), sell: 59.99 },
  ],
  "vial:semax": [{ dose: "10mg", cost: supplierStandardCost("Semax", "10mg"), sell: 64.99 }],
  "vial:kisspeptin": [{ dose: "5mg", cost: supplierStandardCost("Kisspeptin", "5mg"), sell: 53.99 }],
  "vial:ll-37": [{ dose: "5mg", cost: supplierStandardCost("LL-37", "5mg"), sell: 59.99 }],
  "vial:kpv": [{ dose: "10mg", cost: supplierStandardCost("KPV", "10mg"), sell: 49.99 }],
  "vial:ss-31": [
    { dose: "10mg", cost: supplierStandardCost("SS-31", "10mg"), sell: 59.99 },
    { dose: "50mg", cost: supplierStandardCost("SS-31", "50mg"), sell: 179 },
  ],
  "vial:slu-pp-332": [{ dose: "5mg", cost: null, sell: 64.99, pricingFlag: "cost-missing" }],
  "vial:mt-2": [{ dose: "10mg", cost: supplierStandardCost("MT-2", "10mg"), sell: 44.99 }],
  "vial:melanotan-1": [{ dose: "10mg", cost: supplierStandardCost("Melanotan-1", "10mg"), sell: 39.99 }],
  "vial:thymosin-alpha-1-ta1": [{ dose: "5mg", cost: supplierStandardCost("Thymosin Alpha-1", "5mg"), sell: 74.99 }],
  "vial:thymalin": [{ dose: "10mg", cost: supplierStandardCost("Thymalin", "10mg"), sell: 39.99 }],
  "vial:ara-290": [{ dose: "10mg", cost: supplierStandardCost("ARA-290", "10mg"), sell: 49.99 }],
  "vial:dsip": [{ dose: "5mg", cost: supplierStandardCost("DSIP", "5mg"), sell: 44.99 }],
  "vial:oxytocin": [{ dose: "5mg", cost: supplierStandardCost("Oxytocin", "5mg"), sell: 44.99 }],
  "vial:pinealon": [{ dose: "10mg", cost: supplierStandardCost("Pinealon", "10mg"), sell: 49.99 }],
  "vial:vip": [{ dose: "10mg", cost: supplierStandardCost("VIP", "10mg"), sell: 74.99 }],
  "vial:snap-8": [{ dose: "10mg", cost: supplierStandardCost("Snap-8", "10mg"), sell: 53.99 }],
  "vial:hcg": [{ dose: "5000iu", cost: null, sell: 54.99, pricingFlag: "cost-missing" }],
  "vial:cjc-1295-with-dac": [{ dose: "5mg", cost: supplierStandardCost("CJC-1295 with DAC", "5mg"), sell: 94.99 }],
  "vial:ac-ac-blend": [{ dose: "3mL", cost: supplierStandardCost("AC/AC Blend", "3mL"), sell: 14.99 }],
  "vial:reconstitution-water": [{ dose: "10mL", cost: null, sell: 19.99, pricingFlag: "cost-missing" }],

  "spray:aod-9604": [{ dose: "0.5mg · 30mL", cost: 60.5, sell: 121.99 }],
  "spray:ipamorelin": [{ dose: "0.5mg · 30mL", cost: 44, sell: 88.99 }],
  "spray:cjc-1295-w-o-dac": [{ dose: "0.5mg · 30mL", cost: 44, sell: 89.99 }],
  "spray:cjc-1295-ipamorelin-blend": [{ dose: "0.5mg/0.5mg · 30mL", cost: 71.5, sell: 143.99 }],
  "spray:igf-1-des": [{ dose: "0.1mg · 30mL", cost: 44, sell: 88.99 }],
  "spray:frag-176-191": [{ dose: "0.5mg · 30mL", cost: 49.5, sell: 99.99 }],
  "spray:mt-2": [{ dose: "1mg · 30mL", cost: 44, sell: 88.99 }],
  "spray:pt-141": [{ dose: "1mg · 30mL", cost: 44, sell: 88.99 }],
  "spray:semax": [{ dose: "1mg · 30mL", cost: 38.5, sell: 77.99 }],
  "spray:selank": [{ dose: "1mg · 30mL", cost: 38.5, sell: 77.99 }],
  "spray:selank-semax-blend": [{ dose: "1mg/1mg · 30mL", cost: 55, sell: 110.99 }],
  "spray:nad": [{ dose: "30mg · 30mL", cost: 33, sell: 66.99 }],
  "spray:bpc-157": [{ dose: "0.5mg · 30mL", cost: 44, sell: 88.99 }],
  "spray:tb-500": [{ dose: "0.5mg · 30mL", cost: 44, sell: 88.99 }],
  "spray:tb-500-bpc-157-blend": [{ dose: "0.5mg/0.5mg · 30mL", cost: 55, sell: 110.99 }],

  "liquid:ghk-cu": [{ dose: "1mg · 30mL", cost: 33, sell: 66.99 }],
  "liquid:aminotada": [{ dose: "20mg · 30mL", cost: 22, sell: 49.99 }],
  "liquid:methylene-blue-analytical-grade": [{ dose: "1% · 30mL", cost: 16.5, sell: 34.99 }],

  "capsule:orforglipron": [{ dose: "6mg · 90 ct", cost: 99, sell: 198.99 }],
  "capsule:aod-9604": [{ dose: "300mcg · 30 ct", cost: 24.75, sell: 54.99 }],
  "capsule:ghk-cu": [{ dose: "2.5mg · 60 ct", cost: 33, sell: 69.99 }],
  "capsule:bpc-157": [{ dose: "500mcg · 30 ct", cost: 22.55, sell: 49.99 }],
  "capsule:tb-500": [{ dose: "500mcg · 30 ct", cost: 22.55, sell: 49.99 }],
  "capsule:tb-500-bpc-157-blend": [{ dose: "500/200mcg · 30 ct", cost: 35.75, sell: 74.99 }],
  "capsule:kpv": [{ dose: "500mcg · 30 ct", cost: 22, sell: 49.99 }],
  "capsule:tesofensine": [{ dose: "500mcg · 30 ct", cost: 35.75, sell: 74.99 }],
  "capsule:5-amino-1mq": [{ dose: "50mg · 60 ct", cost: 33, sell: 74.99 }],
  "capsule:enclomiphene": [
    { dose: "12.5mg · 30 ct", cost: 22, sell: 49.99 },
    { dose: "12.5mg · 60 ct", cost: 33, sell: 69.99 },
  ],
  "capsule:nmn": [{ dose: "500mg · 60 ct", cost: null, sell: 39.99, pricingFlag: "cost-missing" }],
  "capsule:dihexa": [
    { dose: "5mg · 60 ct", cost: 33, sell: 69.99 },
    { dose: "10mg · 60 ct", cost: 49.5, sell: 99 },
  ],
  "capsule:aminotada": [
    { dose: "10mg · 60 ct", cost: 16.5, sell: 39.99 },
    { dose: "20mg · 60 ct", cost: 22, sell: 49.99 },
  ],
  "capsule:oxytocin": [{ dose: "6mg · 30 ct", cost: 49.5, sell: 99 }],
  "capsule:para-x-expel-blend": [{ dose: "74mg/4mg · 90 ct", cost: null, sell: 79.99, pricingFlag: "cost-missing" }],
  "capsule:para-x-ivermectin": [{ dose: "4mg · 90 ct", cost: null, sell: 54.99, pricingFlag: "cost-missing" }],

  "topical:ghk-cu-cream": [{ dose: "15mg · 100mL", cost: 24.75, sell: 54.99 }],
  "topical:tb-500-bpc-157-blend-cream": [{ dose: "30mg · 100mL", cost: 49.5, sell: 99 }],
};

export function offerKey(form: FormKey, id: string) {
  return `${form}:${id}`;
}

export function offersFor(form: FormKey, id: string): { dose: string; price: number }[] {
  const rows = OFFERS[offerKey(form, id)];
  if (!rows?.length) return [];
  return rows.map((r) => ({ dose: r.dose, price: r.sell }));
}

export function marginOf(row: Offer) {
  const gross = row.cost == null ? null : row.sell - row.cost;
  return { gross, pct: gross == null || row.sell <= 0 ? null : gross / row.sell };
}

export const PRICE_NOTES: { sku: string; change: string; why: string }[] = [
  {
    sku: "Retail policy",
    change: "Keep prices at or above 50% margin; never automatically lower.",
    why: "Below-target SKUs move to the smallest .99 price that reaches 50% gross margin.",
  },
  {
    sku: "Missing costs",
    change: "Leave cost null and flag in P&L.",
    why: "No supplier cost is inferred from another dose, count, blend, or competitor.",
  },
  {
    sku: "Wholesale policy",
    change: "18% / 26% / 34% retail discounts, subject to cost floors.",
    why: "Actual 5 KITS and 10 KITS supplier unit costs drive projections; any vial SKU that cannot satisfy every tier invariant is hidden instead of publishing an invalid rate.",
  },
  {
    sku: "Market evidence",
    change: "Show a benchmark only for an exact public product + strength + vial match.",
    why: "Unbenchmarked SKUs stay flagged as unbenchmarked in pricing notes; competitor prices are not treated as an optimal demand price.",
  },
];