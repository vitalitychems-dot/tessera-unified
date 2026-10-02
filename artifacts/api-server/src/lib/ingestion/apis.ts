import { fetchJson, fetchText } from "./scrapers";
import type { NormalizedItem } from "./pipeline";

function getNasaApiKey(): string {
  if (process.env.NASA_API_KEY) return process.env.NASA_API_KEY;
  if (process.env.NODE_ENV !== "production") return "DEMO_KEY";
  throw new Error("NASA_API_KEY environment variable is required in production");
}

export async function fetchNASA(): Promise<NormalizedItem[]> {
  const data = await fetchJson<any>(
    `https://api.nasa.gov/planetary/apod?api_key=${getNasaApiKey()}&count=5`
  );
  const items: any[] = Array.isArray(data) ? data : [data];
  return items.map(item => ({
    source: "NASA APOD",
    sourceType: "api",
    title: item.title,
    content: item.explanation || item.title,
    url: item.url || item.hdurl,
    tags: ["nasa", "astronomy", "apod", item.media_type],
    metadata: { date: item.date, mediaType: item.media_type, copyright: item.copyright },
    publishedAt: item.date ? new Date(item.date) : undefined,
  }));
}

export async function fetchUSGS(): Promise<NormalizedItem[]> {
  const data = await fetchJson<any>(
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson"
  );
  const features: any[] = data?.features || [];
  return features.slice(0, 10).map(f => {
    const p = f.properties || {};
    const mag = p.mag ?? "?";
    const place = p.place || "Unknown location";
    return {
      source: "USGS Earthquakes",
      sourceType: "api",
      title: `M${mag} earthquake near ${place}`,
      content: `Magnitude ${mag} earthquake detected near ${place}. Status: ${p.status || "unknown"}. Tsunami: ${p.tsunami ? "Yes" : "No"}. Alert: ${p.alert || "none"}.`,
      url: p.url,
      tags: ["usgs", "earthquake", "seismic", `M${Math.floor(mag)}`],
      metadata: { magnitude: mag, place, depth: f.geometry?.coordinates?.[2], alert: p.alert, tsunami: p.tsunami },
      publishedAt: p.time ? new Date(p.time) : undefined,
    };
  });
}

export async function fetchNOAA(): Promise<NormalizedItem[]> {
  const data = await fetchJson<any>(
    "https://api.weather.gov/alerts/active?status=actual&message_type=alert&limit=10"
  );
  const features: any[] = data?.features || [];
  return features.slice(0, 10).map(f => {
    const p = f.properties || {};
    return {
      source: "NOAA Weather Alerts",
      sourceType: "api",
      title: p.headline || p.event || "Weather Alert",
      content: p.description || p.headline || "No description",
      url: p["@id"],
      tags: ["noaa", "weather", "alert", (p.severity || "").toLowerCase()],
      metadata: { event: p.event, severity: p.severity, certainty: p.certainty, urgency: p.urgency, areaDesc: p.areaDesc },
      publishedAt: p.onset ? new Date(p.onset) : undefined,
    };
  });
}

export async function fetchWikipedia(topics: string[] = ["Artificial intelligence", "Quantum computing", "Climate change"]): Promise<NormalizedItem[]> {
  const items: NormalizedItem[] = [];
  for (const topic of topics.slice(0, 3)) {
    try {
      const data = await fetchJson<any>(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`
      );
      if (data.extract) {
        items.push({
          source: "Wikipedia",
          sourceType: "api",
          title: data.title,
          content: data.extract,
          url: data.content_urls?.desktop?.page,
          tags: ["wikipedia", "encyclopedia"],
          metadata: { pageId: data.pageid, description: data.description },
        });
      }
    } catch (_e) {
    }
  }
  return items;
}

export async function fetchArxiv(query = "artificial intelligence", maxResults = 5): Promise<NormalizedItem[]> {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
  const text = await fetchText(url);

  const items: NormalizedItem[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(text)) !== null) {
    const entry = match[1];
    const getTag = (tag: string) => {
      const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].trim().replace(/<[^>]+>/g, "").trim() : "";
    };
    const title = getTag("title");
    const summary = getTag("summary");
    const id = getTag("id");
    const published = getTag("published");
    const authors = [...entry.matchAll(/<name>([^<]+)<\/name>/g)].map(m => m[1]).join(", ");

    if (title && summary) {
      items.push({
        source: "arXiv",
        sourceType: "api",
        title,
        content: `${summary}\n\nAuthors: ${authors}`,
        url: id,
        tags: ["arxiv", "research", "paper"],
        metadata: { authors, arxivId: id.split("/abs/")[1] || id },
        publishedAt: published ? new Date(published) : undefined,
      });
    }
  }

  return items;
}

export async function fetchHackerNews(type: "topstories" | "newstories" = "topstories", limit = 10): Promise<NormalizedItem[]> {
  const ids = await fetchJson<number[]>(
    `https://hacker-news.firebaseio.com/v0/${type}.json`
  );
  const topIds = (ids || []).slice(0, limit);
  const items: NormalizedItem[] = [];

  for (const id of topIds) {
    try {
      const story = await fetchJson<any>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      if (story && story.title) {
        items.push({
          source: "Hacker News",
          sourceType: "api",
          title: story.title,
          content: story.text ? story.text.replace(/<[^>]+>/g, " ").trim() : story.title,
          url: story.url || `https://news.ycombinator.com/item?id=${id}`,
          tags: ["hackernews", "tech", "community"],
          metadata: { score: story.score, by: story.by, descendants: story.descendants, hnId: id },
          publishedAt: story.time ? new Date(story.time * 1000) : undefined,
        });
      }
    } catch (_e) {
    }
  }

  return items;
}

export async function fetchRedditJson(subreddit = "technology", limit = 10): Promise<NormalizedItem[]> {
  const data = await fetchJson<any>(
    `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`
  );
  const posts: any[] = data?.data?.children || [];
  return posts.map(p => p.data).filter(d => d && d.title).map(d => ({
    source: `Reddit r/${subreddit}`,
    sourceType: "api",
    title: d.title,
    content: d.selftext || d.title,
    url: `https://www.reddit.com${d.permalink}`,
    tags: ["reddit", subreddit, d.link_flair_text].filter(Boolean) as string[],
    metadata: { score: d.score, author: d.author, numComments: d.num_comments, upvoteRatio: d.upvote_ratio },
    publishedAt: d.created_utc ? new Date(d.created_utc * 1000) : undefined,
  }));
}

export async function fetchCoinGecko(coins = ["bitcoin", "ethereum", "solana"]): Promise<NormalizedItem[]> {
  const ids = coins.slice(0, 10).join(",");
  const data = await fetchJson<any[]>(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false`
  );
  return (data || []).map(coin => ({
    source: "CoinGecko",
    sourceType: "api",
    title: `${coin.name} (${coin.symbol?.toUpperCase()}) Market Data`,
    content: `${coin.name} is currently priced at $${coin.current_price?.toLocaleString()} USD. 24h change: ${coin.price_change_percentage_24h?.toFixed(2)}%. Market cap: $${coin.market_cap?.toLocaleString()}. Volume 24h: $${coin.total_volume?.toLocaleString()}.`,
    url: `https://www.coingecko.com/en/coins/${coin.id}`,
    tags: ["crypto", "coingecko", coin.id, coin.symbol],
    metadata: { price: coin.current_price, marketCap: coin.market_cap, volume24h: coin.total_volume, change24h: coin.price_change_percentage_24h },
    publishedAt: coin.last_updated ? new Date(coin.last_updated) : undefined,
  }));
}

export async function fetchSemanticScholar(query = "large language models", limit = 5): Promise<NormalizedItem[]> {
  const data = await fetchJson<any>(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,abstract,authors,year,url,externalIds`
  );
  const papers: any[] = data?.data || [];
  return papers.filter(p => p.title && p.abstract).map(p => ({
    source: "Semantic Scholar",
    sourceType: "api",
    title: p.title,
    content: `${p.abstract}\n\nAuthors: ${(p.authors || []).map((a: any) => a.name).join(", ")}`,
    url: p.url || (p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : undefined),
    tags: ["semantic-scholar", "research", "paper"],
    metadata: { year: p.year, authors: p.authors, paperId: p.paperId, doi: p.externalIds?.DOI },
    publishedAt: p.year ? new Date(`${p.year}-01-01`) : undefined,
  }));
}

export async function fetchPubMed(query = "artificial intelligence medicine", maxResults = 5): Promise<NormalizedItem[]> {
  const searchData = await fetchJson<any>(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`
  );
  const ids: string[] = searchData?.esearchresult?.idlist || [];
  if (!ids.length) return [];

  const summaryData = await fetchJson<any>(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
  );
  const result = summaryData?.result || {};

  return ids.map(id => {
    const article = result[id];
    if (!article) return null;
    const title = article.title || "";
    const authors = (article.authors || []).map((a: any) => a.name).join(", ");
    const pubDate = article.pubdate || "";
    return {
      source: "PubMed",
      sourceType: "api",
      title,
      content: `${title}. Authors: ${authors}. Published: ${pubDate}. Source: ${article.source || "NCBI"}.`,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      tags: ["pubmed", "medical", "research", "paper"],
      metadata: { pmid: id, authors: article.authors, source: article.source, pubDate },
      publishedAt: pubDate ? new Date(pubDate) : undefined,
    };
  }).filter(Boolean) as NormalizedItem[];
}

// PokéAPI v2 — free, no auth required. Reference: https://pokeapi.co/docs/v2
// PokéAPI has no rate-limit policy and a CDN, so we bypass the 2s/domain
// scraper throttle and parallelize with a small concurrency cap.
const POKEAPI_BASE = "https://pokeapi.co/api/v2";

interface PokeResource { name: string; url: string }
interface PokeListResponse { count: number; next: string | null; previous: string | null; results: PokeResource[] }

async function pokeFetch<T>(url: string): Promise<T> {
  const { safeFetchJson } = await import("../safe-fetch");
  return safeFetchJson<T>(url, {
    headers: { "Accept": "application/json", "User-Agent": "Tessera/PokéAPI-ingest" },
    timeoutMs: 10000,
    providerId: "pokeapi",
    providerName: "PokéAPI",
  });
}

async function pokeList(endpoint: string, limit: number, offset = 0): Promise<PokeResource[]> {
  const data = await pokeFetch<PokeListResponse>(`${POKEAPI_BASE}/${endpoint}?limit=${limit}&offset=${offset}`);
  return Array.isArray(data?.results) ? data.results : [];
}

async function pokeBatch<T>(urls: string[], concurrency = 5): Promise<(T | null)[]> {
  const out: (T | null)[] = new Array(urls.length).fill(null);
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const idx = cursor++;
      try { out[idx] = await pokeFetch<T>(urls[idx]); } catch { out[idx] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return out;
}

function flavorText(entries: { language?: { name?: string }; flavor_text?: string }[] | undefined): string {
  if (!Array.isArray(entries)) return "";
  const en = entries.find(e => e?.language?.name === "en" && e?.flavor_text);
  return en?.flavor_text?.replace(/[\n\f\r]+/g, " ").trim() ?? "";
}

function effectText(entries: { language?: { name?: string }; effect?: string; short_effect?: string }[] | undefined): string {
  if (!Array.isArray(entries)) return "";
  const en = entries.find(e => e?.language?.name === "en");
  return (en?.effect || en?.short_effect || "").replace(/\s+/g, " ").trim();
}

export async function fetchPokemonSpecies(limit = 20, offset = 0): Promise<NormalizedItem[]> {
  const list = await pokeList("pokemon-species", limit, offset);
  const details = await pokeBatch<any>(list.map(r => r.url));
  const items: NormalizedItem[] = [];
  for (const sp of details) {
    if (!sp) continue;
    try {
      const desc = flavorText(sp?.flavor_text_entries);
      const genus = (sp?.genera ?? []).find((g: any) => g?.language?.name === "en")?.genus ?? "";
      const habitat = sp?.habitat?.name ?? "unknown";
      const generation = sp?.generation?.name ?? "unknown";
      const color = sp?.color?.name ?? "unknown";
      const evolves = sp?.evolves_from_species?.name ?? "none";
      const baseHappiness = sp?.base_happiness ?? 0;
      const captureRate = sp?.capture_rate ?? 0;
      items.push({
        source: "PokéAPI Species",
        sourceType: "api",
        title: `Pokémon #${sp.id}: ${sp.name} (${genus})`,
        content: `${sp.name} is a ${color} ${genus} from ${generation}. Habitat: ${habitat}. Evolves from: ${evolves}. Base happiness: ${baseHappiness}. Capture rate: ${captureRate}. ${desc}`,
        url: `https://pokeapi.co/api/v2/pokemon-species/${sp.id}`,
        tags: ["pokeapi", "pokemon", "species", color, generation, habitat],
        metadata: { id: sp.id, name: sp.name, generation, color, habitat, captureRate, baseHappiness, isLegendary: !!sp.is_legendary, isMythical: !!sp.is_mythical },
      });
    } catch (_e) { /* skip individual failures */ }
  }
  return items;
}

export async function fetchPokemonMoves(limit = 15, offset = 0): Promise<NormalizedItem[]> {
  const list = await pokeList("move", limit, offset);
  const details = await pokeBatch<any>(list.map(r => r.url));
  const items: NormalizedItem[] = [];
  for (const m of details) {
    if (!m) continue;
    try {
      const eff = effectText(m?.effect_entries) || flavorText(m?.flavor_text_entries);
      items.push({
        source: "PokéAPI Moves",
        sourceType: "api",
        title: `Move: ${m.name} (${m.type?.name ?? "?"} / ${m.damage_class?.name ?? "?"})`,
        content: `${m.name} — type ${m.type?.name}, ${m.damage_class?.name} class. Power ${m.power ?? "—"}, accuracy ${m.accuracy ?? "—"}, PP ${m.pp ?? "—"}, priority ${m.priority ?? 0}. Effect: ${eff}`,
        url: `https://pokeapi.co/api/v2/move/${m.id}`,
        tags: ["pokeapi", "move", m.type?.name, m.damage_class?.name].filter(Boolean) as string[],
        metadata: { id: m.id, type: m.type?.name, power: m.power, accuracy: m.accuracy, pp: m.pp, priority: m.priority, damageClass: m.damage_class?.name },
      });
    } catch (_e) { /* skip */ }
  }
  return items;
}

export async function fetchPokemonAbilities(limit = 15, offset = 0): Promise<NormalizedItem[]> {
  const list = await pokeList("ability", limit, offset);
  const details = await pokeBatch<any>(list.map(r => r.url));
  const items: NormalizedItem[] = [];
  for (const a of details) {
    if (!a) continue;
    try {
      const eff = effectText(a?.effect_entries) || flavorText(a?.flavor_text_entries);
      const carriers = (a?.pokemon ?? []).slice(0, 5).map((p: any) => p?.pokemon?.name).filter(Boolean).join(", ");
      items.push({
        source: "PokéAPI Abilities",
        sourceType: "api",
        title: `Ability: ${a.name}`,
        content: `${a.name} — ${eff}. Notable carriers: ${carriers || "n/a"}.`,
        url: `https://pokeapi.co/api/v2/ability/${a.id}`,
        tags: ["pokeapi", "ability", a.generation?.name].filter(Boolean) as string[],
        metadata: { id: a.id, generation: a.generation?.name, isMainSeries: !!a.is_main_series },
      });
    } catch (_e) { /* skip */ }
  }
  return items;
}

export async function fetchPokemonTypes(): Promise<NormalizedItem[]> {
  const list = await pokeList("type", 3, 0);
  const details = await pokeBatch<any>(list.map(r => r.url));
  const items: NormalizedItem[] = [];
  for (const t of details) {
    if (!t) continue;
    try {
      const dr = t?.damage_relations ?? {};
      const fmt = (arr: any[]) => (arr ?? []).map((x: any) => x?.name).filter(Boolean).join(", ") || "none";
      items.push({
        source: "PokéAPI Types",
        sourceType: "api",
        title: `Type: ${t.name}`,
        content: `${t.name} type. Double damage to: ${fmt(dr.double_damage_to)}. Double damage from: ${fmt(dr.double_damage_from)}. Half damage to: ${fmt(dr.half_damage_to)}. Half damage from: ${fmt(dr.half_damage_from)}. No damage to: ${fmt(dr.no_damage_to)}. No damage from: ${fmt(dr.no_damage_from)}.`,
        url: `https://pokeapi.co/api/v2/type/${t.id}`,
        tags: ["pokeapi", "type", t.name],
        metadata: { id: t.id, name: t.name, generation: t.generation?.name, damageRelations: dr },
      });
    } catch (_e) { /* skip */ }
  }
  return items;
}

export async function fetchOpenStreetMap(bbox = "-74.01,40.70,-73.96,40.75"): Promise<NormalizedItem[]> {
  const data = await fetchJson<any>(
    `https://nominatim.openstreetmap.org/search?q=point+of+interest&format=json&limit=10&bounded=1&viewbox=${bbox}`
  );
  const places: any[] = Array.isArray(data) ? data : [];
  return places.map(p => ({
    source: "OpenStreetMap",
    sourceType: "api",
    title: p.display_name,
    content: `${p.display_name} — Type: ${p.type}, Class: ${p.class}. Location: ${p.lat}, ${p.lon}.`,
    url: `https://www.openstreetmap.org/${p.osm_type}/${p.osm_id}`,
    tags: ["osm", "map", p.type, p.class].filter(Boolean) as string[],
    metadata: { lat: p.lat, lon: p.lon, osmType: p.osm_type, osmId: p.osm_id, type: p.type },
  }));
}

export async function fetchWikidata(qids: string[] = ["Q42", "Q7186", "Q11032"]): Promise<NormalizedItem[]> {
  const ids = qids.slice(0, 5).join("|");
  const data = await fetchJson<any>(
    `https://www.wikidata.org/api/rest_v1/page/summary/${qids[0]}`
  );
  const items: NormalizedItem[] = [];
  if (data?.extract) {
    items.push({
      source: "Wikidata",
      sourceType: "api",
      title: data.title,
      content: data.extract,
      url: data.content_urls?.desktop?.page,
      tags: ["wikidata", "knowledge-graph"],
      metadata: { qid: qids[0], description: data.description },
    });
  }
  return items;
}
