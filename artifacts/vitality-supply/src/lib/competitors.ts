export type CompetitorPrice = {
  sku: string;
  vendor: string;
  priceCents: number;
  url: string;
  observedAt: "2026-09-14" | "2026-09-15";
};

/**
 * Public single-unit list prices visible in fetched vendor page content.
 * Variant ranges are recorded only where the page identifies the variants in ascending order.
 */
export const COMPETITOR_PRICES: CompetitorPrice[] = [
  { sku: "BPC-157 5mg", vendor: "Core Peptides", priceCents: 5200, url: "https://www.corepeptides.com/peptides/bpc-157", observedAt: "2026-09-14" },
  { sku: "BPC-157 10mg", vendor: "Core Peptides", priceCents: 9700, url: "https://www.corepeptides.com/peptides/bpc-157", observedAt: "2026-09-14" },
  { sku: "BPC/TB Blend 10mg/10mg", vendor: "Core Peptides", priceCents: 19500, url: "https://www.corepeptides.com/peptides/bpc-157-tb-500-10mg-blend", observedAt: "2026-09-14" },
  { sku: "BPC-157 5mg", vendor: "Biotech Peptides", priceCents: 5200, url: "https://biotechpeptides.com/product/bpc-157", observedAt: "2026-09-14" },
  { sku: "BPC-157 10mg", vendor: "Biotech Peptides", priceCents: 9200, url: "https://biotechpeptides.com/product/bpc-157", observedAt: "2026-09-14" },
  { sku: "BPC-157 5mg", vendor: "Swiss Chems", priceCents: 4012, url: "https://swisschems.is/product/healing-research", observedAt: "2026-09-14" },
  { sku: "TB-500 5mg", vendor: "Swiss Chems", priceCents: 3126, url: "https://swisschems.is/product/healing-research", observedAt: "2026-09-14" },
  { sku: "BPC-157 5mg", vendor: "Sports Technology Labs", priceCents: 7999, url: "https://sportstechnologylabs.com/product/bpc-157-peptide", observedAt: "2026-09-14" },
  { sku: "Ipamorelin 5mg", vendor: "Core Peptides", priceCents: 4600, url: "https://www.corepeptides.com/peptides/ipamorelin-5mg", observedAt: "2026-09-14" },
  { sku: "Tesamorelin 10mg", vendor: "Core Peptides", priceCents: 7900, url: "https://www.corepeptides.com/peptides/tesamorelin-10mg", observedAt: "2026-09-14" },
  { sku: "MOTS-c 10mg", vendor: "Core Peptides", priceCents: 11600, url: "https://www.corepeptides.com/peptides/mots-c-10mg", observedAt: "2026-09-14" },
  { sku: "IGF-1 LR3 1mg", vendor: "Core Peptides", priceCents: 15000, url: "https://www.corepeptides.com/peptides/igf-1-lr3-1mg", observedAt: "2026-09-14" },
  { sku: "PT-141 10mg", vendor: "Core Peptides", priceCents: 4300, url: "https://www.corepeptides.com/peptides/pt-141-10mg", observedAt: "2026-09-14" },
  { sku: "MT-2 10mg", vendor: "Core Peptides", priceCents: 4100, url: "https://www.corepeptides.com/peptides/melanotan-2-10mg", observedAt: "2026-09-14" },
  { sku: "Sermorelin 5mg", vendor: "Core Peptides", priceCents: 5000, url: "https://www.corepeptides.com/peptides/sermorelin-5mg", observedAt: "2026-09-14" },
  { sku: "AOD-9604 5mg", vendor: "Core Peptides", priceCents: 4100, url: "https://www.corepeptides.com/peptides/aod-9604-5mg", observedAt: "2026-09-14" },
  { sku: "DSIP 5mg", vendor: "Core Peptides", priceCents: 4100, url: "https://www.corepeptides.com/peptides/dsip-5mg", observedAt: "2026-09-14" },
  { sku: "TB-500 5mg", vendor: "Core Peptides", priceCents: 7800, url: "https://www.corepeptides.com/peptides/tb-500", observedAt: "2026-09-15" },
  { sku: "TB-500 10mg", vendor: "Core Peptides", priceCents: 14000, url: "https://www.corepeptides.com/peptides/tb-500", observedAt: "2026-09-15" },
  { sku: "Semaglutide 10mg", vendor: "Polaris Peptides", priceCents: 9000, url: "https://polarispeptides.com/product/semaglutide-10mg", observedAt: "2026-09-15" },
  { sku: "Semaglutide 10mg", vendor: "MyPurePeptide", priceCents: 7000, url: "https://mypurepeptide.com/product/semaglutide", observedAt: "2026-09-15" },
  { sku: "Tirzepatide 10mg", vendor: "Polaris Peptides", priceCents: 8900, url: "https://polarispeptides.com/product/tirzepatide-10mg", observedAt: "2026-09-15" },
  { sku: "Ipamorelin 5mg", vendor: "Core Peptides", priceCents: 4300, url: "https://www.corepeptides.com/peptides/ipamorelin-5mg", observedAt: "2026-09-15" },
  { sku: "Ipamorelin 10mg", vendor: "Polaris Peptides", priceCents: 5000, url: "https://polarispeptides.com/product/ipamorelin-10mg", observedAt: "2026-09-15" },
  { sku: "Tesamorelin 10mg", vendor: "Alpha Omega Peptide", priceCents: 7500, url: "https://alphaomegapeptide.com/products/tesamorelin-10mg", observedAt: "2026-09-15" },
  { sku: "MOTS-c 10mg", vendor: "PSPeptides", priceCents: 6999, url: "https://pspeptides.com/product/buy-mots-c", observedAt: "2026-09-15" },
  { sku: "CJC-1295 w/o DAC + Ipamorelin 5mg/5mg", vendor: "Polaris Peptides", priceCents: 6000, url: "https://polarispeptides.com/product/cjc-1295-no-dac-5mg-ipamorelin-5mg", observedAt: "2026-09-15" },
];

export type CompetitorStats = {
  count: number;
  min: number;
  median: number;
  max: number;
  sources: { vendor: string; url: string; observedAt: CompetitorPrice["observedAt"] }[];
};

export function competitorStats(sku: string): CompetitorStats | null {
  // Keep one current observation per vendor. Older captures remain in the
  // source array for auditability but should not distort today's benchmark.
  const latestByVendor = new Map<string, CompetitorPrice>();
  for (const row of COMPETITOR_PRICES.filter((entry) => entry.sku === sku)) {
    const previous = latestByVendor.get(row.vendor);
    if (!previous || row.observedAt > previous.observedAt) latestByVendor.set(row.vendor, row);
  }
  const prices = [...latestByVendor.values()]
    .map((row) => row.priceCents / 100)
    .sort((a, b) => a - b);
  if (!prices.length) return null;
  const middle = Math.floor(prices.length / 2);
  const median =
    prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2;
  return {
    count: prices.length,
    min: prices[0],
    median,
    max: prices[prices.length - 1],
    sources: [...latestByVendor.values()].map(({ vendor, url, observedAt }) => ({
      vendor,
      url,
      observedAt,
    })),
  };
}