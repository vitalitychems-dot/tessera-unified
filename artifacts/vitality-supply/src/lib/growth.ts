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
    channel: "1 · Technical SEO — high impact / medium effort",
    note: "Provider eligibility is not assumed for research compounds or unapproved pharmaceuticals. Review the official policy links in the staff desk before any submission; do not disguise a listing. Build crawlable CAS, testing, category, and lot-documentation pages instead.",
    headlines: [
      "HPLC-Documented Research Peptides",
      "COA With Every Research Lot",
      "Lyophilized Vials · Lab Use Only",
      "≥99% HPLC Release Spec",
      "US Research Supply Catalog",
      "Not For Human Consumption",
    ],
    descriptions: [
      "Research-use-only peptides with HPLC and LC-MS identity. Sold to qualified laboratories. Not a drug. Not FDA approved.",
       "Browse documented analytical materials for qualified research organizations. No health or performance claims.",
    ],
  },
  {
    channel: "2 · Email newsletter — high impact / low effort",
    note: "Send opted-in researchers concise lot-documentation, catalog, and restock updates. Keep the message factual, RUO-only, and easy to unsubscribe from.",
    headlines: [
      "Laboratory Peptide Standards",
      "Third-Party COA Included",
      "New Lot Documentation Available",
    ],
    descriptions: [
      "New research lots and third-party documentation are available. For laboratory research only; not for human or animal use.",
    ],
  },
  {
    channel: "3 · X, Reddit & forums — medium impact / medium effort",
    note: "Participate organically only where promotion is allowed. Disclose affiliation, answer technical sourcing or testing questions, and follow each community’s rules. Never use health claims or spam links.",
    headlines: [
      "HPLC-documented. Research use only.",
      "Read the current third-party lot report",
      "Research-use-only catalog update",
      "Methods note: reading an HPLC report",
    ],
    descriptions: [
      "Share technical documentation or educational methods content only when it directly answers the discussion and links are permitted.",
      "Use a clear Vitality Chems affiliation disclosure. Do not imply clinical safety, efficacy, dosing, or intended human use.",
    ],
  },
  {
    channel: "4 · Affiliate & wholesale outreach — medium impact / medium effort",
    note: "Contact qualified labs and relevant publishers individually. Require compliant RUO copy, affiliation disclosure, and no health claims from partners.",
    headlines: [
      "Offer the transparent 10 / 50 / 100-unit procurement sheet",
      "Invite technical publishers to cite testing methodology",
    ],
    descriptions: [
      "Prioritize relevant, permission-based relationships over bulk cold email or paid links.",
    ],
  },
];

/**
 * These are the official policy pages an operator should review before asking
 * a provider to approve an ad. They are links for human review, not a live
 * policy API or an eligibility decision.
 */
export const AD_POLICY_SOURCES = [
  {
    provider: "Stripe",
    url: "https://stripe.com/legal/restricted-businesses",
    summary:
      "Stripe lists incorrectly labelled research chemicals, toxic materials, and unsafe or harmful-claim pseudo-pharmaceuticals among prohibited or restricted categories.",
    action: "Confirm the catalog, merchant category, and payment approval with Stripe before relying on checkout.",
  },
  {
    provider: "Stripe support FAQ",
    url: "https://support.stripe.com/questions/prohibited-and-restricted-businesses-list-faqs?locale=en-US",
    summary:
      "Stripe’s FAQ explains that product classification and approval can depend on the specific business and jurisdiction.",
    action: "Ask Stripe for a written determination when the catalog or intended use is not clearly covered.",
  },
  {
    provider: "Google Ads",
    url: "https://support.google.com/adspolicy/answer/176031",
    summary:
      "Google Ads healthcare and medicines rules apply to pharmaceutical and health-related advertising and can require country, certification, or approval conditions.",
    action: "Do not submit research-compound product ads unless Google confirms eligibility and any required approval is complete.",
  },
  {
    provider: "Meta",
    url: "https://transparency.meta.com/en-us/policies/ad-standards/restricted-goods-services/drugs-pharmaceuticals",
    summary:
      "Meta says ads cannot promote illicit or unsafe drugs, substances, products, or supplements; eligible prescription advertising has additional authorization requirements.",
    action: "Treat paid promotion as blocked pending Meta’s written authorization or applicable review path.",
  },
] as const;

export type AdFunnelSnapshot = {
  sessions: number;
  productViews: number;
  addToCarts: number;
  checkouts: number;
  orders: number;
  topViewed: string[];
  topPurchased: string[];
};

export type DailyAdRecommendation = {
  id: string;
  priority: "now" | "next" | "watch";
  channel: string;
  title: string;
  rationale: string;
  action: string;
  source: string;
};

/**
 * Build a review queue from the dashboard's existing first-party events and
 * the manually maintained strategy above. This deliberately does not fetch
 * the web, call an ad provider, or claim that an ad was approved or converted.
 */
export function buildOnDemandAdRecommendations(
  input: AdFunnelSnapshot,
): DailyAdRecommendation[] {
  const recommendations: DailyAdRecommendation[] = [];
  const sessions = Math.max(0, Number(input.sessions) || 0);
  const productViews = Math.max(0, Number(input.productViews) || 0);
  const addToCarts = Math.max(0, Number(input.addToCarts) || 0);
  const checkouts = Math.max(0, Number(input.checkouts) || 0);
  const orders = Math.max(0, Number(input.orders) || 0);

  recommendations.push({
    id: "paid-policy-review",
    priority: "now",
    channel: "Paid media",
    title: "Keep paid product ads paused pending provider review",
    rationale:
      "The current catalog and policy sources do not provide a confirmed approval for paid research-compound product ads.",
    action:
      "Ask Stripe, Google Ads, or Meta for a written eligibility decision before submitting creative. Do not disguise a listing or route around review.",
    source: "Official provider policy links below",
  });

  if (sessions < 100) {
    recommendations.push({
      id: "qualified-organic-baseline",
      priority: "now",
      channel: "Technical SEO",
      title: "Build a qualified organic baseline before changing creative",
      rationale: `${sessions} observed sessions are not enough to attribute a marketing change to conversion movement.`,
      action:
        "Publish one factual testing or lot-documentation update, then review the next dashboard snapshot. Keep copy research-use-only and avoid health claims.",
      source: "Dashboard sessions + Technical SEO strategy",
    });
  } else if (productViews > 0 && addToCarts / productViews < 0.04) {
    recommendations.push({
      id: "product-page-facts",
      priority: "next",
      channel: "Owned site",
      title: "Audit product-page facts before adding traffic",
      rationale: `The observed product-view to cart rate is ${((addToCarts / productViews) * 100).toFixed(1)}%; this is a funnel signal, not an ad result.`,
      action:
        "Check that the selected quantity, HPLC/COA documentation, price, and research-use disclosure agree on the page. Do not add therapeutic or human-use language.",
      source: "Dashboard product views and add-to-cart events",
    });
  } else {
    recommendations.push({
      id: "qualified-email",
      priority: "next",
      channel: "Email",
      title: "Send one opted-in documentation update",
      rationale:
        "Email is an owned channel and the configured strategy can be used without representing a provider approval or paid-ad result.",
      action:
        "Feature a current lot document or testing-method note, include the research-use-only disclosure, and keep the unsubscribe path visible.",
      source: "Email strategy + opted-in subscriber list",
    });
  }

  if (checkouts > 0 && orders / checkouts < 0.5) {
    recommendations.push({
      id: "checkout-observation",
      priority: "watch",
      channel: "Checkout",
      title: "Review checkout drop-off without removing safeguards",
      rationale: `The observed checkout-to-order rate is ${((orders / checkouts) * 100).toFixed(1)}%; this does not identify why a session stopped.`,
      action:
        "Review error paths and payment instructions. Keep research-use attestations and do not weaken them to improve a metric.",
      source: "Dashboard checkout-start and order events",
    });
  } else if (input.topViewed[0] && input.topViewed[0] !== input.topPurchased[0]) {
    recommendations.push({
      id: "view-purchase-gap",
      priority: "watch",
      channel: "Content",
      title: `Explain the interest gap for ${input.topViewed[0]}`,
      rationale:
        "The most-viewed and most-added or purchased items differ in the current aggregate event data.",
      action:
        "Compare the technical description, dose label, image, and COA link for accuracy. Do not infer demand or make a medical claim.",
      source: "Dashboard top viewed and top purchased lists",
    });
  }

  return recommendations;
}

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

I’m with Vitality Chems, a Chicago laboratory-supply company (2045 W Grand Ave, Unit B, Chicago, IL 60612). We publish batch HPLC/LC-MS documentation for lyophilized research peptides sold strictly for in-vitro use — not for human consumption.

If you maintain a reagent or methods resource, you are welcome to cite our testing standards page. We can also contribute a short technical note on identity confirmation of lyophilized peptides (CAS, HPLC, LC-MS) with no consumer claims.

Thank you for your time.
Vitality Chems
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
      body: "Publish technical SEO content, send the opted-in newsletter, and begin qualified wholesale outreach before changing the storefront. Conversion math is noise under ~100 sessions.",
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
      body: "Keep publishing the technical pages and newsletter topics that generate qualified traffic. Google Ads and Meta generally prohibit these listings, so do not try to buy or disguise research-peptide ads.",
    });
  }
  return tips;
}
