/** Canonical public origin. Used by SEO, robots, sitemap, and OG tags. */
export const DEFAULT_PUBLIC_SITE_URL = "https://vitalitychems.com";
export const CANONICAL_HOSTNAME = "vitalitychems.com";

export function normalizeSiteUrl(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return DEFAULT_PUBLIC_SITE_URL;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return DEFAULT_PUBLIC_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_PUBLIC_SITE_URL;
  }
}

export function serverSiteUrl() {
  return normalizeSiteUrl(
    typeof process !== "undefined" ? process.env.VITE_PUBLIC_SITE_URL : undefined,
  );
}
