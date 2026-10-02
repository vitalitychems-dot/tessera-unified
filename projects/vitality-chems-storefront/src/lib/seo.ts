import { DEFAULT_PUBLIC_SITE_URL, normalizeSiteUrl } from "@/lib/site-url";

export { DEFAULT_PUBLIC_SITE_URL };
export const SITE_NAME = "Vitality Chems";
export const DEFAULT_OG_IMAGE = "/og.jpg";
export const SITE_URL = normalizeSiteUrl(
  typeof import.meta !== "undefined"
    ? (import.meta as { env?: { VITE_PUBLIC_SITE_URL?: string } }).env?.VITE_PUBLIC_SITE_URL
    : undefined,
);

function absoluteUrl(value: string, base = SITE_URL) {
  try {
    return new URL(value, `${base}/`).toString();
  } catch {
    return `${base}/${value.replace(/^\/+/, "")}`;
  }
}

export function seoHead(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  robots?: string;
}) {
  const path = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
  const url = absoluteUrl(path);
  const title = opts.title.includes(SITE_NAME) || opts.title.includes("Vitality")
    ? opts.title
    : `${opts.title} · ${SITE_NAME}`;
  const image = absoluteUrl(opts.image ?? DEFAULT_OG_IMAGE);
  return {
    meta: [
      { title },
      { name: "description", content: opts.description },
      { name: "robots", content: opts.robots ?? "index, follow, max-image-preview:large" },
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

export function noindexSeoHead(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
}) {
  return seoHead({ ...opts, robots: "noindex, nofollow" });
}
