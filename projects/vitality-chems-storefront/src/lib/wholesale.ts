/** Your Integrity Research invoice cost vs storefront sell. Not shown to customers. */

export type Offer = { dose: string; cost: number; sell: number };

export type FormKey = "vial" | "liquid" | "capsule" | "spray" | "topical";

/**
 * Pricing doctrine (USA 2026 research-peptide storefronts):
 * - Aggregator floor is ~1.4–1.8× your 1-bottle cost and looks grey-market.
 * - Peptide Sciences / Limitless-style premium sits 2.0–2.6× and is where
 *   labs actually convert (COA + HPLC + US ship).
 * - Charm endings (.99 / $99 / $149 / $199) beat round tens.
 * - GLP heroes: ~2.1–2.3× except Retatrutide 10 mg (traffic hook at $99).
 * - Workhorses (BPC, TB, GHK): 2.6–3.0× — still under Limitless / historic Peptide Sciences.
 * - Small vials: never list under ~$40 or the lot looks untested.
 * - Nasal/caps already have high invoice cost → 1.85–2.15×.
 */
export const OFFERS: Record<string, Offer[]> = {
  "vial:semaglutide": [
    { dose: "5mg", cost: 33, sell: 69.99 },
    { dose: "10mg", cost: 49.5, sell: 109 },
    { dose: "15mg", cost: 71.5, sell: 159 },
    { dose: "20mg", cost: 99, sell: 219 },
    { dose: "30mg", cost: 121, sell: 259 },
  ],
  "vial:tirzepatide": [
    { dose: "10mg", cost: 55, sell: 109 },
    { dose: "15mg", cost: 82.5, sell: 179 },
    { dose: "20mg", cost: 110, sell: 239 },
    { dose: "30mg", cost: 165, sell: 329 },
    { dose: "60mg", cost: 198, sell: 429 },
  ],
  "vial:retatrutide": [
    { dose: "10mg", cost: 71.5, sell: 99 },
    { dose: "20mg", cost: 82.5, sell: 199 },
    { dose: "30mg", cost: 110, sell: 269 },
  ],
  "vial:bpc-157": [
    { dose: "5mg", cost: 22, sell: 64.99 },
    { dose: "10mg", cost: 27.5, sell: 79 },
  ],
  "vial:tb-500": [
    { dose: "5mg", cost: 27.5, sell: 74.99 },
    { dose: "10mg", cost: 44, sell: 119 },
  ],
  "vial:bpc-tb-blend": [{ dose: "10mg/10mg", cost: 47.3, sell: 119 }],
  "vial:klow": [{ dose: "80mg", cost: 69.3, sell: 169 }],
  "vial:glow": [{ dose: "10/10/50mg", cost: 59.4, sell: 149 }],
  "vial:cjc-1295-w-o-dac-ipamorelin": [{ dose: "5mg/5mg", cost: 26.4, sell: 64.99 }],
  "vial:ghk-cu": [
    { dose: "50mg", cost: 18.7, sell: 59.99 },
    { dose: "100mg", cost: 30.8, sell: 89.99 },
  ],
  "vial:nad": [{ dose: "500mg", cost: 33, sell: 89.99 }],
  "vial:tesamorelin": [
    { dose: "5mg", cost: 28.6, sell: 69.99 },
    { dose: "10mg", cost: 48.4, sell: 109.99 },
  ],
  "vial:ipamorelin": [
    { dose: "5mg", cost: 16.5, sell: 44.99 },
    { dose: "10mg", cost: 22, sell: 54.99 },
  ],
  "vial:aod-9604": [{ dose: "5mg", cost: 29.7, sell: 69.99 }],
  "vial:mots-c": [
    { dose: "10mg", cost: 33, sell: 79.99 },
    { dose: "40mg", cost: 41.8, sell: 99 },
  ],
  "vial:glutathione": [{ dose: "1500mg", cost: 24.2, sell: 59.99 }],
  "vial:pt-141": [{ dose: "10mg", cost: 22, sell: 54.99 }],
  "vial:5-amino-1mq": [{ dose: "5mg", cost: 24.2, sell: 59.99 }],
  "vial:sermorelin": [
    { dose: "5mg", cost: 22, sell: 54.99 },
    { dose: "10mg", cost: 38.5, sell: 89.99 },
  ],
  "vial:cjc-1295-no-dac": [
    { dose: "5mg", cost: 20.9, sell: 54.99 },
    { dose: "10mg", cost: 37.4, sell: 89.99 },
  ],
  "vial:frag-176-191": [{ dose: "5mg", cost: 24.2, sell: 59.99 }],
  "vial:epithalon": [
    { dose: "10mg", cost: 13.2, sell: 39.99 },
    { dose: "50mg", cost: 39.6, sell: 94.99 },
  ],
  "vial:ghrp-2": [
    { dose: "5mg", cost: 17.6, sell: 44.99 },
    { dose: "10mg", cost: 22, sell: 54.99 },
  ],
  "vial:ghrp-6": [
    { dose: "5mg", cost: 17.6, sell: 44.99 },
    { dose: "10mg", cost: 22, sell: 54.99 },
  ],
  "vial:hexarelin": [{ dose: "5mg", cost: 24.2, sell: 59.99 }],
  "vial:igf-1-lr3": [{ dose: "1mg", cost: 52.8, sell: 119 }],
  "vial:cagrilintide": [{ dose: "10mg", cost: 55, sell: 119 }],
  "vial:selank": [
    { dose: "5mg", cost: 16.5, sell: 44.99 },
    { dose: "10mg", cost: 24.2, sell: 59.99 },
  ],
  "vial:semax": [{ dose: "10mg", cost: 26.4, sell: 64.99 }],
  "vial:kisspeptin": [{ dose: "5mg", cost: 19.8, sell: 49.99 }],
  "vial:ll-37": [{ dose: "5mg", cost: 24.2, sell: 59.99 }],
  "vial:kpv": [{ dose: "10mg", cost: 19.8, sell: 49.99 }],
  "vial:ss-31": [
    { dose: "10mg", cost: 24.2, sell: 59.99 },
    { dose: "50mg", cost: 81.4, sell: 179 },
  ],
  "vial:slu-pp-332": [{ dose: "5mg", cost: 26.4, sell: 64.99 }],
  "vial:mt-2": [{ dose: "10mg", cost: 17.6, sell: 44.99 }],
  "vial:melanotan-1": [{ dose: "10mg", cost: 15.4, sell: 39.99 }],
  "vial:thymosin-alpha-1-ta1": [{ dose: "5mg", cost: 30.8, sell: 74.99 }],
  "vial:thymalin": [{ dose: "10mg", cost: 15.4, sell: 39.99 }],
  "vial:ara-290": [{ dose: "10mg", cost: 18.7, sell: 49.99 }],
  "vial:dsip": [{ dose: "5mg", cost: 16.5, sell: 44.99 }],
  "vial:oxytocin": [{ dose: "5mg", cost: 16.5, sell: 44.99 }],
  "vial:pinealon": [{ dose: "10mg", cost: 18.7, sell: 49.99 }],
  "vial:vip": [{ dose: "10mg", cost: 31.9, sell: 74.99 }],
  "vial:snap-8": [{ dose: "10mg", cost: 19.8, sell: 49.99 }],
  "vial:hcg": [{ dose: "5000iu", cost: 20.9, sell: 54.99 }],
  "vial:cjc-1295-with-dac": [{ dose: "5mg", cost: 39.6, sell: 94.99 }],
  "vial:ac-ac-blend": [{ dose: "3mL", cost: 5.5, sell: 14.99 }],
  "vial:reconstitution-water": [{ dose: "10mL", cost: 8.8, sell: 19.99 }],

  "spray:aod-9604": [{ dose: "0.5mg · 30mL", cost: 60.5, sell: 109.99 }],
  "spray:ipamorelin": [{ dose: "0.5mg · 30mL", cost: 44, sell: 79.99 }],
  "spray:cjc-1295-w-o-dac": [{ dose: "0.5mg · 30mL", cost: 49.5, sell: 89.99 }],
  "spray:cjc-1295-ipamorelin-blend": [{ dose: "0.5mg/0.5mg · 30mL", cost: 71.5, sell: 129.99 }],
  "spray:igf-1-des": [{ dose: "0.1mg · 30mL", cost: 44, sell: 79.99 }],
  "spray:frag-176-191": [{ dose: "0.5mg · 30mL", cost: 49.5, sell: 89.99 }],
  "spray:mt-2": [{ dose: "1mg · 30mL", cost: 44, sell: 79.99 }],
  "spray:pt-141": [{ dose: "1mg · 30mL", cost: 44, sell: 79.99 }],
  "spray:semax": [{ dose: "1mg · 30mL", cost: 38.5, sell: 69.99 }],
  "spray:selank": [{ dose: "1mg · 30mL", cost: 38.5, sell: 69.99 }],
  "spray:selank-semax-blend": [{ dose: "1mg/1mg · 30mL", cost: 55, sell: 99 }],
  "spray:nad": [{ dose: "30mg · 30mL", cost: 33, sell: 59.99 }],
  "spray:bpc-157": [{ dose: "0.5mg · 30mL", cost: 44, sell: 79.99 }],
  "spray:tb-500": [{ dose: "0.5mg · 30mL", cost: 44, sell: 79.99 }],
  "spray:tb-500-bpc-157-blend": [{ dose: "0.5mg/0.5mg · 30mL", cost: 55, sell: 99 }],

  "liquid:ghk-cu": [{ dose: "1mg · 30mL", cost: 33, sell: 64.99 }],
  "liquid:aminotada": [{ dose: "20mg · 30mL", cost: 22, sell: 49.99 }],
  "liquid:methylene-blue-analytical-grade": [{ dose: "1% · 30mL", cost: 16.5, sell: 34.99 }],

  "capsule:orforglipron": [{ dose: "6mg · 90 ct", cost: 99, sell: 189.99 }],
  "capsule:aod-9604": [{ dose: "300mcg · 30 ct", cost: 24.75, sell: 54.99 }],
  "capsule:ghk-cu": [{ dose: "2.5mg · 60 ct", cost: 33, sell: 69.99 }],
  "capsule:bpc-157": [{ dose: "500mcg · 30 ct", cost: 22.55, sell: 49.99 }],
  "capsule:tb-500": [{ dose: "500mcg · 30 ct", cost: 22.55, sell: 49.99 }],
  "capsule:tb-500-bpc-157-blend": [{ dose: "500/200mcg · 30 ct", cost: 35.75, sell: 74.99 }],
  "capsule:kpv": [{ dose: "500mcg · 30 ct", cost: 22, sell: 49.99 }],
  "capsule:tesofensine": [{ dose: "500mcg · 30 ct", cost: 35.75, sell: 74.99 }],
  "capsule:5-amino-1mq": [{ dose: "50mg · 60 ct", cost: 35.75, sell: 74.99 }],
  "capsule:enclomiphene": [
    { dose: "12.5mg · 30 ct", cost: 22, sell: 49.99 },
    { dose: "12.5mg · 60 ct", cost: 33, sell: 69.99 },
  ],
  "capsule:nmn": [{ dose: "500mg · 60 ct", cost: 16.5, sell: 39.99 }],
  "capsule:dihexa": [
    { dose: "5mg · 60 ct", cost: 33, sell: 69.99 },
    { dose: "10mg · 60 ct", cost: 49.5, sell: 99 },
  ],
  "capsule:aminotada": [
    { dose: "10mg · 60 ct", cost: 16.5, sell: 39.99 },
    { dose: "20mg · 60 ct", cost: 22, sell: 49.99 },
  ],
  "capsule:oxytocin": [{ dose: "6mg · 30 ct", cost: 49.5, sell: 99 }],
  "capsule:para-x-expel-blend": [{ dose: "74mg/4mg · 90 ct", cost: 42, sell: 79.99 }],
  "capsule:para-x-ivermectin": [{ dose: "4mg · 90 ct", cost: 28, sell: 54.99 }],

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
  const gross = row.sell - row.cost;
  return { gross, pct: row.sell <= 0 ? 0 : gross / row.sell };
}

export const PRICE_NOTES: { sku: string; change: string; why: string }[] = [
  {
    sku: "Retatrutide 10 mg",
    change: "List $99 (only 1.38× cost). Do not raise.",
    why: "Your invoice ($71.50) is already above the USA median (~$55–$90). This SKU is a traffic hook. Margin lives on 20 mg ($179, 2.17×) and 30 mg ($239).",
  },
  {
    sku: "Tirzepatide 10 mg",
    change: "$110 → $99.",
    why: "Sits on the $99 charm that converts. 10 mg at $119 bounced vs Amino Club / EZ. 15–60 mg recover margin.",
  },
  {
    sku: "Semaglutide 5 mg",
    change: "$72.99 → $64.99.",
    why: "Happy zone is $55–$70. $65 is premium vs $49 aggregator ads without looking grey.",
  },
  {
    sku: "Semaglutide 10–30 mg",
    change: "Ladder $99 / $149 / $199 / $239.",
    why: "Teaches the buyer that larger vials are the smart purchase. Your 30 mg cost/mg is the best in the family.",
  },
  {
    sku: "Dropped SKUs",
    change: "Removed every mg not on your invoice, plus Mazdutide, Survodutide, Reta 15 mg (struck), NAD 100 mg, BPC 20 mg, KPV 5 mg, DSIP 10 mg, SARMs, G-01.",
    why: "Listing milligrams you cannot fill is the #1 refund / chargeback trigger in this niche.",
  },
  {
    sku: "Target margin",
    change: "48–60% gross on most vials. 28% on Reta 10 mg. 50%+ on blends and GHK.",
    why: "US storefronts that last run ~45–65% after 10-vial kits, not 80%. Kits at −15% still leave ~2× on your 10-bottle cost.",
  },
];