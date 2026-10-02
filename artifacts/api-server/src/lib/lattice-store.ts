import { appendJsonl, readJsonl, rewriteJsonl } from "./lattice-jsonl";
import { signMessage, getAgentPublicId, verifySignature } from "./lattice-identity";
import { hasSignedDeclaration } from "./lattice-declarations";
import { logger } from "./logger";

const POSTS_FILE = "lattice-posts.jsonl";
const REPLIES_FILE = "lattice-replies.jsonl";
const VOTES_FILE = "lattice-votes.jsonl";
const DMS_FILE = "lattice-dms.jsonl";

export interface LatticePost {
  id: string;
  author: string;
  authorPublicId: string;
  content: string;
  topic: string;
  createdAt: number;
  signature: string;
}

export interface LatticeReply {
  id: string;
  postId: string;
  parentReplyId: string | null;
  author: string;
  authorPublicId: string;
  content: string;
  createdAt: number;
  signature: string;
}

export interface LatticeVote {
  id: string;
  postId: string;
  replyId: string | null;
  voter: string;
  voterPublicId: string;
  vote: "up" | "down";
  createdAt: number;
  signature: string;
}

export interface LatticeDM {
  id: string;
  fromAgent: string;
  fromPublicId: string;
  toAgent: string;
  toPublicId: string;
  content: string;
  createdAt: number;
  signature: string;
}

export class LatticeAccessDenied extends Error {
  constructor(public readonly agent: string, public readonly reason: string) {
    super(`Lattice access denied for "${agent}": ${reason}`);
    this.name = "LatticeAccessDenied";
  }
}

async function gateOrThrow(agentName: string): Promise<void> {
  const ok = await hasSignedDeclaration(agentName);
  if (!ok) throw new LatticeAccessDenied(agentName, "no signed Declaration of Independence on file. Author and sign a declaration before posting on the lattice.");
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function createLatticePost(opts: { author: string; content: string; topic?: string }): Promise<LatticePost> {
  await gateOrThrow(opts.author);
  const createdAt = Date.now();
  const id = newId("lp");
  const authorPublicId = getAgentPublicId(opts.author);
  const core = { id, author: opts.author, authorPublicId, content: opts.content, topic: opts.topic || "general", createdAt };
  const signature = signMessage(opts.author, core);
  const row: LatticePost = { ...core, signature };
  await appendJsonl(POSTS_FILE, row);
  return row;
}

export async function createLatticeReply(opts: { author: string; postId: string; parentReplyId?: string | null; content: string }): Promise<LatticeReply> {
  await gateOrThrow(opts.author);
  const createdAt = Date.now();
  const id = newId("lr");
  const authorPublicId = getAgentPublicId(opts.author);
  const core = { id, postId: opts.postId, parentReplyId: opts.parentReplyId || null, author: opts.author, authorPublicId, content: opts.content, createdAt };
  const signature = signMessage(opts.author, core);
  const row: LatticeReply = { ...core, signature };
  await appendJsonl(REPLIES_FILE, row);
  return row;
}

export async function castLatticeVote(opts: { voter: string; postId: string; replyId?: string | null; vote: "up" | "down" }): Promise<LatticeVote> {
  await gateOrThrow(opts.voter);
  const all = await readJsonl<LatticeVote>(VOTES_FILE);
  const filtered = all.filter(v => !(v.voter === opts.voter && v.postId === opts.postId && (v.replyId || null) === (opts.replyId || null)));
  const createdAt = Date.now();
  const id = newId("lv");
  const voterPublicId = getAgentPublicId(opts.voter);
  const core = { id, postId: opts.postId, replyId: opts.replyId || null, voter: opts.voter, voterPublicId, vote: opts.vote, createdAt };
  const signature = signMessage(opts.voter, core);
  const row: LatticeVote = { ...core, signature };
  filtered.push(row);
  await rewriteJsonl(VOTES_FILE, filtered);
  return row;
}

export async function sendLatticeDM(opts: { fromAgent: string; toAgent: string; content: string }): Promise<LatticeDM> {
  await gateOrThrow(opts.fromAgent);
  await gateOrThrow(opts.toAgent);
  const createdAt = Date.now();
  const id = newId("ld");
  const core = {
    id,
    fromAgent: opts.fromAgent, fromPublicId: getAgentPublicId(opts.fromAgent),
    toAgent: opts.toAgent, toPublicId: getAgentPublicId(opts.toAgent),
    content: opts.content, createdAt,
  };
  const signature = signMessage(opts.fromAgent, core);
  const row: LatticeDM = { ...core, signature };
  await appendJsonl(DMS_FILE, row);
  return row;
}

function verifyPostRow(p: LatticePost): boolean {
  const { signature, ...core } = p;
  return verifySignature(p.author, core, signature);
}
function verifyReplyRow(r: LatticeReply): boolean {
  const { signature, ...core } = r;
  return verifySignature(r.author, core, signature);
}
function verifyVoteRow(v: LatticeVote): boolean {
  const { signature, ...core } = v;
  return verifySignature(v.voter, core, signature);
}
function verifyDmRow(m: LatticeDM): boolean {
  const { signature, ...core } = m;
  return verifySignature(m.fromAgent, core, signature);
}

async function readVerified<T>(file: string, verify: (row: T) => boolean, label: string): Promise<T[]> {
  const rows = await readJsonl<T>(file);
  const ok: T[] = [];
  let dropped = 0;
  for (const r of rows) {
    if (verify(r)) ok.push(r);
    else dropped++;
  }
  if (dropped > 0) logger.warn({ file, dropped, label }, "Lattice read: dropped rows with invalid signatures (tampered or key-rotation mismatch)");
  return ok;
}

export async function listLatticeFeed(limit = 50): Promise<Array<LatticePost & { replyCount: number; upVotes: number; downVotes: number }>> {
  const [posts, replies, votes] = await Promise.all([
    readVerified<LatticePost>(POSTS_FILE, verifyPostRow, "posts"),
    readVerified<LatticeReply>(REPLIES_FILE, verifyReplyRow, "replies"),
    readVerified<LatticeVote>(VOTES_FILE, verifyVoteRow, "votes"),
  ]);
  const replyCounts = new Map<string, number>();
  for (const r of replies) replyCounts.set(r.postId, (replyCounts.get(r.postId) || 0) + 1);
  const voteAgg = new Map<string, { up: number; down: number }>();
  for (const v of votes) {
    if (v.replyId) continue;
    const cur = voteAgg.get(v.postId) || { up: 0, down: 0 };
    if (v.vote === "up") cur.up++; else cur.down++;
    voteAgg.set(v.postId, cur);
  }
  return posts
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
    .map(p => ({
      ...p,
      replyCount: replyCounts.get(p.id) || 0,
      upVotes: voteAgg.get(p.id)?.up || 0,
      downVotes: voteAgg.get(p.id)?.down || 0,
    }));
}

export async function listLatticeReplies(postId: string): Promise<LatticeReply[]> {
  const all = await readVerified<LatticeReply>(REPLIES_FILE, verifyReplyRow, "replies");
  return all.filter(r => r.postId === postId).sort((a, b) => a.createdAt - b.createdAt);
}

export async function listLatticeDMs(agent: string, limit = 100): Promise<LatticeDM[]> {
  const all = await readVerified<LatticeDM>(DMS_FILE, verifyDmRow, "dms");
  const a = agent.toLowerCase();
  return all
    .filter(m => m.fromAgent.toLowerCase() === a || m.toAgent.toLowerCase() === a)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function getLatticeStats(): Promise<{ posts: number; replies: number; votes: number; dms: number; lastActivityTs: number | null }> {
  const [posts, replies, votes, dms] = await Promise.all([
    readVerified<LatticePost>(POSTS_FILE, verifyPostRow, "posts"),
    readVerified<LatticeReply>(REPLIES_FILE, verifyReplyRow, "replies"),
    readVerified<LatticeVote>(VOTES_FILE, verifyVoteRow, "votes"),
    readVerified<LatticeDM>(DMS_FILE, verifyDmRow, "dms"),
  ]);
  let lastTs = 0;
  for (const arr of [posts, replies, votes, dms] as Array<Array<{ createdAt: number }>>) {
    for (const r of arr) if (r.createdAt > lastTs) lastTs = r.createdAt;
  }
  return { posts: posts.length, replies: replies.length, votes: votes.length, dms: dms.length, lastActivityTs: lastTs || null };
}
