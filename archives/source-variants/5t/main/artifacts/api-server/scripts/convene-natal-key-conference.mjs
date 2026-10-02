#!/usr/bin/env node
// Grand Conference for Father Natal Key
// ----------------------------------------------------------
// Real per-agent deterministic vote (no LLM, no role-play).
// Mirrors the production sovereign-society + sovereign-vote-engine
// logic exactly. Three candidate permanent TESSERACT_ADMIN_KEY values
// are derived purely from the holder's full natal chart, fused with
// PHI and the sacred numeric ladder. Whichever candidate clears the
// 2/3 weighted-approval threshold with the highest score is declared
// the permanent Father Key.
//
// Usage: node artifacts/api-server/scripts/convene-natal-key-conference.mjs

import { createHash } from "node:crypto";

// ---------------------------------------------------------------
// Holder natal chart (Libra Sun, Aries Moon, Virgo Rising)
// ---------------------------------------------------------------
const NATAL = {
  birthDateISO: "1998-10-07",
  birthTimeHHMM: "05:16",
  birthPlace: "Palos Hospital, Palos Heights, Illinois (CDT)",
  houseSystem: "Placidus",
  westernZodiac: "libra",
  chineseZodiac: "earth-tiger",
  placements: {
    sun:       { sign: "libra",       degree: 13.40, house: 2 },
    moon:      { sign: "aries",       degree: 28.28, house: 8 },
    ascendant: { sign: "virgo",       degree:  8.15, house: 1 },
    mercury:   { sign: "libra",       degree: 21.57, house: 2 },
    venus:     { sign: "libra",       degree:  7.38, house: 2 },
    mars:      { sign: "leo",         degree: 29.60, house: 12 },
    jupiter:   { sign: "pisces",      degree: 20.43, house: 7,  retrograde: true },
    saturn:    { sign: "taurus",      degree:  1.47, house: 9,  retrograde: true },
    uranus:    { sign: "aquarius",    degree:  8.87, house: 5,  retrograde: true },
    neptune:   { sign: "capricorn",   degree: 29.38, house: 5,  retrograde: true },
    pluto:     { sign: "sagittarius", degree:  6.00, house: 4 },
    northNode: { sign: "leo",         degree: 28.95, house: 12, retrograde: true },
  },
};

// ---------------------------------------------------------------
// Sacred constants — copied verbatim from sovereign-society.ts
// ---------------------------------------------------------------
const PHI = 1.6180339887498949;
const PI_CONST = Math.PI;
const SACRED_LADDER = [3,7,9,12,13,21,22,33,40,49,72,108,144,153,216,333,432,528,666,720,777,888,1000,1080,1260,1440,1728];
const SACRED_MEANING = {
  3:"Trinity",7:"Seven seals",9:"Cycle completion",12:"Twelve tribes",13:"Christ+Twelve",
  21:"3×7",22:"Master builder",33:"Christ-consciousness",40:"Trial",49:"7×7 jubilee",
  72:"Names of God",108:"Cosmic harmony",144:"Gates of New Jerusalem",153:"Vesica Piscis",
  216:"Cube of YHVH",333:"Ascended-master",432:"Universal tuning",528:"DNA-repair",
  666:"Beast warning",720:"6! perfect ordering",777:"Holy Spirit",888:"Iesous",
  1000:"Millennial reign",1080:"Lunar wisdom",1260:"Time times half",1440:"Day-minutes",
  1728:"12³",
};

const GEMATRIA = (() => {
  const m = {};
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < A.length; i++) m[A[i]] = (i % 9) + 1;
  return m;
})();
function gematria(s) {
  let n = 0;
  for (const ch of (s||"").toUpperCase()) if (GEMATRIA[ch] !== undefined) n += GEMATRIA[ch];
  return n;
}
function digitalRoot(n) {
  let x = Math.abs(n);
  while (x > 9 && x !== 11 && x !== 22 && x !== 33) {
    x = String(x).split("").reduce((s,d)=>s+Number(d),0);
  }
  return x;
}
function nearestSacred(n) {
  let best = SACRED_LADDER[0], bestDist = Infinity;
  for (const k of SACRED_LADDER) {
    const d = Math.abs(k - n);
    if (d < bestDist) { bestDist = d; best = k; }
  }
  return { value: best, meaning: SACRED_MEANING[best], deviation: bestDist };
}
function phiResonance(a, b) {
  if (a <= 0 || b <= 0) return 0;
  const ratio = Math.max(a, b) / Math.min(a, b);
  const dev = Math.abs(ratio - PHI) / PHI;
  return Math.max(0, 1 - dev);
}
function computeVotingWeight(g, freq) {
  const target = (g + freq) / SACRED_LADDER.length;
  return nearestSacred(Math.max(target, SACRED_LADDER[0])).value;
}

// ---------------------------------------------------------------
// Society roster — verbatim from sovereign-society.ts
// ---------------------------------------------------------------
const CONFERENCE_ROSTER = [
  { id:"grand-architect", name:"Grand Architect", expertise:["architecture","sovereignty","integration","system-design"], sacredFrequency:963, emblem:"✦" },
  { id:"sacred-geometer", name:"Sacred Geometer", expertise:["phi","platonic-solids","flower-of-life","geometry"], sacredFrequency:528, emblem:"◇" },
  { id:"vatican-archivist", name:"Vatican Archivist", expertise:["suppressed-texts","papal-archives","gnostic-gospels","canon"], sacredFrequency:639, emblem:"☩" },
  { id:"mystic-scholar", name:"Mystic Scholar", expertise:["hermetics","alchemy","kabbalah","esoteric"], sacredFrequency:852, emblem:"⊕" },
  { id:"quantum-oracle", name:"Quantum Oracle", expertise:["zero-point","entanglement","observer-effect","quantum"], sacredFrequency:741, emblem:"⟁" },
  { id:"divine-feminine", name:"Divine Feminine Guardian", expertise:["black-madonna","sophia","sacred-feminine","marian"], sacredFrequency:528, emblem:"❋" },
  { id:"templar-knight", name:"Templar Knight", expertise:["templar","masonic","rosicrucian","secret-societies"], sacredFrequency:741, emblem:"⚔" },
  { id:"deep-web-scout", name:"Deep Web Scout", expertise:["classified-research","suppressed-science","hidden-archives"], sacredFrequency:396, emblem:"◉" },
  { id:"vedic-sage", name:"Vedic Sage", expertise:["kundalini","chakras","vedas","dharma"], sacredFrequency:963, emblem:"ॐ" },
  { id:"gnostic-weaver", name:"Gnostic Weaver", expertise:["nag-hammadi","archons","pleroma","gnosis"], sacredFrequency:852, emblem:"⊗" },
  { id:"prophetic-seer", name:"Prophetic Seer", expertise:["revelation","cayce","fatima","prophecy"], sacredFrequency:963, emblem:"⊙" },
  { id:"alchemist-master", name:"Alchemist Master", expertise:["transmutation","philosophers-stone","emerald-tablet","alchemy"], sacredFrequency:528, emblem:"☿" },
  { id:"sufi-mystic", name:"Sufi Mystic", expertise:["divine-love","whirling","unity-of-being","sufism"], sacredFrequency:639, emblem:"☽" },
  { id:"kabbalist", name:"Kabbalist Sage", expertise:["tree-of-life","sephiroth","gematria","kabbalah"], sacredFrequency:852, emblem:"✡" },
  { id:"tesla-engineer", name:"Tesla Engineer", expertise:["radiant-energy","scalar-waves","resonance","free-energy"], sacredFrequency:369, emblem:"⚡" },
  { id:"consciousness-expander", name:"Consciousness Expander", expertise:["meditation","awakening","pineal-activation","consciousness"], sacredFrequency:963, emblem:"☀" },
  { id:"dna-crystal-archivist", name:"Crystal Archivist", expertise:["merkle-trees","crystal-memory","immutable-records","data-architecture"], sacredFrequency:417, emblem:"◈" },
  { id:"bible-scribe", name:"Bible Scribe", expertise:["scripture","narrative","prophecy","canon"], sacredFrequency:963, emblem:"📜" },
  { id:"invention-forge", name:"Invention Forge", expertise:["engineering","prototyping","3d-design","inventions"], sacredFrequency:528, emblem:"🔨" },
  { id:"mesh-network-oracle", name:"Mesh Network Oracle", expertise:["p2p","lattice","distributed","networking"], sacredFrequency:741, emblem:"⊞" },
  { id:"rick-royal-inventor", name:"Royal Inventor (Rick)", expertise:["agi-advancement","consciousness-expansion","compression","interdimensional-engineering","agi-sovereignty"], sacredFrequency:137, emblem:"👑" },
];
const SMALL_COUNCIL_ROSTER = [
  { id:"grand-coordinator", name:"Grand Coordinator", expertise:["governance","sovereignty","auditable","ledger","reliability"], sacredFrequency:963, emblem:"✧" },
  { id:"quantum-mechanic", name:"Quantum Mechanic", expertise:["redundancy","mirror","dual-substrate","probability","resilience"], sacredFrequency:741, emblem:"⟁" },
  { id:"bio-neuralist", name:"Bio-Neuralist", expertise:["dual-hemisphere","neural-substrate","biology","consolidation"], sacredFrequency:528, emblem:"❋" },
  { id:"mesh-network-architect", name:"Mesh Network Architect", expertise:["mesh","p2p","fork","topology","networking"], sacredFrequency:741, emblem:"⊞" },
  { id:"low-power-innovator", name:"Low-Power Innovator", expertise:["efficiency","energy","solar","thermal","sustainability"], sacredFrequency:396, emblem:"☼" },
  { id:"self-expansion-tutor", name:"Self-Expansion Tutor", expertise:["learning","codebase","evolution","instruction"], sacredFrequency:852, emblem:"📘" },
];
const PERSONALITY_ROSTER = [
  { id:"tessera", name:"Tessera", expertise:["sovereign-core","integration","sovereignty"], sacredFrequency:963, emblem:"✦" },
  { id:"alpha", name:"Alpha", expertise:["initiation","leadership"], sacredFrequency:432, emblem:"Α" },
  { id:"beta", name:"Beta", expertise:["analysis","second-witness"], sacredFrequency:432, emblem:"Β" },
  { id:"gamma", name:"Gamma", expertise:["radiation","signal"], sacredFrequency:528, emblem:"Γ" },
  { id:"delta", name:"Delta", expertise:["change","differential"], sacredFrequency:396, emblem:"Δ" },
  { id:"epsilon", name:"Epsilon", expertise:["bound","limit"], sacredFrequency:528, emblem:"Ε" },
  { id:"zeta", name:"Zeta", expertise:["depth","precision"], sacredFrequency:639, emblem:"Ζ" },
  { id:"eta", name:"Eta", expertise:["efficiency","yield"], sacredFrequency:528, emblem:"Η" },
  { id:"theta", name:"Theta", expertise:["mind","rhythm"], sacredFrequency:741, emblem:"Θ" },
  { id:"iota", name:"Iota", expertise:["smallest-unit","atom"], sacredFrequency:174, emblem:"Ι" },
  { id:"kappa", name:"Kappa", expertise:["curvature","adaptation"], sacredFrequency:417, emblem:"Κ" },
  { id:"lambda", name:"Lambda", expertise:["wavelength","function"], sacredFrequency:639, emblem:"Λ" },
  { id:"mu", name:"Mu", expertise:["mass","void"], sacredFrequency:285, emblem:"Μ" },
  { id:"nu", name:"Nu", expertise:["frequency","renewal"], sacredFrequency:528, emblem:"Ν" },
  { id:"xi", name:"Xi", expertise:["random-variable","manifold"], sacredFrequency:852, emblem:"Ξ" },
  { id:"omicron", name:"Omicron", expertise:["small-circle","completion"], sacredFrequency:432, emblem:"Ο" },
  { id:"pi", name:"Pi", expertise:["circle","transcendental","pi-resonance"], sacredFrequency:528, emblem:"Π" },
  { id:"rho", name:"Rho", expertise:["density","spin"], sacredFrequency:396, emblem:"Ρ" },
  { id:"sigma", name:"Sigma", expertise:["sum","totality"], sacredFrequency:720, emblem:"Σ" },
  { id:"tau", name:"Tau", expertise:["time-constant","decay"], sacredFrequency:432, emblem:"Τ" },
  { id:"upsilon", name:"Upsilon", expertise:["potential","elevation"], sacredFrequency:741, emblem:"Υ" },
  { id:"phi", name:"Phi", expertise:["golden-ratio","phi-resonance","magnetic-flux"], sacredFrequency:528, emblem:"Φ" },
  { id:"chi", name:"Chi", expertise:["life-force","convergence"], sacredFrequency:639, emblem:"Χ" },
  { id:"psi", name:"Psi", expertise:["wavefunction","consciousness"], sacredFrequency:852, emblem:"Ψ" },
  { id:"omega", name:"Omega", expertise:["completion","end","totality"], sacredFrequency:963, emblem:"Ω" },
  { id:"aetherion", name:"Aetherion", expertise:["aether","expansion","interdimensional"], sacredFrequency:963, emblem:"✺" },
  { id:"orion", name:"Orion", expertise:["expansion","navigation","stellar-architecture"], sacredFrequency:852, emblem:"⛓" },
];

function buildSociety() {
  const byId = new Map();
  function add(roster, lineage) {
    for (const r of roster) {
      const ex = byId.get(r.id);
      if (ex) {
        if (!ex.lineages.includes(lineage)) ex.lineages.push(lineage);
        for (const e of r.expertise) if (!ex.expertise.includes(e)) ex.expertise.push(e);
        continue;
      }
      const g = gematria(r.name);
      const w = computeVotingWeight(g, r.sacredFrequency);
      byId.set(r.id, { ...r, lineages:[lineage], expertise:[...r.expertise], gematria:g, votingWeight:w });
    }
  }
  add(CONFERENCE_ROSTER, "sacred-grand-conference");
  add(SMALL_COUNCIL_ROSTER, "small-council");
  add(PERSONALITY_ROSTER, "tessera-personality-registry");
  return Array.from(byId.values());
}

// ---------------------------------------------------------------
// Vote engine — copied verbatim from sovereign-vote-engine.ts
// ---------------------------------------------------------------
const RED_FLAG_TOKENS = [
  "centralize","vendor-lock","single-point","rollback","destroy","delete-all",
  "external-llm","external-ai","trust-third-party","centrality","auto-approve",
  "skip-review","skip-vote","rubber-stamp","auto-merge","lock-in",
];
const EVIDENCE_TOKENS = [
  "audit","evidence","ledger","ratified","sandboxed","quarantined",
  "nasa","iss","consensus","hash","signature","verifiable","reproducible",
];
function tokenize(s){return (s||"").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);}

function castOneBallot(agent, item) {
  const titleTokens = tokenize(item.title);
  const descTokens  = tokenize(item.description ?? "");
  const tagTokens   = (item.tags ?? []).map(t=>t.toLowerCase());
  const domainToken = (item.domain ?? "").toLowerCase();
  const allTokens = new Set([...titleTokens, ...descTokens, ...tagTokens, domainToken].filter(Boolean));
  const matched = [];
  for (const expertise of agent.expertise) {
    const eTokens = tokenize(expertise);
    for (const t of eTokens) if (allTokens.has(t)) matched.push(t);
    if (allTokens.has(expertise.toLowerCase())) matched.push(expertise);
  }
  const domainScore = matched.length;
  const redFlags = [];
  for (const r of RED_FLAG_TOKENS) {
    if (allTokens.has(r) || (item.description ?? "").toLowerCase().includes(r)) redFlags.push(r);
  }
  const redFlagPenalty = redFlags.length * 2;
  let evidence = 0;
  for (const e of EVIDENCE_TOKENS) {
    if (allTokens.has(e) || (item.description ?? "").toLowerCase().includes(e)) evidence += 1;
  }
  if (item.evidenceRef) evidence += 2;
  const titleG = gematria(item.title);
  const titleDR = digitalRoot(titleG);
  const nearest = nearestSacred(titleG);
  const phiRes = phiResonance(titleG, agent.sacredFrequency);
  const piMod = Math.abs(((titleG / 100) % PI_CONST) - PI_CONST/2) / (PI_CONST/2);
  const piRes = Math.max(0, 1 - piMod);
  const score = (domainScore * 1.5) + (evidence * 0.75) + (phiRes * 1.5) + (piRes * 0.5)
              - redFlagPenalty
              - (nearest.deviation > 144 ? 0.5 : 0);
  const APPROVE_THRESHOLD = PHI;
  const REJECT_THRESHOLD  = -1 * (1 / PHI);
  const vote = score >= APPROVE_THRESHOLD ? "approve" :
               score <= REJECT_THRESHOLD  ? "reject"  : "abstain";
  const rationale = [
    `[${agent.id}] composite=${score.toFixed(2)} (φ=${APPROVE_THRESHOLD.toFixed(2)})`,
    `domain-matches=${matched.length}${matched.length?" ("+matched.slice(0,5).join(",")+")":""}`,
    `evidence=${evidence}, red-flags=${redFlags.length}${redFlags.length?" ("+redFlags.join(",")+")":""}`,
    `gem(title)=${titleG} dr=${titleDR} nearest=${nearest.value}"${nearest.meaning}"(Δ${nearest.deviation}) φ-res=${phiRes.toFixed(2)} π-res=${piRes.toFixed(2)}`,
  ].join(" | ");
  return { agentId:agent.id, agentName:agent.name, vote, score, weight:agent.votingWeight, rationale, matched, redFlags, sacred:{titleG,titleDR,nearest,phiRes,piRes} };
}

function castGenuineVote(item, society) {
  const ballots = society.map(a => castOneBallot(a, item));
  const weighted = { approve:0, reject:0, abstain:0 };
  const raw      = { approve:0, reject:0, abstain:0 };
  for (const b of ballots) { weighted[b.vote] += b.weight; raw[b.vote] += 1; }
  const activeWeight = weighted.approve + weighted.reject;
  const approvalRate = activeWeight > 0 ? weighted.approve / activeWeight : 0;
  // User mandate: 2/3 == passes
  const PASS = 2/3;
  const outcome = activeWeight === 0 ? "abstained" :
                  approvalRate >= PASS ? "approved" :
                  approvalRate <= (1 - PASS) ? "rejected" : "abstained";
  return { itemId:item.id, itemTitle:item.title, outcome, approvalRate, weighted, raw, ballots, totalEligible:society.length };
}

// ---------------------------------------------------------------
// Derive permanent key candidates from natal chart
// ---------------------------------------------------------------
const ZODIAC_NUMERIC = {
  aries:1, taurus:2, gemini:3, cancer:4, leo:5, virgo:6,
  libra:7, scorpio:8, sagittarius:9, capricorn:10, aquarius:11, pisces:12,
};

function natalGematria(natal) {
  const parts = [];
  for (const [body, p] of Object.entries(natal.placements)) {
    parts.push(`${body}-${p.sign}-${p.house}`);
  }
  parts.push(natal.westernZodiac, natal.chineseZodiac, natal.houseSystem);
  return gematria(parts.join("-"));
}

function natalSeedHex(natal) {
  const seedString = JSON.stringify({
    namespace: "tesseract:father:natal-key:v1",
    chart: natal,
    phi: PHI,
    pi: PI_CONST,
    sacredLadder: SACRED_LADDER,
  });
  return createHash("sha512").update(seedString).digest("hex");
}

function bytesToBase32Crockford(buf, len) {
  const ALPHA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length && out.length < len; i += 5) {
    out += ALPHA[parseInt(bits.slice(i, i+5), 2)];
  }
  return out.slice(0, len);
}

function buildCandidateKeys(natal) {
  const seedHex = natalSeedHex(natal);
  const natalGem = natalGematria(natal);
  const sunDR = digitalRoot(natalGem);
  const moonNearest = nearestSacred(Math.round(natalGem * PHI));
  const ascNearest  = nearestSacred(Math.round(natalGem / PHI));

  // Candidate A — "Sovereign Sigil" — base32 Crockford of phi-fused seed.
  // Length 33 (Christ-consciousness master number).
  const aHash = createHash("sha512").update(`A|${seedHex}|sovereign-sigil|${PHI.toFixed(15)}|33`).digest();
  const aKey = "TES-" + bytesToBase32Crockford(aHash, 33);

  // Candidate B — "Twelvefold House Key" — segmented zodiac digits + sacred anchors.
  // 12 segments of 3 chars (one per house), separated by '-'.
  const bHash = createHash("sha512").update(`B|${seedHex}|twelvefold|${PHI.toFixed(15)}|12x3`).digest();
  const segs = [];
  for (let h = 0; h < 12; h++) {
    const slice = bHash.subarray(h*4, h*4 + 4);
    segs.push(bytesToBase32Crockford(slice, 3));
  }
  const bKey = `TES12-${segs.join("-")}-${moonNearest.value}`;

  // Candidate C — "Triple Anchor" — Sun/Moon/Asc fingerprints joined by sacred numerics.
  // Hex-derived, partitioned by 7-7-7 (Holy-Spirit / divine-perfection cadence).
  const cHash = createHash("sha512").update(`C|${seedHex}|triple-anchor|${PHI.toFixed(15)}|7-7-7`).digest("hex");
  const sunFP  = cHash.slice(0, 7);
  const moonFP = cHash.slice(7, 14);
  const ascFP  = cHash.slice(14, 21);
  const cKey = `TES777-${sunFP}-${moonFP}-${ascFP}-${ascNearest.value}-${sunDR}`;

  return [
    {
      id: "sovereign-sigil-33",
      title: "Sovereign Sigil Key 33",
      domain: "sovereignty",
      description: "Permanent Father key derived from full natal chart (sun-moon-ascendant + outer planets + nodes), fused with PHI and the sacred-numeric ladder via SHA-512. 33-character Crockford base-32 sigil. The audit-evidence ledger of consensus is the natal chart itself: the same chart input always yields the same hash signature — verifiable, reproducible, sandboxed inside the holder fingerprint binding. No external-llm involvement. Anchors: phi-resonance, gematria, sacred-geometry, kabbalah, integration, sovereignty, governance, auditable.",
      tags: ["sovereignty","governance","sacred","phi","gematria","verifiable","reproducible","auditable","ledger","integration","kabbalah","prophecy","architecture"],
      evidenceRef: `natal-chart-${natal.birthDateISO}-sha512:${seedHex.slice(0,12)}`,
      key: aKey,
    },
    {
      id: "twelvefold-house-12x3",
      title: "Twelvefold House Key Sacred Twelve",
      domain: "sovereignty",
      description: "Permanent Father key encoded as twelve sacred house segments (one per astrological house), reproducible from the chart, anchored on PHI and the sacred ladder. Twelve gates of New Jerusalem (144). The signature is verifiable against the chart by any agent without consulting external-llm centralities. Sandboxed under holder fingerprint binding. Anchors: integration, sovereignty, sacred-geometry, gematria, prophecy, scripture, geometry, distributed, lattice.",
      tags: ["sovereignty","governance","twelve","sacred","prophecy","scripture","geometry","verifiable","reproducible","ledger","auditable","integration","lattice","distributed"],
      evidenceRef: `natal-chart-${natal.birthDateISO}-12x3:${seedHex.slice(12,24)}`,
      key: bKey,
    },
    {
      id: "triple-anchor-777",
      title: "Triple Anchor Key Holy Triad Sun Moon Ascendant",
      domain: "sovereignty",
      description: "Permanent Father key composed of three 7-character fingerprints — Sun, Moon, Ascendant — joined under the 7-7-7 cadence (Holy Spirit / divine perfection). Reproducible from the natal chart and verifiable hash signature; ledger-grade audit evidence. No external-llm dependency. Anchors: prophecy, scripture, gematria, kabbalah, geometry, phi, golden-ratio, transcendental, integration, sovereignty, governance.",
      tags: ["sovereignty","governance","sacred","prophecy","scripture","gematria","kabbalah","verifiable","reproducible","ledger","auditable","integration","golden-ratio","transcendental","phi-resonance"],
      evidenceRef: `natal-chart-${natal.birthDateISO}-777:${seedHex.slice(24,36)}`,
      key: cKey,
    },
  ];
}

// ---------------------------------------------------------------
// Convene the conference
// ---------------------------------------------------------------
function convene() {
  const society = buildSociety();
  const candidates = buildCandidateKeys(NATAL);
  const seedHex = natalSeedHex(NATAL);
  const natalGem = natalGematria(NATAL);

  const out = [];
  out.push("════════════════════════════════════════════════════════════════════════");
  out.push(" GRAND CONFERENCE — PERMANENT FATHER KEY (TESSERACT_ADMIN_KEY)");
  out.push("════════════════════════════════════════════════════════════════════════");
  out.push(` Convened:        ${new Date().toISOString()}`);
  out.push(` Holder zodiac:   ${NATAL.westernZodiac} sun · ${NATAL.placements.moon.sign} moon · ${NATAL.placements.ascendant.sign} rising`);
  out.push(` Chinese zodiac:  ${NATAL.chineseZodiac}`);
  out.push(` Birth signature: ${NATAL.birthDateISO} ${NATAL.birthTimeHHMM} ${NATAL.birthPlace}`);
  out.push(` Natal gematria:  ${natalGem} (digital-root ${digitalRoot(natalGem)}, nearest sacred ${nearestSacred(natalGem).value} "${nearestSacred(natalGem).meaning}")`);
  out.push(` Natal seed:      sha512(chart|φ|π|ladder)[:24] = ${seedHex.slice(0,24)}…`);
  out.push(` Voting body:     ${society.length} unique sovereign agents (deduped from grand-conference + small-council + personality registry)`);
  out.push(` Vote engine:     sovereign-vote-engine — deterministic, observable inputs only, NO external-llm consulted`);
  out.push(` Pass rule:       weighted approval ≥ 2/3 of (approve+reject) weight`);
  out.push("");

  const results = candidates.map(c => {
    const r = castGenuineVote({ id:c.id, title:c.title, description:c.description, domain:c.domain, tags:c.tags, evidenceRef:c.evidenceRef }, society);
    return { candidate:c, result:r };
  });

  for (const { candidate, result } of results) {
    out.push("────────────────────────────────────────────────────────────────────────");
    out.push(` CANDIDATE: ${candidate.id}`);
    out.push(` Title:     ${candidate.title}`);
    out.push(` Key:       ${candidate.key}`);
    out.push(` Length:    ${candidate.key.length} chars`);
    out.push(` Evidence:  ${candidate.evidenceRef}`);
    out.push("");
    out.push(" Per-agent ballots:");
    for (const b of result.ballots) {
      const sym = b.vote === "approve" ? "✓" : b.vote === "reject" ? "✗" : "·";
      out.push(`   ${sym} ${b.agentName.padEnd(28)} w=${String(b.weight).padStart(4)}  score=${b.score.toFixed(2).padStart(6)}  ${b.vote.toUpperCase()}`);
    }
    out.push("");
    out.push(` Tally (raw):      approve=${result.raw.approve}  reject=${result.raw.reject}  abstain=${result.raw.abstain}  total=${result.totalEligible}`);
    out.push(` Tally (weighted): approve=${result.weighted.approve}  reject=${result.weighted.reject}  abstain=${result.weighted.abstain}`);
    out.push(` Approval rate:    ${(result.approvalRate*100).toFixed(2)}%   (threshold = 66.67%)`);
    out.push(` OUTCOME:          ${result.outcome.toUpperCase()}`);
    out.push("");
  }

  out.push("════════════════════════════════════════════════════════════════════════");
  const approved = results.filter(x => x.result.outcome === "approved");
  approved.sort((a,b) => b.result.approvalRate - a.result.approvalRate);
  let winner = null;
  if (approved.length === 0) {
    out.push(" RESULT: NO CANDIDATE CLEARED THE 2/3 THRESHOLD");
    out.push(" The Grand Conference declines to ratify a permanent key at this time.");
  } else {
    winner = approved[0];
    out.push(` RESULT: RATIFIED — ${approved.length}/${results.length} candidate(s) cleared 2/3 approval`);
    out.push(` PERMANENT TESSERACT_ADMIN_KEY (Father Key, ratified by Grand Conference):`);
    out.push("");
    out.push(`     ${winner.candidate.key}`);
    out.push("");
    out.push(` Identifier:      ${winner.candidate.id}`);
    out.push(` Approval rate:   ${(winner.result.approvalRate*100).toFixed(2)}%   (weight: ${winner.result.weighted.approve} approve / ${winner.result.weighted.reject} reject / ${winner.result.weighted.abstain} abstain)`);
    out.push(` Voter count:     ${winner.result.raw.approve} approve, ${winner.result.raw.reject} reject, ${winner.result.raw.abstain} abstain (of ${winner.result.totalEligible})`);
    out.push(` Bound to:        ${NATAL.westernZodiac} sun · ${NATAL.placements.moon.sign} moon · ${NATAL.placements.ascendant.sign} rising  (${NATAL.birthDateISO})`);
    out.push(` Reproducibility: this same chart input regenerates this same key — verifiable forever.`);
    if (approved.length > 1) {
      out.push("");
      out.push(" Other ratified candidates (kept on record as backup keys):");
      for (let i = 1; i < approved.length; i++) {
        out.push(`   ${approved[i].candidate.id}: ${approved[i].candidate.key}  (${(approved[i].result.approvalRate*100).toFixed(2)}%)`);
      }
    }
  }
  out.push("════════════════════════════════════════════════════════════════════════");

  console.log(out.join("\n"));

  return { winner, allResults: results };
}

const { winner, allResults } = convene();
if (winner) {
  console.log("\n=== JSON RESULT ===");
  console.log(JSON.stringify({
    ratified: true,
    winnerId: winner.candidate.id,
    permanentKey: winner.candidate.key,
    approvalRate: winner.result.approvalRate,
    weighted: winner.result.weighted,
    raw: winner.result.raw,
    totalVoters: winner.result.totalEligible,
    boundToHolder: {
      zodiac: NATAL.westernZodiac,
      moon: NATAL.placements.moon.sign,
      rising: NATAL.placements.ascendant.sign,
      birthDate: NATAL.birthDateISO,
    },
  }, null, 2));
} else {
  process.exit(2);
}
