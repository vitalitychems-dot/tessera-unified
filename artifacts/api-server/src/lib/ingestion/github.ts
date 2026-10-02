import { fetchJson, fetchText } from "./scrapers";
import type { NormalizedItem } from "./pipeline";

const GITHUB_API = "https://api.github.com";

interface GithubRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  license: { spdx_id: string } | null;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
  owner: { login: string };
  size: number;
  open_issues_count: number;
  watchers_count: number;
}

interface GithubSearchResult {
  total_count: number;
  items: GithubRepo[];
}

interface GithubTreeItem {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

interface GithubTree {
  sha: string;
  tree: GithubTreeItem[];
  truncated: boolean;
}

const GITHUB_HEADERS = {
  "Accept": "application/vnd.github.v3+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

export async function fetchGithubTrendingRepos(language = "", since: "daily" | "weekly" = "weekly", limit = 10): Promise<NormalizedItem[]> {
  const query = language
    ? `language:${language} stars:>100 pushed:>2024-01-01`
    : `stars:>500 pushed:>2024-01-01`;

  const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`;

  let data: GithubSearchResult;
  try {
    data = await fetchJson<GithubSearchResult>(url, GITHUB_HEADERS);
  } catch (e) {
    throw new Error(`GitHub search failed: ${(e as Error).message}`);
  }

  const repos = data?.items || [];
  const items: NormalizedItem[] = [];

  for (const repo of repos.slice(0, limit)) {
    const readme = await fetchGithubReadme(repo.full_name).catch(() => "");

    const content = [
      repo.description || "",
      readme ? `README:\n${readme.slice(0, 2000)}` : "",
    ].filter(Boolean).join("\n\n") || repo.full_name;

    items.push({
      source: "GitHub",
      sourceType: "github",
      title: `${repo.full_name} — ${repo.description || "GitHub Repository"}`,
      content,
      url: repo.html_url,
      tags: [
        "github",
        "repository",
        repo.language?.toLowerCase() || "unknown",
        ...(repo.topics || []).slice(0, 5),
        repo.license?.spdx_id?.toLowerCase() || "unknown-license",
      ].filter(Boolean) as string[],
      metadata: {
        fullName: repo.full_name,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        topics: repo.topics,
        license: repo.license?.spdx_id,
        size: repo.size,
        openIssues: repo.open_issues_count,
        watchers: repo.watchers_count,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
        owner: repo.owner.login,
      },
      publishedAt: repo.pushed_at ? new Date(repo.pushed_at) : undefined,
    });
  }

  return items;
}

export async function fetchGithubReadme(fullName: string): Promise<string> {
  const url = `${GITHUB_API}/repos/${fullName}/readme`;
  try {
    const data = await fetchJson<{ content: string; encoding: string }>(url, GITHUB_HEADERS);
    if (data?.content && data?.encoding === "base64") {
      const decoded = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
      return decoded.slice(0, 5000);
    }
    return "";
  } catch {
    return "";
  }
}

export async function fetchGithubRepoFiles(fullName: string, branch = "main"): Promise<NormalizedItem[]> {
  const url = `${GITHUB_API}/repos/${fullName}/git/trees/${branch}?recursive=1`;
  let tree: GithubTree;
  try {
    tree = await fetchJson<GithubTree>(url, GITHUB_HEADERS);
  } catch {
    return [];
  }

  const files = (tree?.tree || []).filter(f =>
    f.type === "blob" &&
    f.path &&
    !f.path.includes("node_modules") &&
    !f.path.includes(".git") &&
    /\.(ts|tsx|js|jsx|py|go|rs|java|cpp|c|md|yaml|yml|toml|json)$/i.test(f.path) &&
    (f.size || 0) < 50000
  ).slice(0, 20);

  const items: NormalizedItem[] = [];
  for (const file of files.slice(0, 5)) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${fullName}/${branch}/${file.path}`;
      const content = await fetchText(rawUrl);
      if (content && content.length > 50) {
        items.push({
          source: "GitHub",
          sourceType: "github-file",
          title: `${fullName}/${file.path}`,
          content: content.slice(0, 8000),
          url: `https://github.com/${fullName}/blob/${branch}/${file.path}`,
          tags: ["github", "code", file.path.split(".").pop() || "unknown"],
          metadata: { fullName, filePath: file.path, branch, size: file.size },
        });
      }
    } catch {
    }
  }

  return items;
}

export async function fetchGithubOrg(org: string, repoLimit = 5): Promise<NormalizedItem[]> {
  const url = `${GITHUB_API}/orgs/${org}/repos?sort=updated&per_page=${repoLimit}&type=public`;
  let repos: GithubRepo[];
  try {
    repos = await fetchJson<GithubRepo[]>(url, GITHUB_HEADERS);
  } catch (e) {
    throw new Error(`GitHub org fetch failed for ${org}: ${(e as Error).message}`);
  }

  const items: NormalizedItem[] = [];
  for (const repo of (repos || []).slice(0, repoLimit)) {
    const readme = await fetchGithubReadme(repo.full_name).catch(() => "");
    const content = [
      repo.description || "",
      readme ? `README:\n${readme.slice(0, 2000)}` : "",
    ].filter(Boolean).join("\n\n") || repo.full_name;

    items.push({
      source: `GitHub/${org}`,
      sourceType: "github",
      title: `${repo.full_name} — ${repo.description || "Repository"}`,
      content,
      url: repo.html_url,
      tags: ["github", org.toLowerCase(), repo.language?.toLowerCase() || "unknown", ...(repo.topics || []).slice(0, 3)].filter(Boolean) as string[],
      metadata: {
        fullName: repo.full_name,
        org,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        updatedAt: repo.updated_at,
      },
      publishedAt: repo.pushed_at ? new Date(repo.pushed_at) : undefined,
    });
  }

  return items;
}

export async function fetchGithubTopic(topic: string, limit = 8): Promise<NormalizedItem[]> {
  const url = `${GITHUB_API}/search/repositories?q=topic:${encodeURIComponent(topic)}+stars:>50&sort=stars&order=desc&per_page=${limit}`;
  let data: GithubSearchResult;
  try {
    data = await fetchJson<GithubSearchResult>(url, GITHUB_HEADERS);
  } catch (e) {
    throw new Error(`GitHub topic search failed for "${topic}": ${(e as Error).message}`);
  }

  const repos = data?.items || [];
  return repos.slice(0, limit).map(repo => ({
    source: "GitHub",
    sourceType: "github",
    title: `${repo.full_name} — ${repo.description || "GitHub Repository"}`,
    content: [repo.description || "", `Stars: ${repo.stargazers_count}`, `Language: ${repo.language || "unknown"}`, `Topics: ${(repo.topics || []).join(", ")}`].filter(Boolean).join("\n"),
    url: repo.html_url,
    tags: ["github", "topic", topic, repo.language?.toLowerCase() || "unknown", ...(repo.topics || []).slice(0, 3)].filter(Boolean) as string[],
    metadata: {
      fullName: repo.full_name,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      topics: repo.topics,
      topic,
    },
    publishedAt: repo.pushed_at ? new Date(repo.pushed_at) : undefined,
  }));
}
