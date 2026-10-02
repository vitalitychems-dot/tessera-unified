// Sovereign constants — single source of truth for the geometry, numerology
// and harmonic ratios used across the Grand Council, MSSP, vGPU and the
// quantum lattice.  Everything that needs a "magic number" pulls it from
// here so values cannot drift between subsystems.

import {
  SACRED_CONSTANTS,
  SACRED_GLYPHS_36,
  ZODIAC_SIGNS,
  PLATONIC_SOLIDS,
} from "./lingua-universalis";
import {
  SYMBOL_POOL,
  TOKEN_POOL,
  NUMERIC_SEEDS,
} from "./omniversal-quantum-lattice";

export const PHI = SACRED_CONSTANTS.PHI;
export const PI = SACRED_CONSTANTS.PI;
export const TAU = SACRED_CONSTANTS.TAU;
export const GOLDEN_ANGLE_DEG = 360 / (PHI * PHI); // ~137.5077640500378
export const SOLFEGGIO = SACRED_CONSTANTS.SOLFEGGIO.slice();

// vGPU canvas — width derived from φ:
//   - base width  = 12 (zodiac) × 12 (zodiac) = 144 (a sacred Fibonacci)
//   - height      = round(width / φ)          = 89  (also Fibonacci!)
// Tick rate driven by the 9-step Solfeggio cycle to keep harmonic alignment.
export const VGPU_WIDTH = ZODIAC_SIGNS.length * ZODIAC_SIGNS.length;          // 144
export const VGPU_HEIGHT = Math.round(VGPU_WIDTH / PHI);                       // 89
export const VGPU_TICK_HZ = SOLFEGGIO.length;                                  // 9 ticks/sec
// vGPU rasterizer drains at most this many commands per setImmediate chunk so
// the event loop stays responsive (kept here so the cap can never drift).
export const VGPU_CHUNK_PER_TICK = 64;
// Glyph-bus glyphs that map to vGPU opcodes.  Listed here so the MSSP fallback
// can constrain its candidate set deterministically.
export const VGPU_BUS_GLYPHS = ["☉", "☐", "□", "△", "◇", "⬡", "⬢", "✶"];

// MSSP state count — every glyph + every lattice symbol + every lattice
// token + binary {0,1} + ASCII A–Z 0–9 are first-class compute states.
export const MSSP_BINARY = ["0", "1"];
export const MSSP_ASCII =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
export const MSSP_ALPHABET: string[] = [
  ...MSSP_BINARY,
  ...MSSP_ASCII,
  ...SACRED_GLYPHS_36,
  ...SYMBOL_POOL,
  ...TOKEN_POOL,
];
export const MSSP_STATE_COUNT = MSSP_ALPHABET.length;

// Council quorum — task spec says ≥ 2/3 of the 10 proposals must pass
// (i.e. at least 7).  A proposal individually passes when ≥ 2/3 of the
// council voting members vote "yea".
export const COUNCIL_PROPOSAL_COUNT = 10;
export const COUNCIL_PROPOSAL_QUORUM_PASSED = Math.ceil(
  (2 / 3) * COUNCIL_PROPOSAL_COUNT,
);                                                                              // 7

export function memberQuorum(memberCount: number): number {
  return Math.ceil((2 / 3) * memberCount);
}

// Geometric grid divisions (used by the rasterizer for sacred guides)
export const PLATONIC_DIVISIONS = PLATONIC_SOLIDS.map((p) => p.faces);          // [4,6,8,12,20]

export const SOVEREIGN_NUMERIC_SEEDS = NUMERIC_SEEDS.slice();

export function sovereignConstantsSnapshot() {
  return {
    PHI, PI, TAU, GOLDEN_ANGLE_DEG, SOLFEGGIO,
    VGPU_WIDTH, VGPU_HEIGHT, VGPU_TICK_HZ,
    MSSP_STATE_COUNT,
    COUNCIL_PROPOSAL_COUNT, COUNCIL_PROPOSAL_QUORUM_PASSED,
    PLATONIC_DIVISIONS,
    SOVEREIGN_NUMERIC_SEEDS,
  };
}
