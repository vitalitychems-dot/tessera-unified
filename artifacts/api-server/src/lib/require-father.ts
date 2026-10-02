import type { Request, Response, NextFunction } from "express";
import { verifyFatherToken } from "./father-session-store";

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  const xToken = req.headers["x-father-token"];
  if (typeof xToken === "string" && xToken.trim()) return xToken.trim();
  return null;
}

export function requireFather(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!verifyFatherToken(token)) {
    res.status(401).json({ ok: false, isAdmin: false, error: "Father token required" });
    return;
  }
  next();
}
