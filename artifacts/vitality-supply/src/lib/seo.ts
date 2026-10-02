/**
 * The published brand domain is the safe default until a deployment has a
 * verified production URL. Set VITE_PUBLIC_SITE_URL once for a real
 * deployment; all generated canonical, social, robots, and sitemap URLs use
 * that same value. The primary domain is configured here only as the SEO
 * default; this does not publish the app or change registrar/DNS settings.
 */
import { DEFAULT_PUBLIC_SITE_URL, normalizeSiteUrl } from "@/lib/site-url";

export { DEFAULT_PUBLIC_SITE_URL };
export const SITE_NAME = "Vitality Chems";
/** 1200×630 social card: full brand mark left, IGF-1 LR3 vial right. */
export const DEFAULT_OG_IMAGE = "/og/preview-no-box.jpg";

export const SITE_URL = normalizeSiteUrl(import.meta.env.VITE_PUBLIC_SITE_URL);

function absoluteUrl(value: string, base = SITE_URL) {
  try {
    return new URL(value, `${base}/`).toString();
  } catch {
    return `${base}/${value.replace(/^\/+/, "")}`;
  }
}

export type SeoHeadOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  robots?: string;
};

/**
 * Shared route metadata. Keep this in one place so route heads cannot drift
 * between the canonical brand URL and a preview/development host.
 */
export function seoHead(opts: SeoHeadOptions) {
  const path = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
  const url = absoluteUrl(path);
  const title = opts.title.includes(SITE_NAME) ? opts.title : `${opts.title} · ${SITE_NAME}`;
  const image = absoluteUrl(opts.image ?? DEFAULT_OG_IMAGE);

  return {
    meta: [
      { title },
      { name: "description", content: opts.description },
      {
        name: "robots",
        content: opts.robots ?? "index, follow, max-image-preview:large",
      },
      { property: "og:title", content: title },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: url },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:image", content: image },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: `${SITE_NAME} research catalog` },
      { property: "og:type", content: opts.type ?? "website" },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: opts.description },
      { name: "twitter:url", content: url },
      { name: "twitter:image", content: image },
      { name: "twitter:image:alt", content: `${SITE_NAME} research catalog` },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** Metadata for authentication, account, admin, and transaction screens. */
export function noindexSeoHead(opts: Omit<SeoHeadOptions, "robots">) {
  return seoHead({ ...opts, robots: "noindex, nofollow" });
}