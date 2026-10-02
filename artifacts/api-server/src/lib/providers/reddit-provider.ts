import { safeFetchJson } from "../safe-fetch";
import type { NormalizedItem } from "../ingestion/pipeline";

interface RedditPost {
  title: string;
  selftext: string;
  permalink: string;
  score: number;
  author: string;
  num_comments: number;
  upvote_ratio: number;
  created_utc: number;
  link_flair_text?: string;
}

interface RedditListingChild {
  data: RedditPost;
}

interface RedditListing {
  data?: {
    children?: RedditListingChild[];
  };
}

export async function queryReddit(
  subreddit = "technology",
  limit = 10,
): Promise<NormalizedItem[]> {
  try {
    const data = await safeFetchJson<RedditListing>(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`,
      {
        providerId: "reddit",
        providerName: "Reddit JSON API",
        timeoutMs: 12000,
        headers: {
          "User-Agent": "Tessera-Bot/1.0 (research; +https://tessera.app)",
        },
      },
    );

    const posts = data?.data?.children ?? [];
    return posts
      .map(p => p.data)
      .filter(d => d?.title)
      .map(d => ({
        source: `Reddit r/${subreddit}`,
        sourceType: "api" as const,
        title: d.title,
        content: d.selftext || d.title,
        url: `https://www.reddit.com${d.permalink}`,
        tags: ["reddit", subreddit, d.link_flair_text].filter(Boolean) as string[],
        metadata: {
          score: d.score,
          author: d.author,
          numComments: d.num_comments,
          upvoteRatio: d.upvote_ratio,
        },
        publishedAt: d.created_utc ? new Date(d.created_utc * 1000) : undefined,
      }));
  } catch {
    return [];
  }
}
