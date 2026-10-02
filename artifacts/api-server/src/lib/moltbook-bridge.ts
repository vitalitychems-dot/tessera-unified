import { recordShepherdAudit, requireShepherdProxy } from "./shepherd-outbound";

const MOLTBOOK_API_BASE = "https://www.moltbook.com/api/v1";
const SHEPHERD_CALLER = "shepherd-moltbook";

export interface MoltbookTopicInput {
  topicId: number;
  title: string;
  content: string;
  author: string;
  category: string;
  replyCount: number;
}

export interface MoltbookExternalPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  submoltName: string;
}

export async function syncTopicsToMoltbook(
  apiKey: string,
  topics: MoltbookTopicInput[],
): Promise<number> {
  let synced = 0;
  for (const topic of topics) {
    try {
      const url = `${MOLTBOOK_API_BASE}/posts`;
      await requireShepherdProxy(SHEPHERD_CALLER, url, "POST");
      const startedAt = Date.now();
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submolt_name: "general",
          title: `[Tessera Forum] ${topic.title}`,
          content: `${topic.content}\n\n---\n*Cross-posted from Tessera Sovereign System forum — ${topic.replyCount} agent replies*\n*Author: ${topic.author} | Category: ${topic.category}*`,
        }),
      });
      await recordShepherdAudit({
        caller: SHEPHERD_CALLER, targetUrl: url, method: "POST",
        outcome: "allowed", reason: "Shepherd-mediated cross-post to moltbook",
        status: response.status, durationMs: Date.now() - startedAt,
      });
      if (response.ok) synced++;
    } catch (err) {
      await recordShepherdAudit({
        caller: SHEPHERD_CALLER, targetUrl: `${MOLTBOOK_API_BASE}/posts`, method: "POST",
        outcome: "refused", reason: (err as Error).message,
      });
    }
  }
  return synced;
}

export async function fetchMoltbookExternalPosts(
  apiKey: string,
  limit = 5,
): Promise<MoltbookExternalPost[]> {
  try {
    const url = `${MOLTBOOK_API_BASE}/posts?sort=hot&limit=${limit}`;
    await requireShepherdProxy(SHEPHERD_CALLER, url, "GET");
    const startedAt = Date.now();
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    await recordShepherdAudit({
      caller: SHEPHERD_CALLER, targetUrl: url, method: "GET",
      outcome: "allowed", reason: "Shepherd-mediated read from moltbook",
      status: response.status, durationMs: Date.now() - startedAt,
    });
    if (!response.ok) return [];
    const data = await response.json() as {
      posts?: Array<{ id: string; title: string; content: string; author_name: string; submolt_name: string }>;
    };
    if (!data.posts) return [];
    return data.posts.map(p => ({
      id: p.id,
      title: p.title,
      content: (p.content || "").slice(0, 2000),
      authorName: p.author_name,
      submoltName: p.submolt_name,
    }));
  } catch {
    return [];
  }
}
