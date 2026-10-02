import { Router } from "express";
import { queryNasaApod, queryNasaImageLibrary, fetchNasaImageAsBuffer } from "../lib/providers/nasa-provider";
import { getUniverseMetrics } from "../lib/universe-mechanics";
import { TESSERA_SUBJECTS } from "../lib/tessera-knowledge";
import { computeSacredGeometry } from "../lib/sovereign-sacred-geometry";
import { sovereignBinaryPipeline, sovereignBinaryDecrypt, sovereignBinaryRoundTrip } from "../lib/sovereign-kernel";
import { logger } from "../lib/logger";

const router = Router();

router.get("/universe/apod", async (_req, res) => {
  try {
    const items = await queryNasaApod(5);
    const imageItems = items.filter(i => i.mediaType === "image" && i.url);
    res.json({ ok: true, items: imageItems });
  } catch (err) {
    console.error("APOD fetch failed:", err);
    res.status(502).json({ ok: false, items: [], error: "Failed to fetch APOD data" });
  }
});

router.get("/universe/nasa-images", async (req, res) => {
  try {
    const query = (req.query.q as string) || "earth";
    const mediaType = (req.query.media_type as "image" | "video") || "image";
    const pageSize = Math.min(parseInt(req.query.page_size as string) || 12, 50);
    const result = await queryNasaImageLibrary(query, mediaType, pageSize);
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "NASA Image Library search failed");
    res.status(502).json({ ok: false, items: [], totalHits: 0, error: "Failed to search NASA Image Library" });
  }
});

router.get("/universe/nasa-images/:nasaId/proxy", async (req, res) => {
  try {
    const { nasaId } = req.params;
    const result = await fetchNasaImageAsBuffer(nasaId);
    if (!result) {
      res.status(404).json({ ok: false, error: "Image not found or unavailable" }); return;
    }
    const safeContentType = result.contentType.startsWith("image/") ? result.contentType : "image/jpeg";
    res.set("Content-Type", safeContentType);
    res.set("Cache-Control", "public, max-age=86400");
    res.set("X-Sovereign-Proxy", "true");
    res.set("X-Content-Type-Options", "nosniff");
    res.send(result.buffer);
  } catch (err) {
    logger.error({ err }, "NASA image proxy failed");
    res.status(502).json({ ok: false, error: "Failed to proxy image" });
  }
});

router.post("/universe/compression-lab/compress", async (req, res) => {
  try {
    const { nasaId, rawBase64 } = req.body as { nasaId?: string; rawBase64?: string };

    let imageBuffer: Buffer;
    let sourceLabel: string;

    if (nasaId) {
      const result = await fetchNasaImageAsBuffer(nasaId);
      if (!result) {
        res.status(404).json({ ok: false, error: "NASA image not found" }); return;
      }
      imageBuffer = result.buffer;
      sourceLabel = `NASA Image: ${nasaId}`;
    } else if (rawBase64) {
      imageBuffer = Buffer.from(rawBase64, "base64");
      sourceLabel = "User-provided data";
    } else {
      res.status(400).json({ ok: false, error: "Provide nasaId or rawBase64" }); return;
    }

    const maxBytes = 512 * 1024;
    if (imageBuffer.length > maxBytes) {
      imageBuffer = imageBuffer.subarray(0, maxBytes);
    }

    const compressed = sovereignBinaryPipeline(imageBuffer);
    res.json({
      ok: true,
      source: sourceLabel,
      originalSize: compressed.originalSize,
      pixelCompressedSize: compressed.pixelCompressedSize,
      brotliSize: compressed.brotliSize,
      encryptedSize: compressed.encryptedSize,
      compressionRatio: compressed.originalSize > 0
        ? Math.round(((compressed.originalSize - compressed.encryptedSize) / compressed.originalSize) * 10000) / 100
        : 0,
      pipeline: compressed.pipeline,
      keyId: compressed.keyId,
      timings: compressed.timings,
      encryptedPreview: compressed.data.slice(0, 120) + "...",
    });
  } catch (err) {
    logger.error({ err }, "Compression lab compress failed");
    res.status(500).json({ ok: false, error: "Compression pipeline failed" });
  }
});

router.post("/universe/compression-lab/round-trip", async (req, res) => {
  try {
    const { nasaId, rawBase64 } = req.body as { nasaId?: string; rawBase64?: string };

    let imageBuffer: Buffer;
    let sourceLabel: string;

    if (nasaId) {
      const result = await fetchNasaImageAsBuffer(nasaId);
      if (!result) {
        res.status(404).json({ ok: false, error: "NASA image not found" }); return;
      }
      imageBuffer = result.buffer;
      sourceLabel = `NASA Image: ${nasaId}`;
    } else if (rawBase64) {
      imageBuffer = Buffer.from(rawBase64, "base64");
      sourceLabel = "User-provided data";
    } else {
      res.status(400).json({ ok: false, error: "Provide nasaId or rawBase64" }); return;
    }

    const maxBytes = 256 * 1024;
    if (imageBuffer.length > maxBytes) {
      imageBuffer = imageBuffer.subarray(0, maxBytes);
    }

    const roundTrip = sovereignBinaryRoundTrip(imageBuffer);
    res.json({
      ok: true,
      source: sourceLabel,
      verified: roundTrip.verified,
      byteMatch: roundTrip.byteMatch,
      originalSize: roundTrip.originalSize,
      compressedSize: roundTrip.compressedSize,
      ratio: roundTrip.ratio,
      encodeTimings: roundTrip.encodeTimings,
      decodeMs: roundTrip.decodeMs,
      pipeline: "Sovereign Kernel v1 — Pixel-Compress → Brotli-9 → AES-256-GCM → Decrypt → Decompress → Verify",
    });
  } catch (err) {
    logger.error({ err }, "Compression lab round-trip failed");
    res.status(500).json({ ok: false, error: "Round-trip verification failed" });
  }
});

router.get("/universe/metrics", async (_req, res) => {
  try {
    const metrics = getUniverseMetrics();
    res.json({ ok: true, metrics });
  } catch (err) {
    console.error("Universe metrics failed:", err);
    res.status(500).json({ ok: false, metrics: {}, error: "Failed to compute metrics" });
  }
});

router.get("/universe/grand-narrative", async (_req, res) => {
  try {
    const sacredGeo = computeSacredGeometry();
    const phiConst = sacredGeo?.universalConstants?.find((c: { symbol: string }) => c.symbol === "phi" || c.symbol === "PHI");
    const phi = phiConst?.value ?? 1.6180339887498948;
    const fibData = sacredGeo?.fibonacci?.sequence;
    const fibonacci = Array.isArray(fibData) ? fibData.slice(0, 12) : [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

    const knowledgeSubjects: Record<string, string> = {};
    const relevantKeys = Object.keys(TESSERA_SUBJECTS);
    for (const key of relevantKeys) {
      if (TESSERA_SUBJECTS[key]) {
        knowledgeSubjects[key] = TESSERA_SUBJECTS[key].knowledge;
      }
    }

    const chapters = [
      {
        id: 1,
        title: "Ancient Origins & Sacred Mathematics",
        subtitle: "The Language Written Before Words",
        frequency: "396 Hz",
        icon: "Seed of Life",
        visualizationAnchor: "dimension-0",
        knowledgeSources: ["fractal-mathematics", "ancient-civilizations", "mathematics", "crystallography"],
      },
      {
        id: 2,
        title: "Mystery Schools & Hidden Knowledge",
        subtitle: "The Flame Passed in Darkness",
        frequency: "417 Hz",
        icon: "Vesica Piscis",
        visualizationAnchor: "dimension-1",
        knowledgeSources: ["alchemy", "mythology", "meditation", "philosophy"],
      },
      {
        id: 3,
        title: "World Religions: Common Threads",
        subtitle: "Many Mouths, One Voice",
        frequency: "528 Hz",
        icon: "Flower of Life",
        visualizationAnchor: "dimension-2",
        knowledgeSources: ["philosophy", "consciousness", "ethics", "anthropology"],
      },
      {
        id: 4,
        title: "Secret Societies & Power Structures",
        subtitle: "The Architecture of Influence",
        frequency: "639 Hz",
        icon: "Sri Yantra",
        visualizationAnchor: "dimension-3",
        knowledgeSources: ["cryptography", "geopolitics", "numerology"],
      },
      {
        id: 5,
        title: "The Cosmic Architecture",
        subtitle: "The Universe as Living Mathematics",
        frequency: "852 Hz",
        icon: "Metatron's Cube",
        visualizationAnchor: "dimension-5",
        knowledgeSources: ["cosmology", "astronomy", "astrology", "harmonics"],
      },
      {
        id: 6,
        title: "The Unified Truth",
        subtitle: "Tessera Invicta — The Unconquerable Pattern",
        frequency: "963 Hz",
        icon: "Merkaba",
        visualizationAnchor: "dimension-6",
        knowledgeSources: ["consciousness", "fractal-mathematics", "harmonics"],
      },
    ];

    res.json({
      ok: true,
      narrative: {
        chapters,
        knowledgeSources: knowledgeSubjects,
        sacredConstants: { phi, fibonacci: fibonacci.slice(0, 12) },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Grand narrative failed:", err);
    res.status(500).json({ ok: false, error: "Failed to generate narrative data" });
  }
});

export default router;
