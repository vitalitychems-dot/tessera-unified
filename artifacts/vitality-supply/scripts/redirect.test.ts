import assert from "node:assert/strict";
import test from "node:test";
import { safeLoginRedirect } from "../src/lib/auth/redirect";

test("login redirect accepts only literal root-relative paths", () => {
  assert.equal(safeLoginRedirect("/checkout"), "/checkout");
  assert.equal(safeLoginRedirect("/account?verified=1"), "/account?verified=1");
  assert.equal(safeLoginRedirect("https://evil.example"), "/account");
  assert.equal(safeLoginRedirect("//evil.example/path"), "/account");
  assert.equal(safeLoginRedirect("/\\evil.example"), "/account");
  assert.equal(safeLoginRedirect("/%2f%2fevil.example"), "/account");
  assert.equal(safeLoginRedirect("/%5cevil.example"), "/account");
  assert.equal(safeLoginRedirect("/checkout%0d%0aLocation:%20https://evil.example"), "/account");
  assert.equal(safeLoginRedirect("/checkout\u0000"), "/account");
});
test("canonical host redirect never leaves the canonical origin", async () => {
  process.env.NODE_ENV = "production";
  const { canonicalProductionRedirect } = await import("../src/lib/auth/site-hosts.server");
  const cases: [string, string | undefined][] = [
    ["https://vitalitychem.com/testing?x=1", "https://vitalitychems.com/testing?x=1"],
    ["https://www.vitalitychem.com/", "https://vitalitychems.com/"],
    ["https://www.vitalitychems.com/product/x", "https://vitalitychems.com/product/x"],
    ["https://vitalitychem.com//evil.example/x", "https://vitalitychems.com/evil.example/x"],
    ["https://vitalitychem.com/%2F%2Fevil.example", "https://vitalitychems.com/%2F%2Fevil.example"],
    ["https://vitalitychems.com/", undefined],
    ["https://vitalitychem.replit.app/", undefined],
  ];
  for (const [input, expected] of cases) {
    const response = canonicalProductionRedirect(new Request(input));
    if (expected === undefined) {
      assert.equal(response, undefined, input);
      continue;
    }
    assert.ok(response, input);
    assert.equal(response.status, 308, input);
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(location.host, "vitalitychems.com", input);
    assert.equal(location.href, expected, input);
  }
});
