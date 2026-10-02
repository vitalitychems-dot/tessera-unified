import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import express, { type Express } from "express";
import { createServer, type Server } from "node:http";
import { db } from "@workspace/db";
import { inventionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const STUB_OBJECT_PATH = "/objects/uploads/test-glb-object-id";

// Minimal valid-shaped GLB (binary glTF) header bytes — magic "glTF",
// version 2, totalLength=20, JSON chunk length=0, JSON chunk type=0x4E4F534A.
// Real GLB files have actual JSON+BIN chunks; we only need a recognizable
// header to prove the bytes/content-type traveled through the PUT step.
const TINY_GLB = (() => {
  const buf = Buffer.alloc(20);
  buf.write("glTF", 0, "ascii");
  buf.writeUInt32LE(2, 4);
  buf.writeUInt32LE(20, 8);
  buf.writeUInt32LE(0, 12);
  buf.writeUInt32LE(0x4e4f534a, 16);
  return buf;
})();

// Capture for assertions on the actual PUT.
interface PutCapture { body: Buffer; contentType: string; method: string; url: string }
let lastPut: PutCapture | null = null;

let fakeStorageServer: Server;
let fakeStorageBaseUrl: string;

// Test-controlled toggles for ACL behavior. Declared via globalThis so the
// vi.mock factory (which is hoisted above this file's top-level statements)
// can read them lazily at call time.
declare global {
  // eslint-disable-next-line no-var
  var __TEST_ACL_ALLOW: boolean;
  // eslint-disable-next-line no-var
  var __TEST_NEXT_OBJECT_PATH: string | null;
}
globalThis.__TEST_ACL_ALLOW = true;
globalThis.__TEST_NEXT_OBJECT_PATH = null;

vi.mock("../lib/objectStorage", () => {
  class FakeObjectStorageService {
    async getObjectEntityUploadURL() {
      // Return a URL into the in-process fake storage server so the test
      // can perform a REAL PUT and assert the bytes/content-type round-trip.
      const path = globalThis.__TEST_NEXT_OBJECT_PATH ?? STUB_OBJECT_PATH;
      return `${fakeStorageBaseUrl}/upload?path=${encodeURIComponent(path)}`;
    }
    normalizeObjectEntityPath(_raw: string) {
      return globalThis.__TEST_NEXT_OBJECT_PATH ?? STUB_OBJECT_PATH;
    }
    async getObjectEntityFile(_p: string) {
      return { name: "stub" } as unknown as object;
    }
    async canAccessObjectEntity(_opts: unknown) {
      return globalThis.__TEST_ACL_ALLOW;
    }
    async trySetObjectEntityAclPolicy(_p: string, policy: { owner: string; visibility: string }) {
      aclState = policy;
      return true;
    }
  }
  return { ObjectStorageService: FakeObjectStorageService };
});

let aclState: { owner: string; visibility: string } | null = null;
vi.mock("../lib/objectAcl", () => {
  return {
    ObjectPermission: { READ: "read", WRITE: "write" },
    getObjectAclPolicy: async () => aclState,
    setObjectAclPolicy: async (_f: unknown, p: { owner: string; visibility: string }) => {
      aclState = p;
    },
  };
});

import { buildInvention3DBlock } from "../lib/invention-3d";
import { parse3DObjectBlocks } from "./helpers/parse3dobj";
import inventionsRouter from "../routes/inventions";

const TEST_INVENTION_ID = "test-glb-e2e-" + Math.random().toString(36).slice(2, 10);
const SECOND_INVENTION_ID = "test-glb-e2e-other-" + Math.random().toString(36).slice(2, 10);
const TEST_ADMIN_TOKEN = "test-admin-token-for-glb-upload";
const LEGACY_TEST_ADMIN_TOKEN = "legacy-admin-token-for-glb-upload";
const previousSovereignAdminToken = process.env["SOVEREIGN_ADMIN_TOKEN"];
const previousTesseractAdminKey = process.env["TESSERACT_ADMIN_KEY"];

let app: Express;
let server: Server;
let baseUrl: string;

async function postJson(path: string, body: unknown, headers: Record<string, string> = {}) {
  return await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-token": TEST_ADMIN_TOKEN, ...headers },
    body: JSON.stringify(body),
  });
}
async function patchJson(path: string, body: unknown, headers: Record<string, string> = {}) {
  return await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-admin-token": TEST_ADMIN_TOKEN, ...headers },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  // Keep auth tests independent of whichever secrets happen to be configured
  // in the developer or CI environment.
  process.env["SOVEREIGN_ADMIN_TOKEN"] = TEST_ADMIN_TOKEN;

  // Fake "GCS" PUT endpoint so the test can perform a REAL PUT against the
  // signed URL and assert the bytes/content-type traveled through.
  await new Promise<void>((resolve) => {
    fakeStorageServer = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        lastPut = {
          method: req.method || "",
          url: req.url || "",
          contentType: (req.headers["content-type"] as string) || "",
          body: Buffer.concat(chunks),
        };
        res.statusCode = 200;
        res.end("OK");
      });
    });
    fakeStorageServer.listen(0, "127.0.0.1", () => resolve());
  });
  const fakeAddr = fakeStorageServer.address();
  if (!fakeAddr || typeof fakeAddr === "string") throw new Error("no fake storage address");
  fakeStorageBaseUrl = `http://127.0.0.1:${fakeAddr.port}`;

  app = express();
  app.use(express.json());
  app.use("/api", inventionsRouter);

  await new Promise<void>((resolve) => {
    server = createServer(app);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no server address");
  baseUrl = `http://127.0.0.1:${addr.port}`;

  await db.insert(inventionsTable).values({
    inventionId: TEST_INVENTION_ID,
    title: "GLB Upload E2E Test Invention",
    description: "Synthetic invention used by the GLB upload e2e test.",
    proposedBy: "tester:alpha",
    customModelUrl: null,
  }).onConflictDoNothing();
  await db.insert(inventionsTable).values({
    inventionId: SECOND_INVENTION_ID,
    title: "Sibling invention for cross-id rejection test",
    description: "Different invention; the first invention's presigned path must NOT attach here.",
    proposedBy: "tester:beta",
    customModelUrl: null,
  }).onConflictDoNothing();
});

afterAll(async () => {
  try {
    await db.delete(inventionsTable).where(eq(inventionsTable.inventionId, TEST_INVENTION_ID));
    await db.delete(inventionsTable).where(eq(inventionsTable.inventionId, SECOND_INVENTION_ID));
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await new Promise<void>((resolve) => fakeStorageServer.close(() => resolve()));
  } finally {
    if (previousSovereignAdminToken === undefined) delete process.env["SOVEREIGN_ADMIN_TOKEN"];
    else process.env["SOVEREIGN_ADMIN_TOKEN"] = previousSovereignAdminToken;
    if (previousTesseractAdminKey === undefined) delete process.env["TESSERACT_ADMIN_KEY"];
    else process.env["TESSERACT_ADMIN_KEY"] = previousTesseractAdminKey;
  }
});

beforeEach(() => {
  aclState = null;
  globalThis.__TEST_ACL_ALLOW = true;
  globalThis.__TEST_NEXT_OBJECT_PATH = null;
  lastPut = null;
});

describe("GLB upload flow (presign -> PUT -> PATCH -> chat render)", () => {
  it("rejects presign without admin token", async () => {
    const res = await fetch(`${baseUrl}/api/inventions/${TEST_INVENTION_ID}/model/upload-url`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "model.glb" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects presign for non-glb filename", async () => {
    const res = await postJson(`/api/inventions/${TEST_INVENTION_ID}/model/upload-url`, { name: "model.png" });
    expect(res.status).toBe(400);
  });

  it("accepts the legacy TESSERACT admin token during migration", async () => {
    delete process.env["SOVEREIGN_ADMIN_TOKEN"];
    process.env["TESSERACT_ADMIN_KEY"] = LEGACY_TEST_ADMIN_TOKEN;

    try {
      const res = await postJson(
        `/api/inventions/${TEST_INVENTION_ID}/model/upload-url`,
        { name: "model.png" },
        { "x-admin-token": LEGACY_TEST_ADMIN_TOKEN },
      );
      expect(res.status).toBe(400);
    } finally {
      process.env["SOVEREIGN_ADMIN_TOKEN"] = TEST_ADMIN_TOKEN;
      if (previousTesseractAdminKey === undefined) delete process.env["TESSERACT_ADMIN_KEY"];
      else process.env["TESSERACT_ADMIN_KEY"] = previousTesseractAdminKey;
    }
  });

  it("end-to-end: presign + simulated PUT + PATCH attaches model and chat block renders custom GLB", async () => {
    // 1. Presign — server mints upload URL and remembers pending upload bound
    //    to (objectPath, inventionId, principal-derived-from-proposedBy).
    const presignRes = await postJson(`/api/inventions/${TEST_INVENTION_ID}/model/upload-url`, {
      name: "rocket.glb",
      contentType: "model/gltf-binary",
    });
    expect(presignRes.status).toBe(200);
    const presign = await presignRes.json() as {
      ok: boolean; uploadURL: string; objectPath: string; inventionId: string; contentType: string;
    };
    expect(presign.ok).toBe(true);
    expect(presign.uploadURL.startsWith(`${fakeStorageBaseUrl}/upload?path=`)).toBe(true);
    expect(presign.objectPath).toBe(STUB_OBJECT_PATH);
    expect(presign.inventionId).toBe(TEST_INVENTION_ID);
    expect(presign.contentType).toBe("model/gltf-binary");

    // 2. REAL PUT of GLB bytes to the signed URL (an in-process fake GCS
    //    server stands in for GCS so we can exercise actual byte/Content-Type
    //    flow, not just URL minting).
    expect(presign.uploadURL).toMatch(/^https?:\/\//);
    const putRes = await fetch(presign.uploadURL, {
      method: "PUT",
      headers: { "content-type": presign.contentType },
      body: TINY_GLB,
    });
    expect(putRes.status).toBe(200);
    expect(lastPut).not.toBeNull();
    expect(lastPut!.method).toBe("PUT");
    expect(lastPut!.contentType).toBe("model/gltf-binary");
    // Bytes round-tripped intact.
    expect(Buffer.compare(lastPut!.body, TINY_GLB)).toBe(0);
    // First 4 bytes are the GLB "glTF" magic.
    expect(lastPut!.body.subarray(0, 4).toString("ascii")).toBe("glTF");

    // 3. PATCH attach — server consumes the pending entry, applies ACL on
    //    first attach, and persists customModelUrl.
    const patchRes = await patchJson(`/api/inventions/${TEST_INVENTION_ID}/model`, { objectPath: presign.objectPath });
    expect(patchRes.status).toBe(200);
    const patch = await patchRes.json() as { ok: boolean; invention: { customModelUrl: string } };
    expect(patch.ok).toBe(true);
    expect(patch.invention.customModelUrl).toBe(presign.objectPath);

    // 4. DB confirms the persisted attach (defends against the route
    //    returning a stale row).
    const [row] = await db.select().from(inventionsTable).where(eq(inventionsTable.inventionId, TEST_INVENTION_ID));
    expect(row.customModelUrl).toBe(presign.objectPath);

    // 5. ACL was stamped at first attach with proposer-derived principal +
    //    public visibility.
    expect(aclState).not.toBeNull();
    expect(aclState!.visibility).toBe("public");
    expect(aclState!.owner).toMatch(/^proposer:/);

    // 6. Chat render — buildInvention3DBlock must emit the CUSTOM model
    //    token with the persisted src, NOT a fallback primitive.
    const block = buildInvention3DBlock({
      title: row.title,
      category: row.category,
      description: row.description,
      materials: row.materials,
      scienceBehind: row.scienceBehind,
      customModelUrl: row.customModelUrl,
    });
    expect(block).toContain('type="custom"');
    expect(block).toContain(`src="${presign.objectPath}"`);

    // 7. The client-side parser actually produces a custom 3D spec from the
    //    block (so the renderer will mount CustomGLTFModel, not a primitive).
    const parsed = parse3DObjectBlocks(block);
    expect(parsed.objects.length).toBe(1);
    expect(parsed.objects[0].type).toBe("custom");
    expect(parsed.objects[0].src).toBe(presign.objectPath);

    // 8. CHAT-RENDER ROUND-TRIP via the real API. The chat & inventions UI
    //    pulls the rendered diagram3d / diagram3dBlocks straight off
    //    GET /api/inventions/:id (and GET /api/inventions). We hit the live
    //    route to prove the persisted custom model is what the chat surface
    //    will render — not a fallback primitive.
    const detailRes = await fetch(`${baseUrl}/api/inventions/${TEST_INVENTION_ID}`);
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json() as {
      ok: boolean;
      diagram3d: string;
      diagram3dBlocks: string[];
      invention: { customModelUrl: string };
    };
    expect(detail.ok).toBe(true);
    expect(detail.invention.customModelUrl).toBe(presign.objectPath);
    expect(detail.diagram3d).toContain('type="custom"');
    expect(detail.diagram3d).toContain(`src="${presign.objectPath}"`);
    expect(detail.diagram3dBlocks[0]).toBe(detail.diagram3d);
    const renderedSpec = parse3DObjectBlocks(detail.diagram3d).objects[0];
    expect(renderedSpec.type).toBe("custom");
    expect(renderedSpec.src).toBe(presign.objectPath);

    // 9. The list endpoint that the chat / gallery scans for inventions to
    //    render also exposes the custom model — so any chat reply that
    //    references this invention will get a custom GLB block.
    const listRes = await fetch(`${baseUrl}/api/inventions`);
    expect(listRes.status).toBe(200);
    const list = await listRes.json() as {
      ok: boolean;
      inventions: Array<{ inventionId: string; customModelUrl: string | null; diagram3d: string }>;
    };
    const ours = list.inventions.find(i => i.inventionId === TEST_INVENTION_ID);
    expect(ours).toBeDefined();
    expect(ours!.customModelUrl).toBe(presign.objectPath);
    expect(ours!.diagram3d).toContain('type="custom"');
    expect(ours!.diagram3d).toContain(`src="${presign.objectPath}"`);
  });

  it("PATCH replays / cross-id attach are rejected", async () => {
    // Mint a fresh presign for TEST_INVENTION_ID
    const presignRes = await postJson(`/api/inventions/${TEST_INVENTION_ID}/model/upload-url`, { name: "drone.glb" });
    const presign = await presignRes.json() as { ok: boolean; objectPath: string };
    expect(presign.ok).toBe(true);

    // Try to attach the SAME path to a DIFFERENT invention — must 403.
    const wrongRes = await patchJson(`/api/inventions/${SECOND_INVENTION_ID}/model`, { objectPath: presign.objectPath });
    expect(wrongRes.status).toBe(403);

    // Correct invention still works once.
    const okRes = await patchJson(`/api/inventions/${TEST_INVENTION_ID}/model`, { objectPath: presign.objectPath });
    expect(okRes.status).toBe(200);

    // Replay (same path, same invention, after consume) — must 403.
    const replayRes = await patchJson(`/api/inventions/${TEST_INVENTION_ID}/model`, { objectPath: presign.objectPath });
    expect(replayRes.status).toBe(403);
  });

  it("ACL deny path: existing policy + canAccessObjectEntity=false rejects with 403 and does NOT change customModelUrl", async () => {
    // Snapshot the persisted customModelUrl before the attempt.
    const [pre] = await db.select().from(inventionsTable).where(eq(inventionsTable.inventionId, TEST_INVENTION_ID));
    const prevModelUrl = pre.customModelUrl;

    // Use a fresh path so the pending-upload ledger has a valid entry, then
    // simulate an ALREADY-OWNED object (existing ACL policy) where the
    // caller is NOT authorized to write — the route must reject 403 and the
    // DB row must remain unchanged.
    const freshPath = "/objects/uploads/acl-deny-" + Math.random().toString(36).slice(2, 10);
    globalThis.__TEST_NEXT_OBJECT_PATH = freshPath;
    aclState = { owner: "proposer:someone-else", visibility: "public" };
    globalThis.__TEST_ACL_ALLOW = false;

    const presignRes = await postJson(`/api/inventions/${TEST_INVENTION_ID}/model/upload-url`, { name: "denied.glb" });
    const presign = await presignRes.json() as { ok: boolean; objectPath: string };
    expect(presign.ok).toBe(true);
    expect(presign.objectPath).toBe(freshPath);

    const denyRes = await patchJson(`/api/inventions/${TEST_INVENTION_ID}/model`, { objectPath: presign.objectPath });
    expect(denyRes.status).toBe(403);
    const denyBody = await denyRes.json() as { ok: boolean; error: string };
    expect(denyBody.ok).toBe(false);
    expect(denyBody.error).toMatch(/own this object|ACL/i);

    const [post] = await db.select().from(inventionsTable).where(eq(inventionsTable.inventionId, TEST_INVENTION_ID));
    expect(post.customModelUrl).toBe(prevModelUrl);
  });

  it("ACL allow path with existing policy: WRITE-authorized caller succeeds without re-stamping ACL", async () => {
    const freshPath = "/objects/uploads/acl-allow-" + Math.random().toString(36).slice(2, 10);
    globalThis.__TEST_NEXT_OBJECT_PATH = freshPath;
    const existingOwner = "proposer:" + "a".repeat(32);
    aclState = { owner: existingOwner, visibility: "public" };
    globalThis.__TEST_ACL_ALLOW = true;

    const presignRes = await postJson(`/api/inventions/${TEST_INVENTION_ID}/model/upload-url`, { name: "allowed.glb" });
    const presign = await presignRes.json() as { ok: boolean; objectPath: string };
    expect(presign.ok).toBe(true);

    const okRes = await patchJson(`/api/inventions/${TEST_INVENTION_ID}/model`, { objectPath: presign.objectPath });
    expect(okRes.status).toBe(200);

    // Existing ACL must NOT be overwritten when policy already exists.
    expect(aclState!.owner).toBe(existingOwner);

    const [row] = await db.select().from(inventionsTable).where(eq(inventionsTable.inventionId, TEST_INVENTION_ID));
    expect(row.customModelUrl).toBe(presign.objectPath);
  });

  it("PATCH rejects unsafe object paths", async () => {
    const cases = [
      "/objects/../etc/passwd",
      "/uploads/foo.glb",
      "/objects/has space.glb",
      "/objects//double-slash.glb",
    ];
    for (const bad of cases) {
      const res = await patchJson(`/api/inventions/${TEST_INVENTION_ID}/model`, { objectPath: bad });
      expect(res.status, `path ${bad} should be rejected`).toBe(400);
    }
  });
});
