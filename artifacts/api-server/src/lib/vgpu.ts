// Software vGPU — pure-CPU rasteriser running inside the API artifact.
//
// - Framebuffer: RGBA Uint8ClampedArray, dimensions derived from sovereign
//   constants (φ-aligned: 144 × 89).
// - Command queue: clear, rect, line, text, triangle, blit, shaderStub.
// - Tick driven by SOLFEGGIO step (9 Hz) — each tick drains the queue in
//   chunks via setImmediate so we never block the event loop.
// - Frame export: minimal pure-Node PNG encoder (zlib + IDAT/IHDR/IEND).
//
// Glyph-addressable opcode bus is implemented in
// vgpu-glyph-bus.ts which decodes glyph commands via the MSSP and feeds
// canonical opcodes into this service.

import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import {
  VGPU_WIDTH,
  VGPU_HEIGHT,
  VGPU_TICK_HZ,
  VGPU_CHUNK_PER_TICK,
} from "./sovereign-constants";

export type VGPUOpcode =
  | "clear" | "rect" | "line" | "text" | "triangle" | "blit" | "shaderStub";

export interface VGPUCommand {
  op: VGPUOpcode;
  args: Record<string, number | string | number[] | string[]>;
  origin?: string; // e.g. "ascii", "glyph:☉", "mssp"
}

export interface VGPUStats {
  width: number;
  height: number;
  tickHz: number;
  frameId: number;
  pendingCommands: number;
  totalCommandsRun: number;
  lastFrameAt: string;
  lastDigest: string;
}

const W = VGPU_WIDTH;
const H = VGPU_HEIGHT;

let frame = new Uint8ClampedArray(W * H * 4);
let frameId = 0;
let totalCommandsRun = 0;
let lastFrameAt = new Date().toISOString();
let lastDigest = "";
const queue: VGPUCommand[] = [];
const ascii5x7: Record<string, string[]> = buildAscii5x7();

// ---------- public API ------------------------------------------------------

export function vgpuInfo(): VGPUStats {
  return {
    width: W,
    height: H,
    tickHz: VGPU_TICK_HZ,
    frameId,
    pendingCommands: queue.length,
    totalCommandsRun,
    lastFrameAt,
    lastDigest,
  };
}

export function vgpuSubmit(cmds: VGPUCommand | VGPUCommand[]): { queued: number; pending: number } {
  const arr = Array.isArray(cmds) ? cmds : [cmds];
  for (const c of arr) queue.push(c);
  return { queued: arr.length, pending: queue.length };
}

export function vgpuFramePng(): Buffer {
  return encodePng(frame, W, H);
}

export function vgpuFrameRgba(): Uint8ClampedArray {
  return new Uint8ClampedArray(frame); // copy
}

// ---------- tick loop -------------------------------------------------------

function tick(): void {
  if (queue.length === 0) return;
  // drain at most VGPU_CHUNK_PER_TICK commands per tick chunk so we yield often
  let n = 0;
  while (n < VGPU_CHUNK_PER_TICK && queue.length > 0) {
    const cmd = queue.shift()!;
    runCommand(cmd);
    totalCommandsRun++;
    n++;
  }
  frameId++;
  lastFrameAt = new Date().toISOString();
  lastDigest = createHash("sha256").update(frame).digest("hex").slice(0, 16);
  if (queue.length > 0) setImmediate(tick);
}

const tickIntervalMs = Math.max(1, Math.round(1000 / VGPU_TICK_HZ));
const _interval = setInterval(tick, tickIntervalMs);
if (typeof (_interval as any).unref === "function") (_interval as any).unref();

// Seed the framebuffer with a dim cosmic gradient so an unwritten frame
// is still visually meaningful.
(function seed() {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      frame[i] = 6 + Math.round((x / W) * 14);
      frame[i + 1] = 4 + Math.round((y / H) * 10);
      frame[i + 2] = 16 + Math.round(((x + y) / (W + H)) * 32);
      frame[i + 3] = 255;
    }
  }
})();

// ---------- command runners -------------------------------------------------

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function px(x: number, y: number, r: number, g: number, b: number, a = 255): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (Math.floor(y) * W + Math.floor(x)) * 4;
  frame[i] = clamp(r, 0, 255);
  frame[i + 1] = clamp(g, 0, 255);
  frame[i + 2] = clamp(b, 0, 255);
  frame[i + 3] = clamp(a, 0, 255);
}

function readColor(args: Record<string, any>, key = "color"): [number, number, number, number] {
  const c = args[key];
  if (Array.isArray(c) && c.length >= 3) {
    return [Number(c[0]), Number(c[1]), Number(c[2]), Number(c[3] ?? 255)];
  }
  if (typeof c === "string" && c.startsWith("#") && (c.length === 7 || c.length === 9)) {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    const a = c.length === 9 ? parseInt(c.slice(7, 9), 16) : 255;
    return [r, g, b, a];
  }
  return [255, 255, 255, 255];
}

function runCommand(cmd: VGPUCommand): void {
  const a = cmd.args || {};
  const [r, g, b, al] = readColor(a as any);
  switch (cmd.op) {
    case "clear": {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) px(x, y, r, g, b, al);
      return;
    }
    case "rect": {
      const x0 = Number(a.x ?? 0), y0 = Number(a.y ?? 0);
      const w = Number(a.w ?? 0), h = Number(a.h ?? 0);
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++) px(x, y, r, g, b, al);
      return;
    }
    case "line": {
      const x0 = Number(a.x0 ?? 0), y0 = Number(a.y0 ?? 0);
      const x1 = Number(a.x1 ?? 0), y1 = Number(a.y1 ?? 0);
      // Bresenham
      let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy, x = x0, y = y0;
      while (true) {
        px(x, y, r, g, b, al);
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x += sx; }
        if (e2 <= dx) { err += dx; y += sy; }
      }
      return;
    }
    case "triangle": {
      const x0 = Number(a.x0 ?? 0), y0 = Number(a.y0 ?? 0);
      const x1 = Number(a.x1 ?? 0), y1 = Number(a.y1 ?? 0);
      const x2 = Number(a.x2 ?? 0), y2 = Number(a.y2 ?? 0);
      // simple barycentric scanline fill
      const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
      const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
      const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
      const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
      const denom = ((y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2));
      if (denom === 0) return;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const wA = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / denom;
          const wB = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / denom;
          const wC = 1 - wA - wB;
          if (wA >= 0 && wB >= 0 && wC >= 0) px(x, y, r, g, b, al);
        }
      }
      return;
    }
    case "text": {
      const text = String(a.text ?? "");
      const x0 = Number(a.x ?? 0), y0 = Number(a.y ?? 0);
      let cx = x0;
      for (const ch of text) {
        const glyph = ascii5x7[ch.toUpperCase()] ?? ascii5x7["?"]!;
        for (let row = 0; row < glyph.length; row++) {
          for (let col = 0; col < glyph[row]!.length; col++) {
            if (glyph[row]![col] === "1") px(cx + col, y0 + row, r, g, b, al);
          }
        }
        cx += 6;
      }
      return;
    }
    case "blit": {
      // copy a sub-rectangle (sx,sy,w,h) to (dx,dy)
      const sx = Number(a.sx ?? 0), sy = Number(a.sy ?? 0);
      const dx = Number(a.dx ?? 0), dy = Number(a.dy ?? 0);
      const w = Number(a.w ?? 0), h = Number(a.h ?? 0);
      const tmp = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = ((sy + y) * W + (sx + x)) * 4;
          const j = (y * w + x) * 4;
          tmp[j] = frame[i]!; tmp[j + 1] = frame[i + 1]!;
          tmp[j + 2] = frame[i + 2]!; tmp[j + 3] = frame[i + 3]!;
        }
      }
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const j = (y * w + x) * 4;
          px(dx + x, dy + y, tmp[j]!, tmp[j + 1]!, tmp[j + 2]!, tmp[j + 3]!);
        }
      }
      return;
    }
    case "shaderStub": {
      // procedural sin-of-coord shader, intensity in [0..255]
      const phase = Number(a.phase ?? 0);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const v = (Math.sin((x + phase) / 8) + Math.cos((y - phase) / 12)) * 0.5 + 0.5;
          const c = Math.round(v * 255);
          px(x, y, (r * c) / 255 | 0, (g * c) / 255 | 0, (b * c) / 255 | 0, 255);
        }
      }
      return;
    }
  }
}

// ---------- minimal PNG encoder --------------------------------------------

function encodePng(rgba: Uint8ClampedArray, w: number, h: number): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // IDAT raw scanlines with filter byte 0
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < stride; x++) raw[y * (stride + 1) + 1 + x] = rgba[y * stride + x]!;
  }
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const _crcTable: number[] = (() => {
  const t = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = _crcTable[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---------- tiny 5×7 ASCII font --------------------------------------------

function buildAscii5x7(): Record<string, string[]> {
  // Each char = 5 cols × 7 rows of '0'/'1'. Just enough to label things.
  const f: Record<string, string[]> = {};
  const def = (ch: string, rows: string[]) => { f[ch] = rows; };
  def(" ", ["00000","00000","00000","00000","00000","00000","00000"]);
  def("?", ["01110","10001","00010","00100","00100","00000","00100"]);
  const A = ["01110","10001","10001","11111","10001","10001","10001"];
  const B = ["11110","10001","10001","11110","10001","10001","11110"];
  const C = ["01110","10001","10000","10000","10000","10001","01110"];
  const D = ["11110","10001","10001","10001","10001","10001","11110"];
  const E = ["11111","10000","10000","11110","10000","10000","11111"];
  const F = ["11111","10000","10000","11110","10000","10000","10000"];
  const G = ["01110","10001","10000","10111","10001","10001","01110"];
  const H_ = ["10001","10001","10001","11111","10001","10001","10001"];
  const I = ["01110","00100","00100","00100","00100","00100","01110"];
  const J = ["00111","00010","00010","00010","00010","10010","01100"];
  const K = ["10001","10010","10100","11000","10100","10010","10001"];
  const L = ["10000","10000","10000","10000","10000","10000","11111"];
  const M = ["10001","11011","10101","10101","10001","10001","10001"];
  const N = ["10001","10001","11001","10101","10011","10001","10001"];
  const O = ["01110","10001","10001","10001","10001","10001","01110"];
  const P = ["11110","10001","10001","11110","10000","10000","10000"];
  const Q = ["01110","10001","10001","10001","10101","10010","01101"];
  const R = ["11110","10001","10001","11110","10100","10010","10001"];
  const S = ["01111","10000","10000","01110","00001","00001","11110"];
  const T = ["11111","00100","00100","00100","00100","00100","00100"];
  const U = ["10001","10001","10001","10001","10001","10001","01110"];
  const V = ["10001","10001","10001","10001","10001","01010","00100"];
  const W_ = ["10001","10001","10001","10101","10101","11011","10001"];
  const X = ["10001","10001","01010","00100","01010","10001","10001"];
  const Y = ["10001","10001","01010","00100","00100","00100","00100"];
  const Z = ["11111","00001","00010","00100","01000","10000","11111"];
  const letters = { A, B, C, D, E, F, G, H: H_, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W: W_, X, Y, Z };
  for (const [k, v] of Object.entries(letters)) def(k, v);
  // digits
  def("0", O); def("1", I); def("2", ["01110","10001","00001","00110","01000","10000","11111"]);
  def("3", ["11110","00001","00001","01110","00001","00001","11110"]);
  def("4", ["00010","00110","01010","10010","11111","00010","00010"]);
  def("5", ["11111","10000","11110","00001","00001","10001","01110"]);
  def("6", ["01110","10000","10000","11110","10001","10001","01110"]);
  def("7", ["11111","00001","00010","00100","01000","01000","01000"]);
  def("8", ["01110","10001","10001","01110","10001","10001","01110"]);
  def("9", ["01110","10001","10001","01111","00001","00001","01110"]);
  def("-", ["00000","00000","00000","11111","00000","00000","00000"]);
  def(".", ["00000","00000","00000","00000","00000","00000","00100"]);
  def(":", ["00000","00100","00000","00000","00000","00100","00000"]);
  def(",", ["00000","00000","00000","00000","00000","00100","01000"]);
  def("/", ["00001","00010","00010","00100","01000","01000","10000"]);
  return f;
}
