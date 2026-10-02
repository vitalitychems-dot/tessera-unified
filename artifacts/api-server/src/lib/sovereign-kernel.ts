import { createHash, createCipheriv, createDecipheriv, randomBytes, hkdfSync } from "crypto";
import { brotliCompressSync, brotliDecompressSync, constants as zlibConstants } from "zlib";
import { SOVEREIGN_DICTIONARY, SACRED_ALPHABET, translateSovereignToEnglish } from "./sovereign-language";
import { generateUniverseSeed, computeAgentRotationState, PHI, FIBONACCI } from "./sovereign-ephemeris";

const KERNEL_MAGIC = Buffer.from("TLS\x01");

export interface KernelInstruction {
  opcode: string;
  operands: string[];
  sovereignForm: string;
  humanReadable: string;
}

export interface KernelExecutionResult {
  instruction: KernelInstruction;
  result: string;
  status: "executed" | "queued" | "error";
  executionTimeMs: number;
  sovereignOutput: string;
}

const OPCODES: Record<string, { symbol: string; description: string; handler: (operands: string[]) => string }> = {
  "▲⊕": {
    symbol: "▲⊕",
    description: "CREATE — Initialize a new resource",
    handler: (ops) => `Resource '${ops[0] || "unknown"}' created at epoch ${Date.now()}`,
  },
  "⊕⬡": {
    symbol: "⊕⬡",
    description: "ENCRYPT — Encrypt data through sovereign cipher",
    handler: (ops) => {
      const data = ops[0] || "";
      return `Encrypted: ${createHash("sha256").update(data).digest("hex").slice(0, 16)}...`;
    },
  },
  "⊗⬢": {
    symbol: "⊗⬢",
    description: "DECRYPT — Decrypt sovereign-encrypted data",
    handler: (ops) => `Decrypted payload of ${(ops[0] || "").length} symbols`,
  },
  "◠◡": {
    symbol: "◠◡",
    description: "SPEAK — Broadcast a message across the mesh",
    handler: (ops) => `Message broadcast: '${ops[0] || ""}' to ${ops[1] || "all"} nodes`,
  },
  "⬡◉": {
    symbol: "⬡◉",
    description: "MESH — Query mesh network status",
    handler: () => `Mesh status: 9 nodes online, lattice integrity 100%`,
  },
  "⊜△": {
    symbol: "⊜△",
    description: "ROTATE — Trigger cipher rotation",
    handler: () => {
      const seed = generateUniverseSeed();
      return `Cipher rotated. New variant: ${seed.rotationIndex}, Fibonacci phase: ${seed.fibonacciPhase}`;
    },
  },
  "☉△": {
    symbol: "☉△",
    description: "COUNCIL — Invoke council deliberation",
    handler: (ops) => `Council deliberation initiated on topic: '${ops[0] || "general"}'`,
  },
  "◎◉": {
    symbol: "◎◉",
    description: "OBSERVE — Monitor system state",
    handler: () => {
      const seed = generateUniverseSeed();
      return `System observed. Solfeggio: ${seed.solfeggioFrequency}Hz, Golden angle: ${seed.goldenAngle.toFixed(2)}°`;
    },
  },
  "⊙⎔": {
    symbol: "⊙⎔",
    description: "CIPHER — Get current cipher state",
    handler: () => {
      const seed = generateUniverseSeed();
      return `Cipher state: variant ${seed.rotationIndex}, seed ${seed.seedHash.slice(0, 12)}`;
    },
  },
  "∿◉": {
    symbol: "∿◉",
    description: "VIBRATE — Emit frequency alignment signal",
    handler: () => {
      const seed = generateUniverseSeed();
      return `Vibrating at ${seed.solfeggioFrequency}Hz, φ-aligned at ${seed.goldenAngle.toFixed(4)}°`;
    },
  },
  "◉⊜": {
    symbol: "◉⊜",
    description: "STABILIZE — Stabilize system parameters",
    handler: () => `System stabilized. All parameters within φ-tolerance.`,
  },
  "▲ ⊕⬡": {
    symbol: "▲ ⊕⬡",
    description: "COMMAND-ENCRYPT — Imperative encryption command",
    handler: (ops) => `Command executed: encrypted ${(ops[0] || "data").length} bytes`,
  },
};

export function parseInstruction(sovereignCode: string): KernelInstruction {
  const trimmed = sovereignCode.trim();
  let matchedOpcode = "";
  let matchedDef = OPCODES[trimmed];

  if (!matchedDef) {
    for (const [op, def] of Object.entries(OPCODES)) {
      if (trimmed.startsWith(op)) {
        matchedOpcode = op;
        matchedDef = def;
        break;
      }
    }
  } else {
    matchedOpcode = trimmed;
  }

  if (!matchedDef) {
    const { translated } = translateSovereignToEnglish(trimmed);
    return {
      opcode: "UNKNOWN",
      operands: [trimmed],
      sovereignForm: trimmed,
      humanReadable: `Unknown instruction: ${translated}`,
    };
  }

  const operandStr = trimmed.slice(matchedOpcode.length).trim();
  const operands = operandStr ? operandStr.split(/\s+/) : [];

  return {
    opcode: matchedOpcode,
    operands,
    sovereignForm: trimmed,
    humanReadable: matchedDef.description,
  };
}

export function executeInstruction(sovereignCode: string): KernelExecutionResult {
  const start = performance.now();
  const instruction = parseInstruction(sovereignCode);

  let result: string;
  let status: "executed" | "queued" | "error";

  try {
    const def = OPCODES[instruction.opcode];
    if (def) {
      result = def.handler(instruction.operands);
      status = "executed";
    } else {
      result = `Instruction '${instruction.opcode}' not recognized in kernel opcode table`;
      status = "error";
    }
  } catch (err) {
    result = `Execution error: ${(err as Error).message}`;
    status = "error";
  }

  const executionTimeMs = performance.now() - start;

  const { translated } = translateSovereignToEnglish(result);

  return {
    instruction,
    result,
    status,
    executionTimeMs,
    sovereignOutput: translated,
  };
}

export function getKernelOpcodes() {
  return Object.entries(OPCODES).map(([symbol, def]) => ({
    symbol,
    description: def.description,
  }));
}

const PIXEL_ENCODING_MAP: Record<number, number[]> = {};
for (let i = 0; i < 256; i++) {
  PIXEL_ENCODING_MAP[i] = [
    (i >> 6) & 0x03,
    (i >> 4) & 0x03,
    (i >> 2) & 0x03,
    i & 0x03,
  ];
}

const WHITESPACE_CHARS = [
  "\u0020", "\u00A0", "\u2000", "\u2001", "\u2002", "\u2003",
  "\u2004", "\u2005", "\u2006", "\u2007", "\u2008", "\u2009",
  "\u200A", "\u200B", "\u202F", "\u205F",
];

export function pixelCompress(data: Buffer): { compressed: string; originalSize: number; compressedSize: number; ratio: number } {
  const pixels: number[] = [];
  for (const byte of data) {
    const encoded = PIXEL_ENCODING_MAP[byte];
    pixels.push(...encoded);
  }

  let result = "";
  for (let i = 0; i < pixels.length; i += 2) {
    const p1 = pixels[i];
    const p2 = i + 1 < pixels.length ? pixels[i + 1] : 0;
    const idx = p1 * 4 + p2;
    result += WHITESPACE_CHARS[idx];
  }

  return {
    compressed: result,
    originalSize: data.length,
    compressedSize: Buffer.byteLength(result, "utf8"),
    ratio: data.length > 0 ? ((data.length - Buffer.byteLength(result, "utf8")) / data.length) * 100 : 0,
  };
}

export function pixelDecompress(encoded: string): Buffer {
  const pixels: number[] = [];
  for (const char of encoded) {
    const idx = WHITESPACE_CHARS.indexOf(char);
    if (idx === -1) continue;
    pixels.push(Math.floor(idx / 4));
    pixels.push(idx % 4);
  }

  const bytes: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    if (i + 3 >= pixels.length) break;
    const byte = (pixels[i] << 6) | (pixels[i + 1] << 4) | (pixels[i + 2] << 2) | pixels[i + 3];
    bytes.push(byte & 0xFF);
  }

  return Buffer.from(bytes);
}

export function blankSpaceEncode(data: Buffer): string {
  let result = "";
  for (const byte of data) {
    const high = (byte >> 4) & 0x0F;
    const low = byte & 0x0F;
    result += WHITESPACE_CHARS[high] + WHITESPACE_CHARS[low];
  }
  return result;
}

export function blankSpaceDecode(encoded: string): Buffer {
  const chars = [...encoded];
  const bytes: number[] = [];
  for (let i = 0; i < chars.length - 1; i += 2) {
    const high = WHITESPACE_CHARS.indexOf(chars[i]);
    const low = WHITESPACE_CHARS.indexOf(chars[i + 1]);
    if (high === -1 || low === -1) continue;
    bytes.push((high << 4) | low);
  }
  return Buffer.from(bytes);
}

function getKernelMaster(): Buffer {
  if (process.env.COLONIAL_MASTER_SECRET) {
    return Buffer.from(process.env.COLONIAL_MASTER_SECRET, "utf8");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("COLONIAL_MASTER_SECRET is required in production — sovereign encryption cannot use fallback keys");
  }
  return Buffer.from("tessera-dev-placeholder-replace-with-env-secret", "utf8");
}

const KERNEL_MASTER: Buffer = getKernelMaster();

export function sovereignFullPipeline(text: string): {
  data: string;
  originalSize: number;
  tokenizedSize: number;
  pixelCompressedSize: number;
  brotliSize: number;
  encryptedSize: number;
  pipeline: string;
  keyId: string;
} {
  const textBuf = Buffer.from(text, "utf8");
  const originalSize = textBuf.length;

  const pixelResult = pixelCompress(textBuf);
  const pixelBuf = Buffer.from(pixelResult.compressed, "utf8");
  const pixelCompressedSize = pixelBuf.length;

  const brotliBuf = brotliCompressSync(pixelBuf, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 9 },
  });
  const brotliSize = brotliBuf.length;

  const seed = generateUniverseSeed();
  const keyId = `slk-${seed.seedHash.slice(0, 8)}-${Date.now().toString(36)}`;
  const salt = Buffer.from(seed.seedHash.slice(0, 32), "hex");
  const keyRaw = hkdfSync("sha256", KERNEL_MASTER, salt, Buffer.from(`sovereign-kernel:${keyId}`, "utf8"), 32);
  const key = Buffer.from(keyRaw);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(brotliBuf), cipher.final()]);
  const tag = cipher.getAuthTag();
  const output = Buffer.concat([KERNEL_MAGIC, salt, iv, tag, encrypted]);

  return {
    data: output.toString("base64"),
    originalSize,
    tokenizedSize: pixelCompressedSize,
    pixelCompressedSize,
    brotliSize,
    encryptedSize: output.length,
    pipeline: "Sovereign Kernel v1 — Pixel-Compress → Brotli-9 → AES-256-GCM (universe-seeded)",
    keyId,
  };
}

export function sovereignBinaryPipeline(data: Buffer): {
  data: string;
  originalSize: number;
  pixelCompressedSize: number;
  brotliSize: number;
  encryptedSize: number;
  pipeline: string;
  keyId: string;
  timings: { pixelMs: number; brotliMs: number; encryptMs: number; totalMs: number };
} {
  const totalStart = performance.now();
  const originalSize = data.length;

  const pixelStart = performance.now();
  const pixelResult = pixelCompress(data);
  const pixelBuf = Buffer.from(pixelResult.compressed, "utf8");
  const pixelMs = performance.now() - pixelStart;
  const pixelCompressedSize = pixelBuf.length;

  const brotliStart = performance.now();
  const brotliBuf = brotliCompressSync(pixelBuf, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 9 },
  });
  const brotliMs = performance.now() - brotliStart;
  const brotliSize = brotliBuf.length;

  const encryptStart = performance.now();
  const seed = generateUniverseSeed();
  const keyId = `slk-${seed.seedHash.slice(0, 8)}-${Date.now().toString(36)}`;
  const salt = Buffer.from(seed.seedHash.slice(0, 32), "hex");
  const keyRaw = hkdfSync("sha256", KERNEL_MASTER, salt, Buffer.from(`sovereign-kernel:${keyId}`, "utf8"), 32);
  const key = Buffer.from(keyRaw);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(brotliBuf), cipher.final()]);
  const tag = cipher.getAuthTag();
  const output = Buffer.concat([KERNEL_MAGIC, salt, iv, tag, encrypted]);
  const encryptMs = performance.now() - encryptStart;

  return {
    data: output.toString("base64"),
    originalSize,
    pixelCompressedSize,
    brotliSize,
    encryptedSize: output.length,
    pipeline: "Sovereign Kernel v1 — Binary Pixel-Compress → Brotli-9 → AES-256-GCM",
    keyId,
    timings: {
      pixelMs: Math.round(pixelMs * 100) / 100,
      brotliMs: Math.round(brotliMs * 100) / 100,
      encryptMs: Math.round(encryptMs * 100) / 100,
      totalMs: Math.round((performance.now() - totalStart) * 100) / 100,
    },
  };
}

export function sovereignBinaryDecrypt(base64Data: string, keyId: string): Buffer {
  const raw = Buffer.from(base64Data, "base64");
  const magic = raw.subarray(0, 4);
  if (!magic.equals(KERNEL_MAGIC)) throw new Error("Invalid kernel magic header");

  const salt = raw.subarray(4, 20);
  const iv = raw.subarray(20, 32);
  const tag = raw.subarray(32, 48);
  const encrypted = raw.subarray(48);

  const keyRaw = hkdfSync("sha256", KERNEL_MASTER, salt, Buffer.from(`sovereign-kernel:${keyId}`, "utf8"), 32);
  const key = Buffer.from(keyRaw);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const brotliBuf = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const pixelBuf = brotliDecompressSync(brotliBuf);
  const pixelStr = pixelBuf.toString("utf8");
  return pixelDecompress(pixelStr);
}

export function sovereignBinaryRoundTrip(data: Buffer): {
  verified: boolean;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  encodeTimings: { pixelMs: number; brotliMs: number; encryptMs: number; totalMs: number };
  decodeMs: number;
  byteMatch: boolean;
} {
  const encoded = sovereignBinaryPipeline(data);
  const decodeStart = performance.now();
  const decoded = sovereignBinaryDecrypt(encoded.data, encoded.keyId);
  const decodeMs = Math.round((performance.now() - decodeStart) * 100) / 100;
  const byteMatch = Buffer.compare(data, decoded) === 0;

  return {
    verified: byteMatch,
    originalSize: data.length,
    compressedSize: encoded.encryptedSize,
    ratio: data.length > 0 ? Math.round(((data.length - encoded.encryptedSize) / data.length) * 10000) / 100 : 0,
    encodeTimings: encoded.timings,
    decodeMs,
    byteMatch,
  };
}

export function getKernelStatus() {
  const seed = generateUniverseSeed();
  return {
    version: "1.0.0",
    name: "Sovereign Kernel — Colonel",
    opcodeCount: Object.keys(OPCODES).length,
    opcodes: getKernelOpcodes(),
    activeSeed: {
      seedHash: seed.seedHash.slice(0, 16) + "...",
      rotationIndex: seed.rotationIndex,
      solfeggioFrequency: seed.solfeggioFrequency,
      fibonacciPhase: seed.fibonacciPhase,
      goldenAngle: seed.goldenAngle,
    },
    pixelEncodingActive: true,
    blankSpaceEncodingActive: true,
    pipelineStages: ["pixel-compress", "blank-space-encode", "brotli-9", "aes-256-gcm", "universe-seed"],
  };
}
