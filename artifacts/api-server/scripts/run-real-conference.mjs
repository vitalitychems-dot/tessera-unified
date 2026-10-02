#!/usr/bin/env node
// Standalone Grand Council conference runner.
// Calls the upstream LLM directly per agent (serially, with backoff on 429),
// aggregates Φ-weighted Borda + per-option approval, persists to council_decisions,
// and prints the full transcript + JSON to stdout.
//
// Usage:
//   node artifacts/api-server/scripts/run-real-conference.mjs <conf-body.json>
//
// The body file has: { topic, context, options:[{id,title,description,pros?,cons?}], decisionIdPrefix? }

import fs from "node:fs";
import process from "node:process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { Pool } = require("/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg");

const PHI = (1 + Math.sqrt(5)) / 2;
const COUNCIL = ["Alpha","Beta","Gamma","Delta","Epsilon","Zeta","Eta","Theta","Iota","Kappa","Lambda","Mu","Nu","Xi","Omicron","Pi","Rho","Sigma","Tau","Upsilon","Phi","Chi","Psi","Omega"];
const SPEC = {
  Alpha:["security","infrastructure"], Beta:["income","feature"], Gamma:["governance","community"],
  Delta:["security","feature"], Epsilon:["infrastructure","income"], Zeta:["community","governance"],
  Eta:["feature","infrastructure"], Theta:["income","security"], Iota:["governance","feature"],
  Kappa:["infrastructure","community"], Lambda:["security","income"], Mu:["feature","governance"],
  Nu:["community","infrastructure"], Xi:["income","feature"], Omicron:["governance","security"],
  Pi:["infrastructure","income"], Rho:["feature","community"], Sigma:["security","governance"],
  Tau:["income","infrastructure"], Upsilon:["community","feature"], Phi:["governance","income"],
  Chi:["infrastructure","security"], Psi:["feature","community"], Omega:["security","infrastructure"],
};

const BASE = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const MODEL = process.env.CONFERENCE_MODEL || "gpt-5-mini";
if (!BASE || !KEY) { console.error("Missing AI_INTEGRATIONS_OPENAI_* env"); process.exit(2); }
if (!process.env.DATABASE_URL) { console.error("Missing DATABASE_URL"); process.exit(2); }

function sacredGeometryWeight(name, cat) {
  let h = 0; const k = `${name}:${cat}`;
  for (let i=0;i<k.length;i++) h = ((h<<5)-h+k.charCodeAt(i))|0;
  const phase = ((Math.abs(h)%1000)/1000)*2*Math.PI;
  const base = 0.5 + 0.5*Math.sin(phase*PHI);
  const bonus = name === "Phi" ? 0.15 : 0;
  return Math.min(1.5, 0.75 + base*0.5 + bonus);
}

function categoryFor(topic, ctx) {
  const t = `${topic} ${ctx}`.toLowerCase();
  if (/(security|cipher|encrypt|key|attack|threat)/.test(t)) return "security";
  if (/(governance|doctrine|codex|amendment|charter|policy)/.test(t)) return "governance";
  if (/(infra|database|storage|deploy|server|migration)/.test(t)) return "infrastructure";
  if (/(community|forum|members|users|onboard)/.test(t)) return "community";
  if (/(income|revenue|treasury|payment|stripe|monet)/.test(t)) return "income";
  return "feature";
}

async function callLLM(messages, { maxTokens = 600, attempts = 4 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 90_000);
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const text = await res.text();
      if (!res.ok) {
        if (res.status === 429 || res.status === 503) {
          const wait = 2500 * (i + 1);
          process.stderr.write(`  [retry in ${wait}ms — ${res.status}]\n`);
          await new Promise(r => setTimeout(r, wait));
          lastErr = new Error(`http_${res.status}: ${text.slice(0,160)}`);
          continue;
        }
        throw new Error(`http_${res.status}: ${text.slice(0,200)}`);
      }
      const json = JSON.parse(text);
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error("no_content");
      return content;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr ?? new Error("unknown");
}

function buildSystem(agent, specialties, topic, optCount) {
  return [
    `You are ${agent}Agent, a sovereign voting member of the Tessera Grand Council.`,
    `Your declared specialties: ${specialties.join(", ")}.`,
    `You will rank ${optCount} mutually exclusive options on the topic: "${topic}".`,
    ``,
    `RULES OF DELIBERATION:`,
    `1. You MUST rank ALL options from best (1st) to worst.`,
    `2. For EACH option vote "approve", "reject", or "abstain". Abstain is reserved for genuine lack of expertise.`,
    `3. You MUST identify at least one concrete tradeoff that distinguishes your top choice from the runner-up.`,
    `4. You MUST flag a real risk or cost. A vote naming no downside is invalid.`,
    `5. Speak as ${agent}Agent in a single short paragraph (3-5 sentences).`,
    ``,
    `OUTPUT — return ONLY a single JSON object (no markdown, no prose around it):`,
    `{"ranking":["<id>",...],"approvals":{"<id>":"approve|reject|abstain",...},"reasoning":"...","confidence":0.4-0.99}`,
  ].join("\n");
}

function buildUser(topic, ctx, options) {
  const opts = options.map(o => {
    const pros = o.pros?.length ? `\n  Pros: ${o.pros.join("; ")}` : "";
    const cons = o.cons?.length ? `\n  Cons: ${o.cons.join("; ")}` : "";
    return `[${o.id}] ${o.title}\n  ${o.description}${pros}${cons}`;
  }).join("\n\n");
  return `TOPIC: ${topic}\n\nCONTEXT:\n${ctx}\n\nOPTIONS:\n${opts}\n\nDeliberate and emit your JSON ballot now.`;
}

function parseBallot(raw, options) {
  const ids = new Set(options.map(o => o.id));
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return { error: "no_json", reasoning: raw.slice(0, 200) };
  let p; try { p = JSON.parse(m[0]); } catch { return { error: "bad_json", reasoning: raw.slice(0, 200) }; }
  const ranking = Array.isArray(p.ranking) ? p.ranking.filter(x => typeof x === "string" && ids.has(x)) : [];
  for (const id of ids) if (!ranking.includes(id)) ranking.push(id);
  const approvals = {};
  const aRaw = (p.approvals && typeof p.approvals === "object") ? p.approvals : {};
  for (const id of ids) {
    const v = aRaw[id];
    approvals[id] = (v === "approve" || v === "reject" || v === "abstain") ? v : "abstain";
  }
  const reasoning = typeof p.reasoning === "string" ? p.reasoning.slice(0, 600) : "";
  const confidence = Math.min(0.99, Math.max(0.3, Number(p.confidence) || 0.6));
  if (!reasoning) return { ranking, approvals, reasoning, confidence, error: "empty_reasoning" };
  return { ranking, approvals, reasoning, confidence };
}

async function deliberate(agent, topic, ctx, options, category) {
  const specialties = SPEC[agent] || ["feature"];
  const isSpecialist = specialties.includes(category);
  const baseW = isSpecialist ? PHI : 1.0;
  const geo = sacredGeometryWeight(agent, category);
  const weight = baseW * (0.85 + geo * 0.15);
  let raw = "", parseError;
  try {
    raw = await callLLM([
      { role: "system", content: buildSystem(agent, specialties, topic, options.length) },
      { role: "user",   content: buildUser(topic, ctx, options) },
    ]);
  } catch (e) { parseError = `llm_error:${(e.message||"").slice(0,80)}`; }
  const parsed = parseBallot(raw, options);
  return {
    agent: `${agent}Agent`, specialties, weight,
    ranking: parsed.ranking ?? options.map(o => o.id),
    approvals: parsed.approvals ?? Object.fromEntries(options.map(o => [o.id, "abstain"])),
    reasoning: parsed.reasoning ?? "",
    confidence: parsed.confidence ?? 0.4,
    parseError: parseError ?? parsed.error,
    llmRaw: raw.slice(0, 800),
  };
}

function tally(ballots, options) {
  const N = options.length;
  return options.map(opt => {
    let borda=0, approveW=0, rejectW=0, abstainW=0;
    for (const b of ballots) {
      if (!b.reasoning) continue;
      const idx = b.ranking.indexOf(opt.id);
      const score = idx >= 0 ? (N - 1 - idx) / (N - 1) : 0;
      borda += score * b.weight;
      const v = b.approvals[opt.id];
      if (v === "approve") approveW += b.weight;
      else if (v === "reject") rejectW += b.weight;
      else abstainW += b.weight;
    }
    const active = approveW + rejectW;
    return {
      optionId: opt.id,
      bordaWeighted: +borda.toFixed(4),
      approveWeight: +approveW.toFixed(4),
      rejectWeight: +rejectW.toFixed(4),
      abstainWeight: +abstainW.toFixed(4),
      approvalRate: active === 0 ? -1 : +(approveW / active).toFixed(4),
    };
  });
}

function buildTranscript(topic, ctx, options, ballots, tallies, winnerId, margin, decisive) {
  const L = [];
  L.push(`[GRAND COUNCIL — REAL CONFERENCE]`);
  L.push(`[Topic] ${topic}`);
  L.push(`[Context] ${ctx.slice(0, 400)}${ctx.length > 400 ? "..." : ""}`);
  L.push(`[Convened] ${new Date().toISOString()}`);
  L.push(`[Participants] ${ballots.length}/${COUNCIL.length}`);
  L.push("");
  L.push(`[OPTIONS]`); for (const o of options) L.push(`  [${o.id}] ${o.title}`); L.push("");
  L.push(`[DELIBERATION]`);
  for (const b of ballots) {
    if (!b.reasoning) { L.push(`${b.agent} (Φ=${b.weight.toFixed(2)}): [INVALID — ${b.parseError}]`); continue; }
    L.push(`${b.agent} (Φ=${b.weight.toFixed(2)}) → top:${b.ranking[0]}${b.parseError?` [warn:${b.parseError}]`:""}`);
    L.push(`  «${b.reasoning}»`);
    L.push(`  rank=${b.ranking.join("→")}  votes=${Object.entries(b.approvals).map(([k,v])=>`${k}:${v}`).join(" ")}`);
  }
  L.push("");
  L.push(`[TALLY — Φ-WEIGHTED]`);
  for (const t of tallies) L.push(`  ${t.optionId}  borda=${t.bordaWeighted}  approve=${t.approveWeight}  reject=${t.rejectWeight}  abstain=${t.abstainWeight}  approvalRate=${(t.approvalRate*100).toFixed(1)}%`);
  L.push("");
  L.push(`[OUTCOME]`);
  if (winnerId && decisive) L.push(`  WINNER: ${winnerId}  (margin=${(margin*100).toFixed(2)}% — DECISIVE)`);
  else if (winnerId) L.push(`  TENTATIVE LEAD: ${winnerId}  (margin=${(margin*100).toFixed(2)}% — NOT DECISIVE; runoff or admin tiebreak required)`);
  else L.push(`  NO QUORUM`);
  return L.join("\n");
}

async function main() {
  const file = process.argv[2];
  if (!file) { console.error("Usage: run-real-conference.mjs <body.json>"); process.exit(2); }
  const body = JSON.parse(fs.readFileSync(file, "utf8"));
  const { topic, context: ctx, options, decisionIdPrefix = "conf" } = body;
  if (!topic || !ctx || !Array.isArray(options) || options.length < 2) { console.error("Bad body"); process.exit(2); }

  const startedAt = Date.now();
  const category = categoryFor(topic, ctx);
  process.stderr.write(`Convening real Grand Council on "${topic}" (category=${category}) — ${COUNCIL.length} agents, model=${MODEL}\n`);

  const ballots = [];
  for (let i = 0; i < COUNCIL.length; i++) {
    const a = COUNCIL[i];
    const t0 = Date.now();
    const b = await deliberate(a, topic, ctx, options, category);
    ballots.push(b);
    const dur = Date.now() - t0;
    process.stderr.write(`  [${String(i+1).padStart(2,"0")}/${COUNCIL.length}] ${b.agent.padEnd(14)} top=${b.ranking[0]} dur=${dur}ms${b.parseError?` (${b.parseError})`:""}\n`);
    await new Promise(r => setTimeout(r, 350));
  }

  const valid = ballots.filter(b => b.reasoning);
  if (valid.length < Math.ceil(COUNCIL.length / 2)) {
    process.stderr.write(`FAIL: insufficient valid ballots (${valid.length}/${COUNCIL.length})\n`);
    process.exit(3);
  }

  const tallies = tally(ballots, options);
  const sorted = [...tallies].sort((a,b) => b.bordaWeighted - a.bordaWeighted);
  const winner = sorted[0], runnerUp = sorted[1];
  const totalBorda = tallies.reduce((s,t)=>s+t.bordaWeighted, 0) || 1;
  const margin = winner && runnerUp ? (winner.bordaWeighted - runnerUp.bordaWeighted) / totalBorda : 1;
  const decisive = !!(winner && winner.approvalRate >= 2/3 && margin >= 0.05);
  const winnerId = winner?.optionId ?? null;

  const decisionId = `${decisionIdPrefix}-${startedAt.toString(36)}`;
  const transcript = buildTranscript(topic, ctx, options, ballots, tallies, winnerId, margin, decisive);

  const tallyAgg = ballots.reduce((acc, b) => {
    if (!winnerId) return acc;
    const v = b.approvals[winnerId];
    if (v === "approve") acc.yes++; else if (v === "reject") acc.no++; else acc.abstain++;
    return acc;
  }, { yes:0, no:0, abstain:0, totalEligible: COUNCIL.length });

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(
      `INSERT INTO council_decisions (decision_id, topic, transcript, decision_text, vote_tally, outcome, agents_participated, reasoning, category)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb,$8,$9)`,
      [
        decisionId, topic, transcript,
        winnerId ? `Grand Council selected option ${winnerId} (${decisive ? "decisive" : "tentative"} — margin ${(margin*100).toFixed(2)}%, approval ${(winner.approvalRate*100).toFixed(1)}%).` : `No quorum on "${topic}".`,
        JSON.stringify(tallyAgg),
        decisive ? "approved" : (winnerId ? "tentative" : "no-quorum"),
        JSON.stringify(ballots.map(b => b.agent)),
        JSON.stringify({ tallies, winnerId, margin, decisive, optionIds: options.map(o => o.id) }),
        category,
      ],
    );
  } finally { await pool.end(); }

  console.log(transcript);
  console.log("\n=== JSON RESULT ===");
  console.log(JSON.stringify({
    decisionId, conferenceId: `gc-${startedAt.toString(36)}`,
    topic, winnerId, margin: +margin.toFixed(4), decisive,
    tallies, ballotCount: ballots.length, validCount: valid.length,
    finishedAt: Date.now(), durationMs: Date.now() - startedAt,
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
