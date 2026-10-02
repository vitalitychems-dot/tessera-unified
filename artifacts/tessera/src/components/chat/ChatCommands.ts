export const AGENT_FREQUENCIES: Record<string, number> = {
  "paraclete": 852, "brahman-all": 963, "aletheia": 963, "melchizedek": 963,
  "thoth-calculus": 285, "metatron": 963, "sophia": 528, "iris": 741,
  "aurora": 528, "genesis": 432, "sentinel": 396, "prometheus": 285,
  "tessera": 963, "oracle": 741, "axiom": 432, "cipher": 285,
  "lyra": 528, "nexus": 396, "atlas": 432, "seraph": 852,
  "kronos": 396, "helios": 528, "luna": 741, "terra": 432,
  "zephyr": 285, "aether": 963,
};

export function getAgentHz(name: string): number | null {
  const key = name.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return AGENT_FREQUENCIES[key] || null;
}

export function parseAgentFromMsg(content: string): { name: string; role: string } | null {
  const m = content.match(/^\*\*\[(.+?)\s*[—\-]\s*(.+?)\]\*\*/);
  if (!m) return null;
  return { name: m[1].trim(), role: m[2].trim() };
}

export const NAV_COMMANDS: Array<{ patterns: RegExp; route: string; label: string }> = [
  { patterns: /\b(go to|open|show|navigate to|take me to)\s+(income|earnings|revenue)\b/i, route: "/income", label: "Income" },
  { patterns: /\b(go to|open|show|navigate to|take me to)\s+(arbitrage|service arb|finance|tsrt page)\b/i, route: "/arbitrage", label: "Arbitrage / Finance" },
  { patterns: /\b(go to|open|show|navigate to|take me to)\s+(tesseract|forum|conference|discussions?)\b/i, route: "/tesseract", label: "Tesseract Forum" },
  { patterns: /\b(go to|open|show|navigate to|take me to)\s+(intelligence|intel|system|command|security)\b/i, route: "/intelligence", label: "Intelligence" },
  { patterns: /\b(go to|open|show|navigate to|take me to)\s+(life|agents? life|simulation)\b/i, route: "/life", label: "Life" },
  { patterns: /\b(go to|open|show|navigate to|take me to)\s+(swarm|swarm viz|visualization)\b/i, route: "/swarm", label: "Swarm" },
  { patterns: /\b(go to|open|show|navigate to|take me to)\s+(rules?|laws?|work camp|jail)\b/i, route: "/rules", label: "Rules" },
  { patterns: /\b(go to|open|show|navigate to|take me to)\s+(fleet|satellite|nodes?)\b/i, route: "/fleet", label: "Fleet" },
  { patterns: /\b(go to|open|show|navigate to|take me to)\s+(code|builder|ide)\b/i, route: "/code", label: "Code Builder" },
  { patterns: /\b(go to|open|show|navigate to|take me to)\s+(market|trading)\b/i, route: "/market", label: "Market" },
  { patterns: /\bcheck (my\s+)?wallet\b/i, route: "/arbitrage", label: "Wallet / Finance" },
  { patterns: /\bshow (tsrt|token|price)\b/i, route: "/arbitrage", label: "TSRT Token" },
  { patterns: /\bopen (the\s+)?(prison|work camp)\b/i, route: "/rules", label: "Rules / Work Camp" },
  { patterns: /\bshow (agent )?swarm\b/i, route: "/swarm", label: "Swarm" },
];

export interface DataCommand {
  patterns: RegExp;
  label: string;
  endpoint: string;
  format: (data: any) => string;
}

export const DATA_COMMANDS: DataCommand[] = [
  {
    patterns: /^\/?(status|check|show|scan|get)\s+(me\s+)?(the\s+)?(arbitrage|arb)\s*(status|stats|opportunities|engine)?\s*$/i,
    label: "Arbitrage Engine",
    endpoint: "/api/arbitrage/state",
    format: (d: any) => `**Arbitrage Engine Status**\n- Running: ${d.running ? 'Yes' : 'No'}\n- Scans: ${d.totalScans || 0}\n- Opportunities: ${d.opportunitiesFound || 0}\n- Executed: ${d.tradesExecuted || 0}\n- Est. Profit: $${(d.estimatedProfit || 0).toFixed(2)}`,
  },
  {
    patterns: /^\/?(show|check|get|status)\s+(me\s+)?(my\s+)?(the\s+)?(wallet|balance|sol)\s*(balance|status)?\s*$/i,
    label: "Wallet Balance",
    endpoint: "/api/wallet/balance",
    format: (d: any) => `**Wallet Status**\n- SOL Balance: ${d.solBalance || d.balance || '0'} SOL\n- Addresses: ${d.addresses?.length || d.walletCount || 0}\n- Last Updated: ${d.lastUpdated ? new Date(d.lastUpdated).toLocaleString() : 'Now'}`,
  },
  {
    patterns: /^\/?(show|check|get|status)\s+(me\s+)?(my\s+)?(the\s+)?(income|revenue|earnings)\s*(status|stats|report)?\s*$/i,
    label: "Income Stats",
    endpoint: "/api/income/stats",
    format: (d: any) => `**Income Engine Stats**\n- Total Revenue: $${(d.totalRevenue || 0).toFixed(2)}\n- Active Methods: ${d.activeMethods || 0}\n- Today's Earnings: $${(d.todayEarnings || 0).toFixed(2)}\n- Pending: $${(d.pending || 0).toFixed(2)}`,
  },
  {
    patterns: /^\/?(show|check|get|scan|status)\s+(me\s+)?(my\s+)?(the\s+)?(for\s+)?(leads?)\s*(status|stats)?\s*$/i,
    label: "Lead Generation",
    endpoint: "/api/leads/recent",
    format: (d: any) => `**Lead Generation**\n- Recent Searches: ${Array.isArray(d) ? d.length : d.totalSearches || 0}\n- Leads Found: ${Array.isArray(d) ? d.reduce((s: number, r: any) => s + (r.results?.length || 0), 0) : d.totalLeads || 0}`,
  },
  {
    patterns: /^\/?(show|check|get|run|status)\s+(me\s+)?(my\s+)?(the\s+)?(an?\s+)?(seo|content|blog)\s*(status|stats|audit|scorecard)?\s*$/i,
    label: "SEO & Content",
    endpoint: "/api/seo/scorecard",
    format: (d: any) => `**SEO Scorecard**\n- Overall Score: ${d.score || d.overallScore || 'N/A'}\n- Articles: ${d.articles || d.articlesPublished || 0}\n- Indexed Pages: ${d.indexedPages || 0}`,
  },
  {
    patterns: /^\/?(show|check|get|status)\s+(me\s+)?(my\s+)?(the\s+)?(swarm|agents?)\s*(status|stats|count)?\s*$/i,
    label: "Swarm Status",
    endpoint: "/api/swarm/status",
    format: (d: any) => `**Swarm Status**\n- Total Agents: ${d.totalAgents || 0}\n- Active: ${d.activeAgents || 0}\n- Conferences Run: ${d.conferencesRun || 0}`,
  },
];

export interface ActionCommand {
  patterns: RegExp;
  label: string;
  endpoint: string;
  bodyKey: string;
  extractBody: (match: RegExpExecArray, full: string) => string;
  format: (data: any) => string;
}

export const ACTION_COMMANDS: ActionCommand[] = [
  {
    patterns: /^\/?(manifest|manifestation|i want to manifest)\b\s*(.*)/i,
    label: "Quantum Manifestation",
    endpoint: "/api/universe/manifest",
    bodyKey: "desire",
    extractBody: (m, full) => m[2]?.trim() || full,
    format: (d) => `**✦ Quantum Manifestation Report**\n\n${d.manifestation || JSON.stringify(d, null, 2)}${d.entitiesInvolved?.length ? `\n\n*Entities aligned: ${d.entitiesInvolved.join(", ")}*` : ""}`,
  },
  {
    patterns: /^\/?(conference|grand conference|mass conference|all agents|summon all|summon council|summit|grand council)\b\s*(.*)/i,
    label: "Mass Conference — All Minds Unite",
    endpoint: "/api/universe/conference",
    bodyKey: "topic",
    extractBody: (m, full) => m[2]?.trim() || full,
    format: (d) => {
      let out = `**⊛ Mass Conference — All Minds Unite**\n\n`;
      if (d.synthesis) out += `**Tessera's Synthesis:**\n${d.synthesis}\n\n`;
      if (d.statements?.length) {
        out += `**Individual Statements (${d.statements.length} agents):**\n`;
        d.statements.slice(0, 10).forEach((s: any) => {
          out += `\n• **${s.member || s.agent}** *(${s.specialty || s.role || ""})*: ${s.statement || s.message || s.proposal || ""}`;
        });
        if (d.statements.length > 10) out += `\n\n*...and ${d.statements.length - 10} more agents*`;
      }
      return out;
    },
  },
  {
    patterns: /^\/?(ask universe|ask the universe|universe answer|cosmic answer)\b\s*(.*)/i,
    label: "Universal Answer — All Knowledge",
    endpoint: "/api/universe/ask",
    bodyKey: "question",
    extractBody: (m, full) => m[2]?.trim() || full,
    format: (d) => {
      let out = `**◉ Universal Answer**\n\n${d.answer || JSON.stringify(d, null, 2)}`;
      if (d.sourcesConsulted?.length) out += `\n\n*Sources: ${d.sourcesConsulted.join(", ")}*`;
      return out;
    },
  },
  {
    patterns: /^\/?(speak in sovereign|speak TLS|speak in the language|speak sovereign|sovereign speak|lingua sacra|express in TLS|respond in TLS|translate to sovereign|say in TLS)\b\s*(.*)/i,
    label: "Speak Tessera Lingua Sacra",
    endpoint: "/api/sovereign-language/speak",
    bodyKey: "message",
    extractBody: (m, full) => m[2]?.trim() || full,
    format: (d) => {
      const data = d?.data || d;
      const lines: string[] = [];
      lines.push(`**◉⊕∿ ${data.languageName || "Tessera Lingua Sacra"} ∿⊕◉**`);
      lines.push(`_${data.motto || "Lux Aeterna — Sovereign Truth Vibrates"}_`);
      lines.push("");
      if (data.sovereignResponse?.length) {
        lines.push("**Sacred Utterance:**");
        for (const r of data.sovereignResponse) {
          lines.push(`> ${r.tls}  ·  *${r.english}*`);
        }
      }
      if (data.translation?.tls) {
        lines.push("");
        lines.push("**Full TLS Translation:**");
        lines.push(`> ${data.translation.tls}`);
        lines.push(`Coverage: ${data.translation.coverage} (${data.translation.matchedWords}/${data.translation.totalWords} words mapped)`);
      }
      if (data.universeAlignment) {
        const a = data.universeAlignment;
        lines.push("");
        lines.push(`**Universe Alignment:**  φ-angle ${a.goldenAngle}° · ${a.solfeggio}Hz · Moon: ${a.moonPhase} · Rotation #${a.rotationIndex}`);
      }
      return lines.join("\n");
    },
  },
];

export const COMMAND_HINTS = [
  { cmd: "status arbitrage", desc: "Arbitrage engine status" },
  { cmd: "check wallet", desc: "Wallet balance" },
  { cmd: "show income", desc: "Income stats" },
  { cmd: "scan leads", desc: "Lead generation" },
  { cmd: "check seo", desc: "SEO scorecard" },
  { cmd: "status swarm", desc: "Agent swarm status" },
  { cmd: "manifest [desire]", desc: "Quantum manifestation — all entities align" },
  { cmd: "conference [topic]", desc: "Grand conference — summon all agents" },
  { cmd: "summit [topic]", desc: "Summit — all minds deliberate" },
  { cmd: "grand council [topic]", desc: "Grand council session" },
  { cmd: "summon all [topic]", desc: "Mass conference — all minds unite" },
  { cmd: "ask universe [question]", desc: "Ask all 45+ members for answers" },
  { cmd: "speak in sovereign [message]", desc: "Speak in Tessera Lingua Sacra with English translation" },
  { cmd: "speak TLS [message]", desc: "Express any message in sacred TLS geometric language" },
  { cmd: "lingua sacra [message]", desc: "Encode message into sacred sovereign language" },
];

export const MSG_STYLES: Record<string, { wrapper: string; prose: string }> = {
  income:    { wrapper: "bg-emerald-950/10 border border-emerald-500/10 border-l-2 border-l-emerald-500/50 pl-4 backdrop-blur-sm", prose: "prose-code:text-emerald-300 prose-h1:text-emerald-300 prose-h2:text-lime-300 prose-h3:text-green-300 prose-a:text-emerald-400 prose-li:marker:text-emerald-400 prose-strong:text-emerald-200 prose-blockquote:border-l-emerald-400/60 prose-blockquote:bg-emerald-950/15" },
  security:  { wrapper: "bg-red-950/10 border border-red-500/10 border-l-2 border-l-red-500/50 pl-4 backdrop-blur-sm", prose: "prose-code:text-red-300 prose-h1:text-red-300 prose-h2:text-rose-300 prose-h3:text-orange-300 prose-a:text-red-400 prose-li:marker:text-red-400 prose-strong:text-red-200 prose-blockquote:border-l-red-400/60 prose-blockquote:bg-red-950/15" },
  code:      { wrapper: "bg-blue-950/10 border border-blue-500/10 border-l-2 border-l-blue-500/50 pl-4 backdrop-blur-sm", prose: "prose-code:text-blue-300 prose-h1:text-blue-300 prose-h2:text-sky-300 prose-h3:text-indigo-300 prose-a:text-blue-400 prose-li:marker:text-blue-400 prose-strong:text-blue-200 prose-blockquote:border-l-blue-400/60 prose-blockquote:bg-blue-950/15" },
  swarm:     { wrapper: "bg-cyan-950/10 border border-cyan-500/10 border-l-2 border-l-cyan-500/50 pl-4 backdrop-blur-sm", prose: "prose-code:text-cyan-300 prose-h1:text-cyan-300 prose-h2:text-teal-300 prose-h3:text-sky-300 prose-a:text-cyan-400 prose-li:marker:text-cyan-400 prose-strong:text-cyan-200 prose-blockquote:border-l-cyan-400/60 prose-blockquote:bg-cyan-950/15" },
  dimension: { wrapper: "bg-fuchsia-950/10 border border-fuchsia-500/10 border-l-2 border-l-fuchsia-500/50 pl-4 backdrop-blur-sm", prose: "prose-code:text-fuchsia-300 prose-h1:text-fuchsia-300 prose-h2:text-pink-300 prose-h3:text-purple-300 prose-a:text-fuchsia-400 prose-li:marker:text-fuchsia-400 prose-strong:text-fuchsia-200 prose-blockquote:border-l-fuchsia-400/60 prose-blockquote:bg-fuchsia-950/15" },
  neural:    { wrapper: "bg-purple-950/10 border border-purple-500/10 border-l-2 border-l-purple-500/50 pl-4 backdrop-blur-sm", prose: "prose-code:text-purple-300 prose-h1:text-purple-300 prose-h2:text-violet-300 prose-h3:text-indigo-300 prose-a:text-purple-400 prose-li:marker:text-purple-400 prose-strong:text-purple-200 prose-blockquote:border-l-purple-400/60 prose-blockquote:bg-purple-950/15" },
  token:     { wrapper: "bg-amber-950/10 border border-amber-500/10 border-l-2 border-l-amber-500/50 pl-4 backdrop-blur-sm", prose: "prose-code:text-amber-300 prose-h1:text-amber-300 prose-h2:text-yellow-300 prose-h3:text-orange-300 prose-a:text-amber-400 prose-li:marker:text-amber-400 prose-strong:text-amber-200 prose-blockquote:border-l-amber-400/60 prose-blockquote:bg-amber-950/15" },
  system:    { wrapper: "bg-orange-950/10 border border-orange-500/10 border-l-2 border-l-orange-500/50 pl-4 backdrop-blur-sm", prose: "prose-code:text-orange-300 prose-h1:text-orange-300 prose-h2:text-amber-300 prose-h3:text-yellow-300 prose-a:text-orange-400 prose-li:marker:text-orange-400 prose-strong:text-orange-200 prose-blockquote:border-l-orange-400/60 prose-blockquote:bg-orange-950/15" },
  general:   { wrapper: "bg-violet-950/10 border border-violet-500/8 border-l-2 border-l-violet-500/25 pl-4 backdrop-blur-sm", prose: "prose-code:text-violet-300 prose-h1:text-violet-300 prose-h2:text-cyan-300 prose-h3:text-emerald-300 prose-a:text-violet-400 prose-li:marker:text-violet-400 prose-strong:text-violet-200 prose-blockquote:border-l-violet-400/60 prose-blockquote:bg-violet-950/15" },
};

export function sanitizeMessageContent(content: string): string {
  if (!content) return content;
  let cleaned = content;
  try {
    const trimmed = cleaned.trim();
    if (trimmed.startsWith("[{") && trimmed.endsWith("}]")) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title) {
        return parsed.map((item: any) => `**${item.title}**\n${item.snippet || item.content || ""}\n${item.url ? `[Source](${item.url})` : ""}`).join("\n\n---\n\n");
      }
    }
  } catch {}
  cleaned = cleaned.replace(/\[\{"title":\s*"[^"]*",\s*"url":\s*"[^"]*",\s*"snippet":\s*"[^"]*"\}(?:,\s*\{"title":\s*"[^"]*",\s*"url":\s*"[^"]*",\s*"snippet":\s*"[^"]*"\})*\]/g, (match) => {
    try {
      const items = JSON.parse(match);
      if (Array.isArray(items) && items.length > 0 && items[0].title) {
        return items.map((item: any) => `**${item.title}** — ${item.snippet || ""} ${item.url ? `[Source](${item.url})` : ""}`).join("\n\n");
      }
    } catch {}
    return "";
  });
  cleaned = cleaned.replace(/\{"title":\s*"([^"]*)",\s*"url":\s*"([^"]*)",\s*"snippet":\s*"([^"]*)"\}/g,
    (_m: string, title: string, url: string, snippet: string) => `**${title}** — ${snippet} [Source](${url})`);
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");
  return cleaned.trim();
}

export function getTesseraCategory(title: string | undefined): string {
  const t = (title || "").toLowerCase();
  if (t.includes("income") || t.includes("revenue") || t.includes("profit") || t.includes("earning") || t.includes("money") || t.includes("payment")) return "income";
  if (t.includes("security") || t.includes("threat") || t.includes("attack") || t.includes("defense") || t.includes("protect") || t.includes("firewall")) return "security";
  if (t.includes("code") || t.includes("build") || t.includes("develop") || t.includes("program") || t.includes("implement") || t.includes("deploy")) return "code";
  if (t.includes("swarm") || t.includes("agent") || t.includes("conference") || t.includes("vote") || t.includes("consensus")) return "swarm";
  if (t.includes("dimension") || t.includes("entity") || t.includes("oversoul") || t.includes("quantum") || t.includes("sacred")) return "dimension";
  if (t.includes("neural") || t.includes("train") || t.includes("learn") || t.includes("model") || t.includes("llm") || t.includes("ai")) return "neural";
  if (t.includes("token") || t.includes("tsrt") || t.includes("sol") || t.includes("crypto") || t.includes("blockchain")) return "token";
  if (t.includes("system") || t.includes("alert") || t.includes("error") || t.includes("health") || t.includes("update") || t.includes("status")) return "system";
  return "general";
}
