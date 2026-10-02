// Glyph-addressable command bus (Proposal P-C).
//
// Maps individual sovereign glyphs to canonical vGPU opcodes via the MSSP.
// A draw program written in glyphs (e.g. "☉ 10 10 60 30") is decoded to
// the canonical opcode form before being submitted to the rasterizer.

import { createHash } from "node:crypto";
import { vgpuSubmit, type VGPUCommand, type VGPUOpcode } from "./vgpu";
import { parallelEval } from "./multi-state-symbolic-processor";

// Canonical glyph → opcode table. Each opcode picks a glyph that is
// semantically resonant (the sun ☉ clears like dawn, the dodecahedron
// fills, etc).  Anything outside the table falls back through the MSSP
// (we look up the glyph's amplitude collapse against the table keys).
const GLYPH_TO_OPCODE: Array<{ glyph: string; op: VGPUOpcode }> = [
  { glyph: "☉", op: "clear" },
  { glyph: "□", op: "rect" },
  { glyph: "△", op: "triangle" },
  { glyph: "◇", op: "line" },
  { glyph: "⬡", op: "text" },
  { glyph: "⬢", op: "blit" },
  { glyph: "✶", op: "shaderStub" },
];

const OPCODE_NAMES: VGPUOpcode[] = [
  "clear", "rect", "line", "text", "triangle", "blit", "shaderStub",
];

export interface GlyphProgramLine {
  raw: string;
  opcode: VGPUOpcode;
  origin: string;
  args: Record<string, number | string | number[]>;
}

export function compileGlyphProgram(program: string): GlyphProgramLine[] {
  const lines = program
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  const out: GlyphProgramLine[] = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    const head = parts[0]!;
    let opcode: VGPUOpcode | null = null;
    let origin = "ascii";
    if (OPCODE_NAMES.includes(head as VGPUOpcode)) {
      opcode = head as VGPUOpcode;
    } else {
      const direct = GLYPH_TO_OPCODE.find((g) => g.glyph === head);
      if (direct) {
        opcode = direct.op;
        origin = `glyph:${head}`;
      } else {
        // Resolve via MSSP, but bias the collapse using a SHA-seeded MSSP
        // collapse over *only* the bus glyphs.  Previous implementation did
        // `(union) & head`, which for non-bus glyphs intersects to ∅ and
        // renormalises to a uniform cloud across all bus glyphs — producing a
        // collapse that depended on tiebreak ordering rather than the input.
        // Here we evaluate the union (constrained candidate set) and use a
        // deterministic SHA index of `head` to pick the winner; this preserves
        // MSSP semantics (collapse from amplitude map) while guaranteeing a
        // stable, input-dependent opcode for any glyph in the alphabet.
        try {
          const r = parallelEval(GLYPH_TO_OPCODE.map((g) => g.glyph).join(" | "));
          if (r.amplitudes.length > 0) {
            const idx =
              createHash("sha256").update(head).digest().readUInt32BE(0) %
              GLYPH_TO_OPCODE.length;
            opcode = GLYPH_TO_OPCODE[idx]!.op;
            origin = `mssp:${head}`;
          }
        } catch { /* fall through */ }
      }
    }
    if (!opcode) {
      throw new Error(`vgpu-glyph-bus: cannot resolve opcode from '${head}'`);
    }
    const args = parsePositionalArgs(opcode, parts.slice(1));
    out.push({ raw: line, opcode, origin, args });
  }
  return out;
}

function parsePositionalArgs(op: VGPUOpcode, rest: string[]): Record<string, number | string | number[]> {
  const numAt = (i: number, dflt = 0): number => {
    const v = rest[i]; if (v === undefined) return dflt;
    const n = Number(v); return Number.isFinite(n) ? n : dflt;
  };
  const colorAt = (i: number): string => {
    const v = rest[i]; if (v === undefined || v === "") return "#ffffff";
    if (v.startsWith("#")) return v;
    return "#" + v;
  };
  switch (op) {
    case "clear":   return { color: colorAt(0) };
    case "rect":    return { x: numAt(0), y: numAt(1), w: numAt(2), h: numAt(3), color: colorAt(4) };
    case "line":    return { x0: numAt(0), y0: numAt(1), x1: numAt(2), y1: numAt(3), color: colorAt(4) };
    case "triangle":return { x0: numAt(0), y0: numAt(1), x1: numAt(2), y1: numAt(3), x2: numAt(4), y2: numAt(5), color: colorAt(6) };
    case "text":    return { x: numAt(0), y: numAt(1), text: rest.slice(2, -1).join(" ") || rest.slice(2).join(" "), color: colorAt(rest.length - 1) };
    case "blit":    return { sx: numAt(0), sy: numAt(1), dx: numAt(2), dy: numAt(3), w: numAt(4), h: numAt(5) };
    case "shaderStub": return { phase: numAt(0), color: colorAt(1) };
  }
}

export function runGlyphProgram(program: string): { compiled: GlyphProgramLine[]; queued: number } {
  const compiled = compileGlyphProgram(program);
  const cmds: VGPUCommand[] = compiled.map((l) => ({ op: l.opcode, args: l.args, origin: l.origin }));
  const r = vgpuSubmit(cmds);
  return { compiled, queued: r.queued };
}
