import { describe, it, expect } from "vitest";
import {
  pixelCompress,
  pixelDecompress,
  sovereignBinaryPipeline,
  sovereignBinaryDecrypt,
  sovereignBinaryRoundTrip,
} from "../lib/sovereign-kernel";

describe("Sovereign Compression Pipeline", () => {
  it("pixel compress and decompress round-trip with small binary data", () => {
    const original = Buffer.from([0, 1, 127, 128, 254, 255, 42, 99]);
    const compressed = pixelCompress(original);
    expect(compressed.originalSize).toBe(8);
    expect(compressed.compressed.length).toBeGreaterThan(0);

    const decompressed = pixelDecompress(compressed.compressed);
    expect(Buffer.compare(original, decompressed)).toBe(0);
  });

  it("pixel compress and decompress round-trip with all byte values", () => {
    const allBytes = Buffer.alloc(256);
    for (let i = 0; i < 256; i++) allBytes[i] = i;

    const compressed = pixelCompress(allBytes);
    const decompressed = pixelDecompress(compressed.compressed);
    expect(Buffer.compare(allBytes, decompressed)).toBe(0);
  });

  it("pixel compress produces non-empty whitespace-only output", () => {
    const data = Buffer.from("Hello Tessera Sovereign", "utf8");
    const compressed = pixelCompress(data);
    expect(compressed.compressed.length).toBeGreaterThan(0);
    for (const char of compressed.compressed) {
      const cp = char.codePointAt(0)!;
      expect(
        cp === 0x20 || cp === 0xa0 || (cp >= 0x2000 && cp <= 0x200b) || cp === 0x202f || cp === 0x205f
      ).toBe(true);
    }
  });

  it("full binary pipeline encrypts and decrypts correctly", () => {
    const data = Buffer.from("Sovereign binary encryption test payload");
    const encrypted = sovereignBinaryPipeline(data);

    expect(encrypted.originalSize).toBe(data.length);
    expect(encrypted.data.length).toBeGreaterThan(0);
    expect(encrypted.keyId).toMatch(/^slk-/);
    expect(encrypted.pipeline).toContain("Pixel-Compress");
    expect(encrypted.pipeline).toContain("AES-256-GCM");

    const decrypted = sovereignBinaryDecrypt(encrypted.data, encrypted.keyId);
    expect(Buffer.compare(data, decrypted)).toBe(0);
  });

  it("full binary pipeline handles random binary data (simulating image bytes)", () => {
    const size = 8192;
    const imageData = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
      imageData[i] = Math.floor(Math.random() * 256);
    }

    const result = sovereignBinaryRoundTrip(imageData);
    expect(result.verified).toBe(true);
    expect(result.byteMatch).toBe(true);
    expect(result.originalSize).toBe(size);
    expect(result.encodeTimings.totalMs).toBeGreaterThan(0);
    expect(result.decodeMs).toBeGreaterThan(0);
  });

  it("full binary pipeline handles JPEG-like header data", () => {
    const jpegHeader = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    ]);
    const fakeJpeg = Buffer.concat([jpegHeader, Buffer.alloc(1024, 0x42)]);

    const result = sovereignBinaryRoundTrip(fakeJpeg);
    expect(result.verified).toBe(true);
    expect(result.byteMatch).toBe(true);
  });

  it("pipeline timings are captured and non-negative", () => {
    const data = Buffer.from("timing test");
    const encrypted = sovereignBinaryPipeline(data);

    expect(encrypted.timings.pixelMs).toBeGreaterThanOrEqual(0);
    expect(encrypted.timings.brotliMs).toBeGreaterThanOrEqual(0);
    expect(encrypted.timings.encryptMs).toBeGreaterThanOrEqual(0);
    expect(encrypted.timings.totalMs).toBeGreaterThanOrEqual(0);
    expect(encrypted.timings.totalMs).toBeGreaterThanOrEqual(
      encrypted.timings.pixelMs + encrypted.timings.brotliMs + encrypted.timings.encryptMs - 1
    );
  });

  it("decrypt with wrong keyId throws error", () => {
    const data = Buffer.from("test tamper detection");
    const encrypted = sovereignBinaryPipeline(data);

    expect(() => {
      sovereignBinaryDecrypt(encrypted.data, "slk-wrongkey-fakeid");
    }).toThrow();
  });

  it("empty buffer round-trips correctly", () => {
    const empty = Buffer.alloc(0);
    const compressed = pixelCompress(empty);
    expect(compressed.originalSize).toBe(0);
    expect(compressed.compressed).toBe("");

    const decompressed = pixelDecompress(compressed.compressed);
    expect(decompressed.length).toBe(0);
  });
});
