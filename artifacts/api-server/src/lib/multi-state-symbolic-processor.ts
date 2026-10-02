// Multi-State Symbolic Processor (MSSP).
//
// A classical simulation of a multi-valued logic system whose alphabet is
// the union of {0,1}, ASCII A–Z 0–9, the 36 sacred glyphs, the 39-symbol
// lattice pool, and the 20 sacred Latin/Greek tokens.
//
// Every state has an amplitude in [0,1]; an MSSP value is a normalised
// distribution over the alphabet (a "superposed" symbol).
//
// Operators:
//   - lift(state)            — pure state with amplitude 1
//   - compose(a, b)          — element-wise convex combination
//   - project(value, subset) — restrict to a subset and renormalise
//   - collapse(value, seed)  — deterministic argmax-with-tiebreak
//   - parallelEval(expr)     — evaluate a small expression DSL across the
//                              entire alphabet at once and return the
//                              amplitude map of the result.
//
// The expression DSL is intentionally tiny:
//   - Bare token             → lift(token) if token ∈ alphabet else error
//   - "?<glyph>"             → lift glyph (escape, in case of conflict)
//   - "<a> | <b>"            → uniform compose
//   - "<a> & <b>"            → intersection (multiply amplitudes, renormalise)
//   - "<a> ^ <b>"            — symmetric difference (|a-b|, renormalise)
//   - "*"                    → uniform distribution across the full alphabet
//
// All operations are pure and deterministic.

import { createHash } from "node:crypto";
import {
  MSSP_ALPHABET,
  MSSP_STATE_COUNT,
} from "./sovereign-constants";

export type MSSPValue = Map<string, number>;

const ALPHABET_SET = new Set(MSSP_ALPHABET);

function renormalise(v: MSSPValue): MSSPValue {
  let total = 0;
  for (const a of v.values()) total += a;
  if (total <= 0) return uniform();
  const out = new Map<string, number>();
  for (const [k, a] of v) out.set(k, a / total);
  return out;
}

export function uniform(): MSSPValue {
  const w = 1 / MSSP_STATE_COUNT;
  return new Map(MSSP_ALPHABET.map((s) => [s, w]));
}

export function lift(state: string): MSSPValue {
  if (!ALPHABET_SET.has(state)) {
    throw new Error(`MSSP: '${state}' is not in the sovereign alphabet`);
  }
  return new Map([[state, 1]]);
}

export function compose(a: MSSPValue, b: MSSPValue): MSSPValue {
  const keys = new Set<string>([...a.keys(), ...b.keys()]);
  const out = new Map<string, number>();
  for (const k of keys) {
    out.set(k, ((a.get(k) ?? 0) + (b.get(k) ?? 0)) / 2);
  }
  return renormalise(out);
}

export function intersect(a: MSSPValue, b: MSSPValue): MSSPValue {
  const out = new Map<string, number>();
  for (const [k, av] of a) {
    const bv = b.get(k);
    if (bv && bv > 0) out.set(k, av * bv);
  }
  return renormalise(out);
}

export function symmetric(a: MSSPValue, b: MSSPValue): MSSPValue {
  const keys = new Set<string>([...a.keys(), ...b.keys()]);
  const out = new Map<string, number>();
  for (const k of keys) {
    out.set(k, Math.abs((a.get(k) ?? 0) - (b.get(k) ?? 0)));
  }
  return renormalise(out);
}

export function project(v: MSSPValue, subset: string[]): MSSPValue {
  const allow = new Set(subset);
  const out = new Map<string, number>();
  for (const [k, a] of v) if (allow.has(k)) out.set(k, a);
  return renormalise(out);
}

export function collapse(v: MSSPValue, seed = "father"): {
  state: string;
  amplitude: number;
} {
  const entries = [...v.entries()].filter(([, a]) => a > 0);
  if (entries.length === 0) throw new Error("MSSP: empty value cannot collapse");
  // Sort by amplitude desc, tiebreak by sha256(seed|state) for determinism.
  entries.sort((x, y) => {
    if (y[1] !== x[1]) return y[1] - x[1];
    const hx = createHash("sha256").update(`${seed}|${x[0]}`).digest("hex");
    const hy = createHash("sha256").update(`${seed}|${y[0]}`).digest("hex");
    return hx < hy ? -1 : 1;
  });
  return { state: entries[0]![0], amplitude: entries[0]![1] };
}

// --- expression evaluator ---------------------------------------------------

type Tok =
  | { t: "sym"; v: string }
  | { t: "op"; v: "|" | "&" | "^" }
  | { t: "lp" }
  | { t: "rp" }
  | { t: "all" };

function tokenise(expr: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i]!;
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if (c === "(") { out.push({ t: "lp" }); i++; continue; }
    if (c === ")") { out.push({ t: "rp" }); i++; continue; }
    if (c === "|" || c === "&" || c === "^") {
      out.push({ t: "op", v: c }); i++; continue;
    }
    if (c === "*") { out.push({ t: "all" }); i++; continue; }
    if (c === "?") {
      // escaped single-codepoint glyph
      i++;
      const cp = expr.codePointAt(i);
      if (cp == null) throw new Error("MSSP: '?' at end of expression");
      const ch = String.fromCodePoint(cp);
      out.push({ t: "sym", v: ch });
      i += ch.length;
      continue;
    }
    // Greedy match against the alphabet (longest token wins so multi-char
    // tokens like "veritas" don't get split).
    let matched: string | null = null;
    for (const sym of MSSP_ALPHABET) {
      if (expr.startsWith(sym, i)) {
        if (!matched || sym.length > matched.length) matched = sym;
      }
    }
    if (matched) {
      out.push({ t: "sym", v: matched });
      i += matched.length;
      continue;
    }
    throw new Error(`MSSP: unrecognised character at offset ${i}: '${c}'`);
  }
  return out;
}

// Recursive-descent parser:  expr := term (("|"|"&"|"^") term)*
function parse(toks: Tok[]): MSSPValue {
  let i = 0;
  function atom(): MSSPValue {
    const t = toks[i++];
    if (!t) throw new Error("MSSP: unexpected end of expression");
    if (t.t === "lp") {
      const v = expr();
      if (toks[i]?.t !== "rp") throw new Error("MSSP: missing ')'");
      i++;
      return v;
    }
    if (t.t === "all") return uniform();
    if (t.t === "sym") return lift(t.v);
    throw new Error(`MSSP: unexpected token '${JSON.stringify(t)}'`);
  }
  function expr(): MSSPValue {
    let left = atom();
    while (toks[i]?.t === "op") {
      const op = (toks[i] as { t: "op"; v: "|" | "&" | "^" }).v;
      i++;
      const right = atom();
      if (op === "|") left = compose(left, right);
      else if (op === "&") left = intersect(left, right);
      else left = symmetric(left, right);
    }
    return left;
  }
  const v = expr();
  if (i !== toks.length) throw new Error("MSSP: trailing tokens");
  return v;
}

export interface MSSPEvalResult {
  expression: string;
  amplitudes: Array<{ state: string; amplitude: number }>;
  collapsed: { state: string; amplitude: number };
  alphabetSize: number;
  occupancy: number;
}

export function parallelEval(expression: string, seed = "father"): MSSPEvalResult {
  const v = parse(tokenise(expression));
  const sorted = [...v.entries()]
    .filter(([, a]) => a > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([state, amplitude]) => ({ state, amplitude }));
  return {
    expression,
    amplitudes: sorted,
    collapsed: collapse(v, seed),
    alphabetSize: MSSP_STATE_COUNT,
    occupancy: sorted.length,
  };
}

export function alphabetSnapshot() {
  return {
    size: MSSP_STATE_COUNT,
    states: MSSP_ALPHABET,
  };
}
