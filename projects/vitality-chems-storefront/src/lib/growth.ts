/** Compliant acquisition playbook. Not medical advertising. */

export const LONG_TAIL_KEYWORDS = [
  "HPLC documented research peptides supplier",
  "research use only lyophilized peptides COA",
  "BPC-157 research peptide CAS 137525-51-0",
  "tirzepatide analytical standard HPLC",
  "semaglutide laboratory reference material",
  "retatrutide research compound COA",
  "third party HPLC peptide testing",
  "lyophilized peptide vial research only Chicago",
  "in vitro GLP-1 analogue for assay development",
  "TB-500 thymosin beta-4 fragment research",
  "GHK-Cu copper tripeptide analytical standard",
  "CJC-1295 no DAC research peptide",
  "qualified researcher peptide supplier United States",
];

export const AD_ANGLES = [
  {
    channel: "Google Search (research intent)",
    note: "Google frequently restricts ads that name GLP-1 drugs or imply weight loss. Bid on laboratory-supply language, not consumer outcomes.",
    headlines: [
      "HPLC-Documented Research Peptides",
      "COA With Every Research Lot",
      "Lyophilized Vials · Lab Use Only",
      "≥99% HPLC Release Spec",
      "US Same-Day Research Dispatch",
      "Not For Human Consumption",
    ],
    descriptions: [
      "Research-use-only peptides with HPLC and LC-MS identity. Sold to qualified laboratories. Not a drug. Not FDA approved.",
      "Semaglutide, tirzepatide, BPC-157 and the full catalog as analytical materials. 21+ researchers only.",
    ],
  },
  {
    channel: "Bing / Microsoft Ads",
    note: "Often the path of least resistance when Google rejects peptide keywords. Same RUO copy — never ‘for sale for weight loss’.",
    headlines: [
      "Laboratory Peptide Standards",
      "Third-Party COA Included",
      "Chicago Research Supplier",
    ],
    descriptions: [
      "Documented research compounds for in-vitro and analytical work. US fulfillment. Discrete unlabeled packaging. Pay shipping. Save 8% with crypto.",
    ],
  },
  {
    channel: "Meta / native (static — replica of what actually converts)",
    note: "Highest-converting competitor creatives are a black studio vial, HPLC %, a single price, and RUO in 8pt. Never a body, never a before/after, never ‘weight loss’.",
    headlines: [
      "HPLC-documented. Research use only.",
      "Semaglutide 5 mg · $64.99",
      "Tirzepatide 10 mg · $99",
      "3 vials · 8% lab rate · 10 vials · 18%",
      "Pay crypto. Save 8%.",
    ],
    descriptions: [
      "Black field. Celtic-knot mark. One vial. Purple dose band. Caption: compound + mg + HPLC + ‘Not for human consumption.’ CTA: Shop the catalog.",
      "Carousel 2: bulk math — 1 vial vs 3 vs 10. Carousel 3: COA crop. Same style Peptide Sciences / Limitless use; we are not inventing a new language.",
    ],
  },
  {
    channel: "Organic / SEO (highest durable ROI)",
    note: "Peptide Sciences, Limitless, and similar catalogs convert on CAS pages, COA language, and category hubs — not hype. This site now has family hubs, CAS on PDPs, and JSON-LD.",
    headlines: [
      "Publish one CAS + HPLC page per compound (already on each PDP)",
      "Earn links from lab blogs with testing methodology, not discount codes",
    ],
    descriptions: [
      "Long-tail pages that already exist: /testing, /legal/research-use, compound PDPs with CAS numbers.",
    ],
  },
];

export const BACKLINK_TARGETS = [
  {
    type: "Analytical chemistry blogs & HPLC method notes",
    why: "DA/DR follows topical relevance. A COA/testing page is the asset they will actually cite.",
    pitch:
      "Offer a technical guest note on lyophilized peptide HPLC identity confirmation (no product hype). Link to /testing.",
  },
  {
    type: "University core-facility resource lists",
    why: "High DR .edu lists of reagent vendors. They link only to RUO suppliers with CAS + COA.",
    pitch:
      "Request listing as a research-chemical vendor. Attach HPLC spec and Illinois business address.",
  },
  {
    type: "Lab-supply directories (LabX, Bioscience Today, SelectScience)",
    why: "Competitors already sit here. This is the wheel — do not reinvent it.",
    pitch: "Submit vendor profile: HPLC peptides, research use only, US fulfillment.",
  },
  {
    type: "Industry citations of CAS numbers",
    why: "Compound PDPs with CAS, formula, and MW are what rank for ‘[peptide] CAS’ queries.",
    pitch: "No outreach needed — keep PDPs unique and crawlable (now in place).",
  },
];

export const OUTREACH_EMAIL = `Subject: Research-use peptide HPLC notes for your readers

Hello,

I’m with Vitality Supply, a Chicago laboratory-supply company (2045 W Grand Ave, Unit B, Chicago, IL 60612). We publish batch HPLC/LC-MS documentation for lyophilized research peptides sold strictly for in-vitro use — not for human consumption.

If you maintain a reagent or methods resource, you are welcome to cite our testing standards page. We can also contribute a short technical note on identity confirmation of lyophilized peptides (CAS, HPLC, LC-MS) with no consumer claims.

Thank you for your time.
Vitality Supply
Vitalitysupply@icloud.com
(779) 717-4445`;

export function recommendationsFromFunnel(input: {
  views: number;
  productViews: number;
  addToCarts: number;
  checkouts: number;
  orders: number;
  topViewed: string[];
  topPurchased: string[];
}) {
  const tips: { title: string; body: string }[] = [];
  const viewToCart = input.views ? input.addToCarts / input.views : 0;
  const cartToBuy = input.addToCarts ? input.orders / input.addToCarts : 0;
  const checkoutToBuy = input.checkouts ? input.orders / input.checkouts : 0;

  if (input.views < 20) {
    tips.push({
      title: "Not enough traffic to read conversion yet",
      body: "Run the Bing/research-intent ads and the outreach email before changing the storefront. Conversion math is noise under ~100 sessions.",
    });
  }
  if (viewToCart < 0.04 && input.views >= 20) {
    tips.push({
      title: "Visitors are not adding to cart",
      body: "Lead with bestsellers (already first). Keep price visible on the card and the HPLC badge on the photo — that is what converting catalogs do.",
    });
  }
  if (cartToBuy < 0.2 && input.addToCarts >= 8) {
    tips.push({
      title: "Carts are stalling",
      body: "Keep reconstitution water as a cart add-on and the 8% crypto close. Do not add extra form fields. Shipping is always billed — say it once, then sell the lab rate.",
    });
  }
  if (checkoutToBuy < 0.5 && input.checkouts >= 5) {
    tips.push({
      title: "Checkout drop-off",
      body: "The attestation checkboxes are required for Illinois/FDA posture. Do not remove them. Make sure the lab-name field is optional so qualified buyers are not blocked.",
    });
  }
  if (input.topViewed[0] && input.topViewed[0] !== input.topPurchased[0]) {
    tips.push({
      title: `${input.topViewed[0]} is viewed more than it is purchased`,
      body: "Keep it in bestsellers. Check that the photographed dose matches the selected variant — mismatched vials kill trust.",
    });
  }
  if (!tips.length) {
    tips.push({
      title: "Funnel looks healthy",
      body: "Keep spend on the search terms that already convert: HPLC research peptides, CAS + compound name, and brand searches. Do not buy ‘semaglutide for sale’ — those ads get banned and attract the wrong buyer.",
    });
  }
  return tips;
}
