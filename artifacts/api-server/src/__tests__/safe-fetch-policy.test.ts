import { afterEach, expect, it, vi } from "vitest";
import { safeFetch } from "../lib/safe-fetch";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.stubGlobal("fetch", originalFetch);
});

it("allows only credential-free HTTPS GETs to the fixed knowledge hosts", async () => {
  const networkFetch = vi.fn(async (_input: Parameters<typeof fetch>[0]) =>
    new Response('{"title":"Example"}', {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", networkFetch);

  const result = await safeFetch("https://en.wikipedia.org/api/rest_v1/page/summary/example", {
    skipTracking: true,
  });
  const nasaResult = await safeFetch("https://images-api.nasa.gov/search?q=earth", {
    skipTracking: true,
  });

  expect(result.ok).toBe(true);
  expect(nasaResult.ok).toBe(true);
  expect(networkFetch).toHaveBeenCalledTimes(2);
  expect(String(networkFetch.mock.calls[0]?.[0])).toContain("en.wikipedia.org");
});

it("blocks dynamic hosts, non-GET requests, and credentials before fetch", async () => {
  const networkFetch = vi.fn(async (_input: Parameters<typeof fetch>[0]) => new Response("unexpected"));
  vi.stubGlobal("fetch", networkFetch);

  await expect(safeFetch("https://feed.example/rss.xml", { skipTracking: true })).rejects.toThrow(
    "only HTTPS GET requests",
  );
  await expect(safeFetch("https://export.arxiv.org/api/query", {
    method: "POST",
    skipTracking: true,
  })).rejects.toThrow("credential-free GET requests");
  await expect(safeFetch("https://en.wikipedia.org/api/data", {
    headers: { Authorization: "Bearer not-a-real-token" },
    skipTracking: true,
  })).rejects.toThrow("credential-free GET requests");

  expect(networkFetch).not.toHaveBeenCalled();
});

it("refuses redirects that leave the exact approved host", async () => {
  const networkFetch = vi.fn(async (_input: Parameters<typeof fetch>[0]) =>
    new Response(null, {
      status: 302,
      headers: { location: "https://unexpected.example/data" },
    }),
  );
  vi.stubGlobal("fetch", networkFetch);

  await expect(safeFetch("https://export.arxiv.org/api/query", { skipTracking: true })).rejects.toThrow(
    "redirects must remain on the same approved host",
  );
  expect(networkFetch).toHaveBeenCalledOnce();
});