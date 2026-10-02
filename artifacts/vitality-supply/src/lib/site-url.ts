/**
 * The single source of truth for the public origin. Import this from any
 * module that must also run outside Vite (the scheduler processes started by
 * `scripts/start.mjs` run under tsx, where `import.meta.env` is undefined and
 * `@/lib/seo` therefore cannot be loaded).
 *
 * The primary published domain is vitalitychems.com (with an "s"); the older
 * vitalitychem.com host is permanently redirected to it. Change it here and in
 * nowhere else: canonical tags, robots, the dynamic sitemap, llms.txt,
 * IndexNow submissions, and the production host redirect all read this value.
 */
export const DEFAULT_PUBLIC_SITE_URL = "https://vitalitychems.com";
export const CANONICAL_HOSTNAME = "vitalitychems.com";

export function normalizeSiteUrl(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return DEFAULT_PUBLIC_SITE_URL;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") {
      return DEFAULT_PUBLIC_SITE_URL;
    }
    return url.origin;
  } catch {
    return DEFAULT_PUBLIC_SITE_URL;
  }
}

/** Public origin for server-only code (schedulers, request middleware, crawler routes). */
export function serverSiteUrl() {
  return normalizeSiteUrl(
    typeof process !== "undefined" ? process.env.VITE_PUBLIC_SITE_URL : undefined,
  );
}
