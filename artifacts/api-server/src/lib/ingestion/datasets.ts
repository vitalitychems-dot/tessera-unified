import { fetchJson, fetchText } from "./scrapers";
import { htmlToText } from "./pipeline";
import type { NormalizedItem } from "./pipeline";

export async function fetchDataGov(query = "technology", limit = 5): Promise<NormalizedItem[]> {
  const url = `https://catalog.data.gov/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=${limit}&sort=score+desc`;
  let data: any;
  try {
    data = await fetchJson<any>(url);
  } catch (e) {
    throw new Error(`data.gov fetch failed: ${(e as Error).message}`);
  }

  const results: any[] = data?.result?.results || [];
  return results.filter(d => d.title && (d.notes || d.description)).map(d => ({
    source: "data.gov",
    sourceType: "open-dataset",
    title: d.title,
    content: [
      d.notes || d.description || "",
      d.organization?.title ? `Organization: ${d.organization.title}` : "",
      d.license_title ? `License: ${d.license_title}` : "",
      Array.isArray(d.tags) ? `Tags: ${d.tags.map((t: any) => t.name).join(", ")}` : "",
    ].filter(Boolean).join("\n"),
    url: `https://catalog.data.gov/dataset/${d.name}`,
    tags: ["data.gov", "open-data", query, ...(Array.isArray(d.tags) ? d.tags.slice(0, 5).map((t: any) => t.name) : [])].filter(Boolean) as string[],
    metadata: {
      id: d.id,
      name: d.name,
      organization: d.organization?.title,
      license: d.license_title,
      resourceCount: d.num_resources,
      format: d.resources?.map((r: any) => r.format).filter(Boolean).join(", "),
    },
    publishedAt: d.metadata_created ? new Date(d.metadata_created) : undefined,
  }));
}

export async function fetchOpenDataSoft(domain = "public", query = "environment", limit = 5): Promise<NormalizedItem[]> {
  const url = `https://data.opendatasoft.com/api/explore/v2.1/catalog/datasets?where=${encodeURIComponent(query)}&limit=${limit}&lang=en`;
  let data: any;
  try {
    data = await fetchJson<any>(url);
  } catch (e) {
    throw new Error(`OpenDataSoft fetch failed: ${(e as Error).message}`);
  }

  const results: any[] = data?.results || [];
  return results.filter(d => d.dataset_id && d.metas?.default?.title).map(d => {
    const meta = d.metas?.default || {};
    return {
      source: "OpenDataSoft",
      sourceType: "open-dataset",
      title: meta.title || d.dataset_id,
      content: [
        meta.description || "",
        meta.keyword ? `Keywords: ${Array.isArray(meta.keyword) ? meta.keyword.join(", ") : meta.keyword}` : "",
        meta.publisher ? `Publisher: ${meta.publisher}` : "",
        meta.theme ? `Theme: ${Array.isArray(meta.theme) ? meta.theme.join(", ") : meta.theme}` : "",
      ].filter(Boolean).join("\n"),
      url: `https://data.opendatasoft.com/explore/dataset/${d.dataset_id}/`,
      tags: ["opendatasoft", "open-data", ...(Array.isArray(meta.keyword) ? meta.keyword.slice(0, 5) : [])].filter(Boolean) as string[],
      metadata: {
        datasetId: d.dataset_id,
        publisher: meta.publisher,
        theme: meta.theme,
        records: d.count,
      },
      publishedAt: meta.modified ? new Date(meta.modified) : undefined,
    };
  });
}

export async function fetchWorldBankData(indicator = "NY.GDP.MKTP.CD", limit = 5): Promise<NormalizedItem[]> {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&mrv=1&per_page=${limit}`;
  let raw: any;
  try {
    raw = await fetchJson<any>(url);
  } catch (e) {
    throw new Error(`World Bank fetch failed: ${(e as Error).message}`);
  }

  const meta = Array.isArray(raw) ? raw[0] : null;
  const data: any[] = Array.isArray(raw) && raw.length > 1 ? raw[1] : [];

  const indicatorName = data[0]?.indicator?.value || indicator;

  const grouped: Record<string, any[]> = {};
  for (const row of data) {
    if (!row.country?.value) continue;
    if (!grouped[row.country.value]) grouped[row.country.value] = [];
    grouped[row.country.value].push(row);
  }

  return Object.entries(grouped).slice(0, limit).map(([country, rows]) => {
    const latest = rows[0];
    const valueStr = latest.value != null ? String(latest.value) : "N/A";
    return {
      source: "World Bank",
      sourceType: "open-dataset",
      title: `${indicatorName} — ${country} (${latest.date})`,
      content: [
        `Indicator: ${indicatorName}`,
        `Country: ${country}`,
        `Latest Value: ${valueStr} (${latest.date})`,
        rows.length > 1 ? `Historical: ${rows.slice(1).map(r => `${r.date}: ${r.value ?? "N/A"}`).join(", ")}` : "",
      ].filter(Boolean).join("\n"),
      url: `https://data.worldbank.org/indicator/${indicator}?locations=${latest.countryiso3code || ""}`,
      tags: ["world-bank", "economics", "data", indicator.toLowerCase(), country.toLowerCase().replace(/\s/g, "-")],
      metadata: { indicator, country, countryCode: latest.countryiso3code, latestValue: latest.value, latestDate: latest.date },
      publishedAt: latest.date ? new Date(`${latest.date}-01-01`) : undefined,
    };
  });
}

export async function fetchUNData(datasetId = "DP_LCN_HOUS.A", limit = 5): Promise<NormalizedItem[]> {
  const url = `https://unstats.un.org/SDGAPI/v1/sdg/Indicator/List?pageSize=${limit}`;
  let data: any;
  try {
    data = await fetchJson<any>(url);
  } catch (e) {
    throw new Error(`UN Stats fetch failed: ${(e as Error).message}`);
  }

  const indicators: any[] = Array.isArray(data) ? data.slice(0, limit) : (data?.items || []).slice(0, limit);
  return indicators.filter(i => i.code && i.description).map(i => ({
    source: "UN SDG Data",
    sourceType: "open-dataset",
    title: `SDG Indicator ${i.code}: ${i.description || ""}`.slice(0, 200),
    content: [
      `Code: ${i.code}`,
      `Description: ${i.description || ""}`,
      i.goal ? `Goal: SDG ${i.goal}` : "",
      i.target ? `Target: ${i.target}` : "",
    ].filter(Boolean).join("\n"),
    url: `https://unstats.un.org/sdgs/metadata/?Text=&Goal=${i.goal || ""}&Target=${i.target || ""}`,
    tags: ["un", "sdg", "data", "indicators", `goal-${i.goal || "unknown"}`].filter(Boolean) as string[],
    metadata: { code: i.code, goal: i.goal, target: i.target },
  }));
}

export async function fetchGithubPublicDatasets(topic = "dataset", limit = 5): Promise<NormalizedItem[]> {
  const url = `https://api.github.com/search/repositories?q=topic:${encodeURIComponent(topic)}+topic:open-data+stars:>10&sort=stars&order=desc&per_page=${limit}`;
  let data: any;
  try {
    data = await fetchJson<any>(url, {
      "Accept": "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    });
  } catch (e) {
    throw new Error(`GitHub dataset search failed: ${(e as Error).message}`);
  }

  const repos: any[] = data?.items || [];
  return repos.slice(0, limit).map(repo => ({
    source: "GitHub Datasets",
    sourceType: "open-dataset",
    title: `${repo.full_name} — ${repo.description || "Public Dataset"}`,
    content: [
      repo.description || "",
      `Stars: ${repo.stargazers_count}`,
      `Language: ${repo.language || "N/A"}`,
      `Topics: ${(repo.topics || []).join(", ")}`,
    ].filter(Boolean).join("\n"),
    url: repo.html_url,
    tags: ["github", "dataset", "open-data", ...(repo.topics || []).slice(0, 4)].filter(Boolean) as string[],
    metadata: {
      fullName: repo.full_name,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      topics: repo.topics,
    },
    publishedAt: repo.pushed_at ? new Date(repo.pushed_at) : undefined,
  }));
}

export async function fetchOurWorldInData(indicator = "life-expectancy"): Promise<NormalizedItem[]> {
  const url = `https://ourworldindata.org/grapher/${indicator}.csv`;
  let csv: string;
  try {
    csv = await fetchText(url);
  } catch (e) {
    return [];
  }

  const lines = csv.split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1, 6).map(l => {
    const vals = l.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  });

  if (!rows.length) return [];

  return [{
    source: "Our World in Data",
    sourceType: "open-dataset",
    title: `Our World in Data: ${indicator.replace(/-/g, " ")}`,
    content: [
      `Dataset: ${indicator}`,
      `Sample rows (${rows.length}):`,
      ...rows.map(r => Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(", ")),
    ].join("\n"),
    url: `https://ourworldindata.org/grapher/${indicator}`,
    tags: ["our-world-in-data", "dataset", "statistics", indicator],
    metadata: { indicator, headers, rowCount: lines.length - 1 },
  }];
}
