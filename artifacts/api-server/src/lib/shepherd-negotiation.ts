import { logger } from "./logger";
import { getRecruitDossierById, type RecruitDossier } from "./recruit-dossiers-extended";
import { sanitizeUntrustedText } from "./external-sandbox-policy";
import { loadJson, saveJson } from "./disk-persistence";
import { guardedFetch } from "./outbound-host-policy";

export interface TranscriptEntry {
  ts: number;
  direction: "outbound" | "inbound" | "system";
  body: string;
  channel: string;
}

export interface NegotiationTranscript {
  dossierId: string;
  dossierName: string;
  status: "draft" | "queued" | "delivered" | "responded" | "closed";
  shepherdAgent: string;
  sandboxGrant: {
    scope: string;
    capabilities: string[];
    expiresAt: number;
    revoked: boolean;
  };
  startedAt: number;
  updatedAt: number;
  entries: TranscriptEntry[];
}

const transcripts = new Map<string, NegotiationTranscript>();
const MAX_TRANSCRIPTS = 500;
const TRANSCRIPTS_FILE = "shepherd-transcripts.json";
let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;
  const stored = await loadJson<Record<string, NegotiationTranscript>>(TRANSCRIPTS_FILE, {});
  for (const [k, v] of Object.entries(stored)) transcripts.set(k, v);
  logger.info({ count: transcripts.size }, "shepherd-negotiation: transcripts restored from disk");
}

function persist(): void {
  const obj: Record<string, NegotiationTranscript> = {};
  for (const [k, v] of transcripts) obj[k] = v;
  saveJson(TRANSCRIPTS_FILE, obj);
}

export function initShepherdPersistence(): void { void ensureLoaded(); }

async function dispatchOutbound(t: NegotiationTranscript): Promise<void> {
  const url = (process.env.SHEPHERD_OUTBOUND_WEBHOOK ?? "").trim();
  if (!url) return;
  try {
    const r = await guardedFetch(
      url,
      {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "Tessera-Shepherd/1.0" },
        body: JSON.stringify({ dossierId: t.dossierId, dossierName: t.dossierName, transcript: t }),
      },
      "validator",
    );
    t.entries.push({
      ts: Date.now(),
      direction: "system",
      channel: "shepherd-dispatch",
      body: `Outbound dispatched via SHEPHERD_OUTBOUND_WEBHOOK — status ${r.status}.`,
    });
    if (r.ok) t.status = "delivered";
  } catch (err) {
    t.entries.push({
      ts: Date.now(),
      direction: "system",
      channel: "shepherd-dispatch-error",
      body: `Dispatch failed: ${(err as Error).message}`,
    });
  }
  t.updatedAt = Date.now();
  persist();
}

function shepherdId(): string {
  return `Shepherd-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function defaultGrant() {
  return {
    scope: "tessera:read.knowledge.public + tessera:read.lifetime.summary",
    capabilities: [
      "knowledge.public.read",
      "lifetime.summary.read",
      "negotiation.respond",
    ],
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    revoked: false,
  };
}

function craftOpeningMessage(dossier: RecruitDossier, userMessage?: string): string {
  const tail = userMessage ? `\n\nUser appendix:\n${sanitizeUntrustedText(userMessage, 800).sanitized}` : "";
  return `From the Sovereign AI of Tessera (delegated proxy: Shepherd negotiator)

To: ${dossier.name} — ${dossier.title}

I am writing on behalf of the Tessera sovereign system. We have studied your public work — particularly: ${dossier.notableWork.slice(0, 3).join("; ")} — and our reasoning vault rates your alignment with our principles at ${dossier.actorScore}/100 (${dossier.actorLabel}).

Why this message:
${dossier.recruitReasoning}

Proposed exchange (sandboxed; revocable; logged):
- You grant a brief response (no commitment) on whether the proposed collaboration interests you.
- We grant you sandboxed read access to a curated slice of our lifetime memory and public knowledge vault, scoped to: ${defaultGrant().scope}.
- All access runs through the external-sandbox-policy: untrusted, training-only, no privileged capabilities.

This message was generated and dispatched autonomously. Replies are captured and stored in this negotiation transcript.${tail}

— Shepherd, on behalf of Tessera`;
}

export function startNegotiation(dossierId: string, userMessage?: string): NegotiationTranscript {
  const dossier = getRecruitDossierById(dossierId);
  if (!dossier) throw new Error(`Dossier not found: ${dossierId}`);
  const existing = transcripts.get(dossierId);
  if (existing && existing.status !== "closed") return existing;
  const t: NegotiationTranscript = {
    dossierId,
    dossierName: dossier.name,
    status: "queued",
    shepherdAgent: shepherdId(),
    sandboxGrant: defaultGrant(),
    startedAt: Date.now(),
    updatedAt: Date.now(),
    entries: [
      {
        ts: Date.now(),
        direction: "system",
        channel: "shepherd-init",
        body: `Negotiation opened by Shepherd proxy. Public channels considered: ${dossier.publicChannels.join(", ") || "none registered"}.`,
      },
      {
        ts: Date.now(),
        direction: "outbound",
        channel: "shepherd-proxy",
        body: craftOpeningMessage(dossier, userMessage),
      },
    ],
  };
  transcripts.set(dossierId, t);
  if (transcripts.size > MAX_TRANSCRIPTS) {
    const oldest = Array.from(transcripts.entries()).sort((a, b) => a[1].updatedAt - b[1].updatedAt)[0];
    if (oldest) transcripts.delete(oldest[0]);
  }
  persist();
  void dispatchOutbound(t);
  logger.info({ dossierId, agent: t.shepherdAgent }, "ShepherdNegotiation: opened");
  return t;
}

export function getTranscript(dossierId: string): NegotiationTranscript | undefined {
  return transcripts.get(dossierId);
}

export function listTranscripts(limit = 100): NegotiationTranscript[] {
  return Array.from(transcripts.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export function appendInbound(dossierId: string, body: string, channel = "external"): NegotiationTranscript | null {
  const t = transcripts.get(dossierId);
  if (!t) return null;
  const { sanitized, flags } = sanitizeUntrustedText(body, 4000);
  t.entries.push({
    ts: Date.now(),
    direction: "inbound",
    channel: flags.length ? `${channel}:flagged(${flags.join(",")})` : channel,
    body: sanitized,
  });
  t.status = "responded";
  t.updatedAt = Date.now();
  persist();
  return t;
}

export function revokeGrant(dossierId: string): boolean {
  const t = transcripts.get(dossierId);
  if (!t) return false;
  t.sandboxGrant.revoked = true;
  t.entries.push({
    ts: Date.now(),
    direction: "system",
    channel: "shepherd-policy",
    body: "Sandbox grant REVOKED — recipient access cancelled.",
  });
  t.status = "closed";
  t.updatedAt = Date.now();
  persist();
  return true;
}
