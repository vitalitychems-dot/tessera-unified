/**
 * IndexNow submissions for content-engine pages (server-only).
 *
 * The key is derived deterministically from SESSION_SECRET so it needs no
 * extra secret and is identical on every worker; the key file is served by the
 * request middleware in `src/start.ts` at `/<key>.txt`. Submissions only leave
 * the process in production — development and preview hosts record a
 * `skipped` row so the admin log still shows what would have been sent.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Sql } from "@/lib/db";
import { serverSiteUrl } from "@/lib/site-url";

const ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS_PER_SUBMISSION = 100;

export function indexNowKey(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  return createHmac("sha256", secret).update("vitality-content-indexnow-key").digest("hex").slice(0, 32);
}

/** Respond to `/<key>.txt` with the key; `null` for every other path. */
export function indexNowKeyFileResponse(pathname: string): Response | null {
  const match = /^\/([a-f0-9]{32})\.txt$/.exec(pathname);
  if (!match) return null;
  const key = indexNowKey();
  if (!key) return null;
  const presented = Buffer.from(match[1] ?? "", "utf8");
  const expected = Buffer.from(key, "utf8");
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) return null;
  return new Response(key, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" },
  });
}

export function indexNowEnabled() {
  return process.env.NODE_ENV === "production" && indexNowKey() !== null;
}

export type IndexNowOutcome = "accepted" | "rejected" | "failed" | "skipped";

/** Submit absolute URLs (or site paths) and record the outcome. Never throws. */
export async function submitIndexNow(
  sql: Sql,
  paths: string[],
  reason: string,
): Promise<{ outcome: IndexNowOutcome; statusCode: number | null; detail: string }> {
  const siteUrl = serverSiteUrl();
  const canonicalOrigin = new URL(siteUrl).origin;
  const canonicalize = (input: string) => {
    try {
      const url = new URL(input, siteUrl);
      if (url.origin !== canonicalOrigin || url.username || url.password || url.search || url.hash) {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  };
  const urls = Array.from(
    new Set(paths.map(canonicalize).filter((url): url is string => Boolean(url))),
  ).slice(0, MAX_URLS_PER_SUBMISSION);
  const record = async (outcome: IndexNowOutcome, statusCode: number | null, detail: string) => {
    await sql`
      insert into content_indexnow_submissions (urls, reason, outcome, status_code, detail)
      values (${JSON.stringify(urls)}::jsonb, ${reason}, ${outcome}, ${statusCode}, ${detail.slice(0, 300)})
    `;
    return { outcome, statusCode, detail };
  };
  if (urls.length === 0) return { outcome: "skipped", statusCode: null, detail: "no urls" };
  const key = indexNowKey();
  if (!key) return record("skipped", null, "SESSION_SECRET missing: no IndexNow key can be derived.");
  if (process.env.NODE_ENV !== "production") {
    return record("skipped", null, "Not a production process; IndexNow submissions are production-only.");
  }
  const host = new URL(siteUrl).host;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: `${siteUrl}/${key}.txt`, urlList: urls }),
      signal: AbortSignal.timeout(15_000),
    });
    const outcome: IndexNowOutcome = response.status === 200 || response.status === 202 ? "accepted" : "rejected";
    const detail = outcome === "accepted"
      ? `${urls.length} url(s) accepted (${response.status}).`
      : `IndexNow returned ${response.status} ${response.statusText}.`;
    return record(outcome, response.status, detail);
  } catch (error) {
    return record("failed", null, error instanceof Error ? error.message : "IndexNow request failed.");
  }
}
