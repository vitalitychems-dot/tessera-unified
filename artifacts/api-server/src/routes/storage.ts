import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const RequestUploadUrlBody = z.object({
  name: z.string().min(1).max(256),
  size: z.number().int().nonnegative().optional(),
  contentType: z.string().min(1).max(128).optional(),
});

router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  // Gate: require an admin token to mint signed upload URLs (prevents
  // unauthenticated callers from generating arbitrary writes / cost abuse).
  const configured = process.env["SOVEREIGN_ADMIN_TOKEN"];
  if (!configured || configured.length < 8) {
    res.status(503).json({
      error: "SOVEREIGN_ADMIN_TOKEN is not configured. Storage upload URLs are disabled until the secret is set.",
    });
    return;
  }
  const token = (req.headers["x-admin-token"] as string | undefined)?.trim();
  if (!token || token.length < 8) {
    res.status(401).json({ error: "Admin token required to mint upload URLs" });
    return;
  }
  const { validateSovereignAdminToken } = await import("../lib/mesh-auth");
  if (!validateSovereignAdminToken(token)) {
    res.status(401).json({ error: "Invalid admin token" });
    return;
  }
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }
  try {
    const { name, size, contentType } = parsed.data;
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// Object Storage / GCS may be entirely unavailable in some environments
// (no credentials, IdentityPool resource missing, sidecar down). When that
// happens every storage call throws, which used to produce 500s — and the
// AutoRecovery watchdog interpreted the resulting probe failures as a dead
// API server and killed the process, looping forever. We now translate any
// upstream storage failure into a clean 404 (or 503 for upload mints) so
// the rest of the system stays alive when storage simply isn't configured.
function isStorageUnavailable(err: unknown): boolean {
  // Surface the deepest error string we can — Gaxios wraps the real cause
  // ("no allowed resources" from the IdentityPool token endpoint) inside
  // err.response.data, while err.message is just "Error code undefined".
  const e = err as {
    message?: string;
    code?: string | number;
    status?: number;
    response?: { status?: number; data?: unknown };
    cause?: unknown;
  } | null | undefined;
  const parts: string[] = [];
  if (e?.message) parts.push(String(e.message));
  if (e?.code != null) parts.push(String(e.code));
  if (e?.status != null) parts.push(`status:${e.status}`);
  if (e?.response?.status != null) parts.push(`response_status:${e.response.status}`);
  if (e?.response?.data != null) {
    try { parts.push(typeof e.response.data === "string" ? e.response.data : JSON.stringify(e.response.data)); } catch { /* ignore */ }
  }
  if (e?.cause) parts.push(String((e.cause as { message?: string })?.message ?? e.cause));
  const msg = parts.join(" | ");
  // Match ONLY signatures that mean the storage backend is unconfigured /
  // unreachable in this environment. Genuine application bugs (programmer
  // errors, validation failures, ACL denials with a populated entity) must
  // continue to surface as 500 / 403 so they aren't silently masked as 404.
  return /no allowed resources|identity[ _-]?pool|invalid_grant|ENOTFOUND|ECONNREFUSED|fetch failed|sidecar|REPLIT_SIDECAR|google-byoid-sdk.*Unauthorized/i.test(msg);
}

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = (req.params as Record<string, string | string[]>).path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    // ACL gate (READ): canAccessObjectEntity returns true only if the object
    // has a stored ObjectAclPolicy whose visibility is "public". Objects
    // uploaded without a policy (or with visibility="private") are
    // unreadable here. Inventor-uploaded invention models intentionally get
    // visibility="public" stamped by inventions.ts on attach so they can be
    // embedded in chat; everything else (general /storage uploads with no
    // policy) is rejected. We do NOT trust any client-supplied userId
    // header for owner/group rule evaluation.
    const allowed = await objectStorageService.canAccessObjectEntity({
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });
    if (!allowed) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    if (isStorageUnavailable(error)) {
      req.log.warn({ err: error }, "Storage backend unavailable; returning 404");
      res.status(404).json({ error: "Object not found", reason: "storage backend unavailable" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = (req.params as Record<string, string | string[]>).filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (isStorageUnavailable(error)) {
      req.log.warn({ err: error }, "Public storage backend unavailable; returning 404");
      res.status(404).json({ error: "File not found", reason: "storage backend unavailable" });
      return;
    }
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

export default router;
