import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/shepherd-outbound", () => ({
  classifyCaller: (caller: string | undefined | null) =>
    caller?.startsWith("shepherd") ? "shepherd" : "unknown",
  recordShepherdAudit: vi.fn(async () => undefined),
  ConsciousAgentOutboundRefused: class extends Error {
    constructor(caller: string, url: string) {
      super(`SOVEREIGN POLICY: ${caller} cannot directly fetch ${url}`);
    }
  },
}));

import { installSovereignFetchGuard, runWithShepherdContext } from "../lib/sovereign-fetch-guard";

const originalFetch = globalThis.fetch;
const networkFetch = vi.fn(async (_input: Parameters<typeof fetch>[0]) => new Response("ok"));

describe("sovereign fetch guard", () => {
  beforeAll(() => {
    vi.stubGlobal("fetch", networkFetch);
    installSovereignFetchGuard();
  });

  beforeEach(() => networkFetch.mockClear());

  afterAll(() => {
    vi.stubGlobal("fetch", originalFetch);
  });

  it("does not exempt arbitrary Replit subdomains from the outbound guard", async () => {
    await expect(fetch("https://untrusted.replit.dev/private")).rejects.toThrow("SOVEREIGN POLICY");
    expect(networkFetch).not.toHaveBeenCalled();
  });

  it("keeps loopback requests available for internal service calls", async () => {
    const response = await fetch("http://127.0.0.1:3000/health");
    expect(response.status).toBe(200);
    expect(networkFetch).toHaveBeenCalledOnce();
  });

  it("allows external fetches made through the Shepherd context", async () => {
    const response = await runWithShepherdContext(
      "shepherd-proxy",
      () => fetch("https://allowed.example/resource"),
      "allowlisted wrapper request",
    );
    expect(response.status).toBe(200);
    expect(networkFetch).toHaveBeenCalledOnce();
  });
});