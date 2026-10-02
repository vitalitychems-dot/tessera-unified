import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// IMPORTANT: this file does NOT mock ../lib/objectStorage. It exercises the
// REAL ObjectStorageService.normalizeObjectEntityPath() implementation so a
// regression in path normalization (which is what links the presigned URL
// returned to the client and the /objects/... path the PATCH route stores
// and the chat surface later renders) is actually caught — the e2e suite
// in invention-glb-upload.test.ts mocks this method by design.

const ORIGINAL_PRIVATE_DIR = process.env["PRIVATE_OBJECT_DIR"];
const TEST_BUCKET = "test-bucket-glb";
const TEST_DIR = `/${TEST_BUCKET}/.private`;

beforeAll(() => {
  process.env["PRIVATE_OBJECT_DIR"] = TEST_DIR;
});

afterAll(() => {
  if (ORIGINAL_PRIVATE_DIR === undefined) {
    delete process.env["PRIVATE_OBJECT_DIR"];
  } else {
    process.env["PRIVATE_OBJECT_DIR"] = ORIGINAL_PRIVATE_DIR;
  }
  vi.resetModules();
});

describe("ObjectStorageService.normalizeObjectEntityPath (real impl)", () => {
  it("rewrites a googleapis URL pointing inside PRIVATE_OBJECT_DIR to /objects/<entityId>", async () => {
    const { ObjectStorageService } = await import("../lib/objectStorage");
    const svc = new ObjectStorageService();
    const objectId = "abc123-def456";
    const signed = `https://storage.googleapis.com${TEST_DIR}/uploads/${objectId}?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Expires=900`;
    const normalized = svc.normalizeObjectEntityPath(signed);
    expect(normalized).toBe(`/objects/uploads/${objectId}`);
  });

  it("returns non-googleapis URLs unchanged (defense in depth — never invents a /objects/ path from arbitrary input)", async () => {
    const { ObjectStorageService } = await import("../lib/objectStorage");
    const svc = new ObjectStorageService();
    expect(svc.normalizeObjectEntityPath("/objects/already/normalized")).toBe("/objects/already/normalized");
    expect(svc.normalizeObjectEntityPath("https://example.com/foo/bar")).toBe("https://example.com/foo/bar");
  });

  it("googleapis URL whose pathname is OUTSIDE the configured private dir falls back to the raw pathname", async () => {
    const { ObjectStorageService } = await import("../lib/objectStorage");
    const svc = new ObjectStorageService();
    const out = svc.normalizeObjectEntityPath("https://storage.googleapis.com/some-other-bucket/foo.glb?X-Goog-Algorithm=GOOG4");
    // Must NOT pretend this is a /objects/ path that PATCH would happily store.
    expect(out.startsWith("/objects/")).toBe(false);
    expect(out).toBe("/some-other-bucket/foo.glb");
  });

  it("normalized path passes the inventions route safety validator (defense-in-depth chain)", async () => {
    // Inline the same regex/predicate the inventions route applies. If
    // normalization ever started returning anything that isSafeObjectPath
    // rejects, the upload flow would silently break — this test pins it.
    const isSafeObjectPath = (p: string): boolean => {
      if (!p.startsWith("/objects/")) return false;
      if (p.length > 512) return false;
      if (p.includes("..") || p.includes("//") || p.includes("\\")) return false;
      if (!/^\/objects\/[A-Za-z0-9._\-/]+$/.test(p)) return false;
      return true;
    };
    const { ObjectStorageService } = await import("../lib/objectStorage");
    const svc = new ObjectStorageService();
    const signed = `https://storage.googleapis.com${TEST_DIR}/uploads/12345678-90ab-cdef-1234-567890abcdef?X-Goog-Expires=900`;
    const normalized = svc.normalizeObjectEntityPath(signed);
    expect(isSafeObjectPath(normalized)).toBe(true);
  });
});
