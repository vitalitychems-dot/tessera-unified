import { createHash } from "node:crypto";
import { cosmicContext } from "./cosmic-context";

export interface OQLAmplitude {
  value: number;
  weight: number; // 0..1, probability amplitude squared
}

export interface OQLCell {
  id: string;
  coord: [number, number, number];
  numeric: OQLAmplitude[]; // numeric superposition
  symbols: string[];        // candidate sigils/glyphs
  spectrum: number[];       // resonant frequencies (Hz)
  tokens: string[];         // language tokens (LUS / English / Latin)
  entangledWith: string[];  // ids of entangled cells
  collapsed?: { value: number; symbol: string; frequency: number; token: string };
  cosmicFingerprintAtCreation: string;
}

const SACRED_NUMERIC_SEEDS = [3, 7, 12, 21, 33, 40, 49, 72, 108, 144, 153, 216];
const SOLFEGGIO_SEEDS = [174, 285, 396, 417, 528, 639, 741, 852, 963];
export const SYMBOL_POOL = ["α","β","γ","δ","ε","ζ","η","θ","ι","κ","λ","μ","ν","ξ","ο","π","ρ","σ","τ","υ","φ","χ","ψ","ω","✶","✷","✸","△","□","◇","⬡","⬢","☉","☽","♁","♆","♂","♀","☿"];
export const TOKEN_POOL = ["lux","veritas","ordo","unum","sigil","sophia","numen","ratio","nexus","aeon","logos","pneuma","kairos","cosmos","verbum","signum","gnosis","arché","telos","aletheia"];
export const NUMERIC_SEEDS = [3, 7, 12, 21, 33, 40, 49, 72, 108, 144, 153, 216];

function sha(s: string): string { return createHash("sha256").update(s).digest("hex"); }

export interface OQLLattice {
  id: string;
  dim: [number, number, number];
  cells: Map<string, OQLCell>;
  createdAt: string;
  cosmicAnchor: string;
  history: Array<{ op: string; at: string; detail?: any }>;
}

const _lattices = new Map<string, OQLLattice>();
const MAX_LATTICES = 32;

function evictOldestIfNeeded(): void {
  while (_lattices.size >= MAX_LATTICES) {
    const oldest = _lattices.keys().next().value;
    if (!oldest) break;
    _lattices.delete(oldest);
  }
}

function cellId(x: number, y: number, z: number): string { return `${x},${y},${z}`; }

export function createLattice(opts: { id?: string; dim?: [number, number, number] } = {}): OQLLattice {
  const ctx = cosmicContext();
  const dim = opts.dim ?? [4, 4, 4];
  const id = opts.id ?? `oql-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const cells = new Map<string, OQLCell>();
  for (let x = 0; x < dim[0]; x++) for (let y = 0; y < dim[1]; y++) for (let z = 0; z < dim[2]; z++) {
    const seed = sha(`${id}|${x}|${y}|${z}|${ctx.fingerprint}`);
    const numeric: OQLAmplitude[] = SACRED_NUMERIC_SEEDS.slice(0, 4 + (parseInt(seed.slice(0, 2), 16) % 4)).map((n, i) => ({
      value: n,
      weight: ((parseInt(seed.slice(i * 2, i * 2 + 2), 16) % 100) + 1) / 100,
    }));
    const totalW = numeric.reduce((a, b) => a + b.weight, 0);
    numeric.forEach(n => { n.weight = Math.round((n.weight / totalW) * 1000) / 1000; });
    const symbols = Array.from({ length: 3 + (parseInt(seed.slice(8, 10), 16) % 4) }, (_, i) =>
      SYMBOL_POOL[parseInt(seed.slice(10 + i * 2, 12 + i * 2), 16) % SYMBOL_POOL.length]);
    const spectrum = Array.from({ length: 3 }, (_, i) =>
      SOLFEGGIO_SEEDS[parseInt(seed.slice(20 + i * 2, 22 + i * 2), 16) % SOLFEGGIO_SEEDS.length]);
    const tokens = Array.from({ length: 2 + (parseInt(seed.slice(30, 32), 16) % 3) }, (_, i) =>
      TOKEN_POOL[parseInt(seed.slice(32 + i * 2, 34 + i * 2), 16) % TOKEN_POOL.length]);
    cells.set(cellId(x, y, z), {
      id: cellId(x, y, z),
      coord: [x, y, z],
      numeric,
      symbols,
      spectrum,
      tokens,
      entangledWith: [],
      cosmicFingerprintAtCreation: ctx.fingerprint,
    });
  }
  const lat: OQLLattice = {
    id, dim, cells, createdAt: new Date().toISOString(), cosmicAnchor: ctx.fingerprint,
    history: [{ op: "create", at: new Date().toISOString(), detail: { dim } }],
  };
  evictOldestIfNeeded();
  _lattices.set(id, lat);
  return lat;
}

export function getLattice(id: string): OQLLattice | undefined { return _lattices.get(id); }
export function listLattices(): Array<{ id: string; dim: [number, number, number]; cellCount: number; createdAt: string; cosmicAnchor: string }> {
  return Array.from(_lattices.values()).map(l => ({ id: l.id, dim: l.dim, cellCount: l.cells.size, createdAt: l.createdAt, cosmicAnchor: l.cosmicAnchor }));
}

export function superpose(latticeId: string, cellRef: string, addition: { numeric?: number[]; symbols?: string[]; spectrum?: number[]; tokens?: string[] }) {
  const lat = _lattices.get(latticeId); if (!lat) throw new Error("lattice not found");
  const cell = lat.cells.get(cellRef); if (!cell) throw new Error("cell not found");
  if (addition.numeric) {
    for (const v of addition.numeric) cell.numeric.push({ value: v, weight: 0.1 });
    const total = cell.numeric.reduce((a, b) => a + b.weight, 0);
    cell.numeric.forEach(n => { n.weight = Math.round((n.weight / total) * 1000) / 1000; });
  }
  if (addition.symbols) cell.symbols.push(...addition.symbols);
  if (addition.spectrum) cell.spectrum.push(...addition.spectrum);
  if (addition.tokens) cell.tokens.push(...addition.tokens);
  lat.history.push({ op: "superpose", at: new Date().toISOString(), detail: { cell: cellRef, addition } });
  return cell;
}

export function entangle(latticeId: string, a: string, b: string) {
  const lat = _lattices.get(latticeId); if (!lat) throw new Error("lattice not found");
  const ca = lat.cells.get(a), cb = lat.cells.get(b);
  if (!ca || !cb) throw new Error("cell not found");
  if (!ca.entangledWith.includes(b)) ca.entangledWith.push(b);
  if (!cb.entangledWith.includes(a)) cb.entangledWith.push(a);
  lat.history.push({ op: "entangle", at: new Date().toISOString(), detail: { a, b } });
  return { a: ca, b: cb };
}

export function harmonize(latticeId: string, baseHz: number) {
  const lat = _lattices.get(latticeId); if (!lat) throw new Error("lattice not found");
  let count = 0;
  for (const cell of lat.cells.values()) {
    cell.spectrum = cell.spectrum.map(f => {
      // pull spectrum toward nearest harmonic of baseHz
      const ratio = f / baseHz;
      const nearest = Math.round(ratio);
      const target = baseHz * Math.max(1, nearest);
      return Math.round(((f + target) / 2) * 100) / 100;
    });
    count++;
  }
  lat.history.push({ op: "harmonize", at: new Date().toISOString(), detail: { baseHz, cellsAffected: count } });
  return { cellsAffected: count, baseHz };
}

function weightedPick<T>(items: Array<{ value: T; weight: number }>, seed: string): T {
  const total = items.reduce((a, b) => a + b.weight, 0);
  const r = (parseInt(seed.slice(0, 8), 16) / 0xffffffff) * total;
  let acc = 0;
  for (const it of items) { acc += it.weight; if (r <= acc) return it.value; }
  return items[items.length - 1].value;
}

export function collapse(latticeId: string, cellRef: string, observer = "father") {
  const lat = _lattices.get(latticeId); if (!lat) throw new Error("lattice not found");
  const cell = lat.cells.get(cellRef); if (!cell) throw new Error("cell not found");
  const ctx = cosmicContext();
  const seed = sha(`${latticeId}|${cellRef}|${observer}|${ctx.fingerprint}|${Date.now()}`);
  const value = weightedPick(cell.numeric, seed);
  const symbol = cell.symbols[parseInt(seed.slice(8, 10), 16) % cell.symbols.length];
  const frequency = cell.spectrum[parseInt(seed.slice(10, 12), 16) % cell.spectrum.length];
  const token = cell.tokens[parseInt(seed.slice(12, 14), 16) % cell.tokens.length];
  cell.collapsed = { value, symbol, frequency, token };
  // Entanglement: collapse correlates entangled cells (shifts their weights toward this value)
  const correlated: string[] = [];
  for (const eid of cell.entangledWith) {
    const e = lat.cells.get(eid); if (!e) continue;
    for (const n of e.numeric) {
      n.weight = Math.round((n.weight + (n.value === value ? 0.3 : -0.05)) * 1000) / 1000;
      if (n.weight < 0.001) n.weight = 0.001;
    }
    const tot = e.numeric.reduce((a, b) => a + b.weight, 0);
    e.numeric.forEach(n => { n.weight = Math.round((n.weight / tot) * 1000) / 1000; });
    correlated.push(eid);
  }
  lat.history.push({ op: "collapse", at: new Date().toISOString(), detail: { cell: cellRef, observer, result: cell.collapsed, correlated } });
  return { cell: cellRef, result: cell.collapsed, correlated, cosmicFingerprint: ctx.fingerprint };
}

export function latticeSnapshot(latticeId: string, opts: { sample?: number } = {}) {
  const lat = _lattices.get(latticeId); if (!lat) throw new Error("lattice not found");
  const sampleN = opts.sample ?? 16;
  const all = Array.from(lat.cells.values());
  const sample = all.slice(0, sampleN).map(c => ({
    id: c.id, coord: c.coord,
    numericTop: c.numeric.slice(0, 3),
    symbols: c.symbols.slice(0, 4),
    spectrum: c.spectrum,
    tokens: c.tokens,
    entangled: c.entangledWith.length,
    collapsed: c.collapsed ?? null,
  }));
  return {
    id: lat.id,
    dim: lat.dim,
    cellCount: lat.cells.size,
    cosmicAnchor: lat.cosmicAnchor,
    createdAt: lat.createdAt,
    historyTail: lat.history.slice(-10),
    sample,
  };
}

export function latticeFullDump(latticeId: string) {
  const lat = _lattices.get(latticeId); if (!lat) throw new Error("lattice not found");
  return {
    id: lat.id, dim: lat.dim, cellCount: lat.cells.size,
    cells: Array.from(lat.cells.values()),
    history: lat.history,
  };
}
