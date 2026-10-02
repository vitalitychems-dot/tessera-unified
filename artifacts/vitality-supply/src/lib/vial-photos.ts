/**
 * Product photo registry.
 *
 * Every file listed here was opened and its printed label read (rotated
 * compound/strength column AND the purple strip) during the 2026-09-14 visual
 * audit; a filename alone is never evidence. Eight strengths had no correct
 * render — the uploaded files carried a different compound or strength — and
 * were rebuilt from a verified sibling of the same compound by re-lettering
 * only the strength text (`scripts/derive-dose-variants.mjs`). The printed
 * caption block under every vial was erased (`scripts/strip-captions.mjs`)
 * because several captions carried the wrong CAS number; the storefront prints
 * name, strength and CAS from the catalog instead.
 *
 * Bump PHOTO_VERSION whenever files under public/product-images change so
 * browsers and CDNs do not keep serving an older render at the same path.
 */
export const PHOTO_VERSION = "2";

/** Neutral Vitality vial (no compound text) shown when no exact render exists. */
export const GENERIC_VIAL = `/product-images/generic-vial.webp?v=${PHOTO_VERSION}`;

const withVersion = (path: string) => `${path}?v=${PHOTO_VERSION}`;

const VERIFIED_PHOTOS: Record<string, string> = {
  "5-amino-1mq-5mg": withVersion("/product-images/5-amino-1mq-5mg.webp"),
  "aod-9604-5mg": withVersion("/product-images/aod-9604-5mg.webp"),
  "ara-290-10mg": withVersion("/product-images/ara-290-10mg.webp"),
  "bpc-157-10mg": withVersion("/product-images/bpc-157-10mg.webp"),
  "bpc-157-5mg": withVersion("/product-images/bpc-157-5mg.webp"),
  "bpc-tb-blend-10mg-10mg": withVersion("/product-images/bpc-tb-blend-10mg-10mg.webp"),
  "cagrilintide-10mg": withVersion("/product-images/cagrilintide-10mg.webp"),
  "cjc-1295-no-dac-10mg": withVersion("/product-images/cjc-1295-no-dac-10mg.webp"),
  "cjc-1295-no-dac-5mg": withVersion("/product-images/cjc-1295-no-dac-5mg.webp"),
  "cjc-1295-w-o-dac-ipamorelin-5mg-5mg": withVersion("/product-images/cjc-1295-w-o-dac-ipamorelin-5mg-5mg.webp"),
  "cjc-1295-with-dac-5mg": withVersion("/product-images/cjc-1295-with-dac-5mg.webp"),
  "dsip-5mg": withVersion("/product-images/dsip-5mg.webp"),
  "epithalon-10mg": withVersion("/product-images/epithalon-10mg.webp"),
  "epithalon-50mg": withVersion("/product-images/epithalon-50mg.webp"),
  "frag-176-191-5mg": withVersion("/product-images/frag-176-191-5mg.webp"),
  "ghk-cu-100mg": withVersion("/product-images/ghk-cu-100mg.webp"),
  "ghk-cu-50mg": withVersion("/product-images/ghk-cu-50mg.webp"),
  "ghrp-2-10mg": withVersion("/product-images/ghrp-2-10mg.webp"),
  "ghrp-2-5mg": withVersion("/product-images/ghrp-2-5mg.webp"),
  "ghrp-6-10mg": withVersion("/product-images/ghrp-6-10mg.webp"),
  "ghrp-6-5mg": withVersion("/product-images/ghrp-6-5mg.webp"),
  "glow-10-10-50mg": withVersion("/product-images/glow-10-10-50mg.webp"),
  "hcg-5000iu": withVersion("/product-images/hcg-5000iu.webp"),
  "hexarelin-5mg": withVersion("/product-images/hexarelin-5mg.webp"),
  "igf-1-lr3-1mg": withVersion("/product-images/igf-1-lr3-1mg.webp"),
  "ipamorelin-10mg": withVersion("/product-images/ipamorelin-10mg.webp"),
  "ipamorelin-5mg": withVersion("/product-images/ipamorelin-5mg.webp"),
  "kisspeptin-5mg": withVersion("/product-images/kisspeptin-5mg.webp"),
  "klow-80mg": withVersion("/product-images/klow-80mg.webp"),
  "kpv-10mg": withVersion("/product-images/kpv-10mg.webp"),
  "ll-37-5mg": withVersion("/product-images/ll-37-5mg.webp"),
  "mots-c-10mg": withVersion("/product-images/mots-c-10mg.webp"),
  "mots-c-40mg": withVersion("/product-images/mots-c-40mg.webp"),
  "mt-2-10mg": withVersion("/product-images/mt-2-10mg.webp"),
  "nad-500mg": withVersion("/product-images/nad-500mg.webp"),
  "oxytocin-5mg": withVersion("/product-images/oxytocin-5mg.webp"),
  "pinealon-10mg": withVersion("/product-images/pinealon-10mg.webp"),
  "pt-141-10mg": withVersion("/product-images/pt-141-10mg.webp"),
  "retatrutide-10mg": withVersion("/product-images/retatrutide-10mg.webp"),
  "retatrutide-20mg": withVersion("/product-images/retatrutide-20mg.webp"),
  "retatrutide-30mg": withVersion("/product-images/retatrutide-30mg.webp"),
  "selank-10mg": withVersion("/product-images/selank-10mg.webp"),
  "selank-5mg": withVersion("/product-images/selank-5mg.webp"),
  "semaglutide-10mg": withVersion("/product-images/semaglutide-10mg.webp"),
  "semaglutide-15mg": withVersion("/product-images/semaglutide-15mg.webp"),
  "semaglutide-20mg": withVersion("/product-images/semaglutide-20mg.webp"),
  "semaglutide-30mg": withVersion("/product-images/semaglutide-30mg.webp"),
  "semaglutide-5mg": withVersion("/product-images/semaglutide-5mg.webp"),
  "semax-10mg": withVersion("/product-images/semax-10mg.webp"),
  "sermorelin-10mg": withVersion("/product-images/sermorelin-10mg.webp"),
  "snap-8-10mg": withVersion("/product-images/snap-8-10mg.webp"),
  "ss-31-10mg": withVersion("/product-images/ss-31-10mg.webp"),
  "ss-31-50mg": withVersion("/product-images/ss-31-50mg.webp"),
  "tb-500-10mg": withVersion("/product-images/tb-500-10mg.webp"),
  "tb-500-5mg": withVersion("/product-images/tb-500-5mg.webp"),
  "tesamorelin-10mg": withVersion("/product-images/tesamorelin-10mg.webp"),
  "tesamorelin-5mg": withVersion("/product-images/tesamorelin-5mg.webp"),
  "thymalin-10mg": withVersion("/product-images/thymalin-10mg.webp"),
  "thymosin-alpha-1-ta1-5mg": withVersion("/product-images/thymosin-alpha-1-ta1-5mg.webp"),
  "tirzepatide-10mg": withVersion("/product-images/tirzepatide-10mg.webp"),
  "tirzepatide-15mg": withVersion("/product-images/tirzepatide-15mg.webp"),
  "tirzepatide-20mg": withVersion("/product-images/tirzepatide-20mg.webp"),
  "tirzepatide-30mg": withVersion("/product-images/tirzepatide-30mg.webp"),
  "tirzepatide-60mg": withVersion("/product-images/tirzepatide-60mg.webp"),
  "vip-10mg": withVersion("/product-images/vip-10mg.webp"),
};

const RESPONSIVE_PHOTO_PATHS = new Set([
  ...Object.values(VERIFIED_PHOTOS).map((photo) => photo.split("?", 1)[0]),
  "/product-images/generic-vial.webp",
]);

/**
 * Return the losslessly matching 400px asset for a canonical vial photo.
 *
 * Keep this allow-listed rather than deriving a path for arbitrary URLs:
 * productImage() also returns data URLs for unavailable non-vial photos, and
 * a guessed w400 URL would turn that deliberate fallback into a broken image.
 * The canonical assets are all 800x1000 and their generated counterparts are
 * 400x500, so the pair keeps the same 4:5 aspect ratio and cache version.
 */
export function responsiveVialPhoto(src: string): string | undefined {
  const [path, query = ""] = src.split("?", 2);
  if (!RESPONSIVE_PHOTO_PATHS.has(path)) return undefined;
  const filename = path.split("/").pop();
  if (!filename) return undefined;
  return `/product-images/w400/${filename}${query ? `?${query}` : ""}`;
}

export function vialPhotoSrcSet(src: string): string | undefined {
  const responsive = responsiveVialPhoto(src);
  return responsive ? `${responsive} 400w, ${src} 800w` : undefined;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character]!;
  });
}

/** Deliberately unmistakable fallback; it is not presented as a product photo. */
export function unavailablePhoto(name: string, dose = "Catalog quantity") {
  const label = escapeXml(`${name} · ${dose}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><rect width="800" height="520" fill="#0a0812"/><rect x="28" y="28" width="744" height="464" rx="12" fill="#171222" stroke="#a33bff" stroke-width="3"/><text x="400" y="170" fill="#d4a8ff" font-family="sans-serif" font-size="42" font-weight="700" text-anchor="middle">PHOTO UNAVAILABLE</text><text x="400" y="260" fill="#f5f1ff" font-family="sans-serif" font-size="30" text-anchor="middle">${label}</text><text x="400" y="340" fill="#9b94ab" font-family="monospace" font-size="22" text-anchor="middle">Exact compound + strength image not verified</text><text x="400" y="410" fill="#9b94ab" font-family="monospace" font-size="18" text-anchor="middle">Research use only · Not for human consumption</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function hashedVial(nameSlug: string, doseSlug?: string): string | undefined {
  if (!doseSlug) return undefined;
  const exact = VERIFIED_PHOTOS[`${nameSlug}-${doseSlug}`];
  if (exact) return exact;
  const compact = doseSlug.replace(/-and-/g, "-");
  return VERIFIED_PHOTOS[`${nameSlug}-${compact}`];
}

export function hasHashedVial(nameSlug: string, doseSlug?: string) {
  return Boolean(hashedVial(nameSlug, doseSlug));
}
