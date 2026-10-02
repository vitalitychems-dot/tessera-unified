import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Search, Zap, CheckCircle2, XCircle, Clock, HardDrive, Lock, ArrowRight, Loader2 } from "lucide-react";
import { HudPanel, HudMetric, PageHeader, GradientBar } from "@/components/ui/sovereign";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

function NasaThumb({ nasaId, title, thumbnailUrl }: { nasaId: string; title: string; thumbnailUrl: string }) {
  const [stage, setStage] = useState<"proxy" | "direct" | "fallback">("proxy");
  if (stage === "fallback") {
    return (
      <div className="w-full aspect-square bg-slate-900 flex items-center justify-center text-slate-700 text-[9px] font-mono">
        NO IMAGE
      </div>
    );
  }
  const src = stage === "proxy" ? `/api/universe/nasa-images/${nasaId}/proxy` : thumbnailUrl;
  return (
    <img
      src={src}
      alt={title}
      className="w-full aspect-square object-cover bg-slate-900"
      loading="lazy"
      onError={() => setStage(s => (s === "proxy" ? "direct" : "fallback"))}
    />
  );
}

interface NasaImageItem {
  nasaId: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  mediaType: string;
  keywords: string[];
}

interface CompressResult {
  ok: boolean;
  source: string;
  originalSize: number;
  pixelCompressedSize: number;
  brotliSize: number;
  encryptedSize: number;
  compressionRatio: number;
  pipeline: string;
  keyId: string;
  timings: { pixelMs: number; brotliMs: number; encryptMs: number; totalMs: number };
  encryptedPreview: string;
}

interface RoundTripResult {
  ok: boolean;
  source: string;
  verified: boolean;
  byteMatch: boolean;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  encodeTimings: { pixelMs: number; brotliMs: number; encryptMs: number; totalMs: number };
  decodeMs: number;
  pipeline: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function CompressionLabPage() {
  const [searchQuery, setSearchQuery] = useState("earth from space");
  const [activeSearch, setActiveSearch] = useState("earth from space");
  const [selectedImage, setSelectedImage] = useState<NasaImageItem | null>(null);

  const nasaSearch = useQuery<{ ok: boolean; items: NasaImageItem[]; totalHits: number }>({
    queryKey: ["/api/universe/nasa-images", activeSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ q: activeSearch, media_type: "image", page_size: "12" });
      const res = await fetch(`/api/universe/nasa-images?${params}`);
      return res.json();
    },
    enabled: !!activeSearch,
  });

  const compressMutation = useMutation<CompressResult>({
    mutationFn: async () => {
      if (!selectedImage) throw new Error("No image selected");
      const res = await apiRequest("POST", "/api/universe/compression-lab/compress", { nasaId: selectedImage.nasaId });
      return res.json();
    },
  });

  const roundTripMutation = useMutation<RoundTripResult>({
    mutationFn: async () => {
      if (!selectedImage) throw new Error("No image selected");
      const res = await apiRequest("POST", "/api/universe/compression-lab/round-trip", { nasaId: selectedImage.nasaId });
      return res.json();
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim());
      setSelectedImage(null);
      compressMutation.reset();
      roundTripMutation.reset();
    }
  };

  const handleSelectImage = (img: NasaImageItem) => {
    setSelectedImage(img);
    compressMutation.reset();
    roundTripMutation.reset();
  };

  const compress = compressMutation.data;
  const roundTrip = roundTripMutation.data;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 sovereign-stagger">
      <PageHeader
        title="Compression Lab"
        subtitle="SOVEREIGN KERNEL v1 — PIXEL-COMPRESS → BROTLI-9 → AES-256-GCM"
        gradient="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400"
        quote="All external data is pulled server-side through the sovereign engine. No trackers. No honeypots. Your data, your rules."
      />

      <HudPanel accent="cyan" scanline corners label="NASA IMAGE LIBRARY — SANDBOXED SEARCH">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search NASA Image Library..."
              className="w-full bg-black/30 border border-cyan-500/20 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/25 rounded-lg text-cyan-400 text-sm font-mono hover:bg-cyan-500/20 transition-colors"
          >
            Search
          </button>
        </div>

        {nasaSearch.isLoading && (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm font-mono">Querying NASA Image Library via sovereign proxy...</span>
          </div>
        )}

        {nasaSearch.data?.items && nasaSearch.data.items.length > 0 && (
          <>
            <div className="text-[10px] font-mono text-slate-500 mb-2">
              {nasaSearch.data.totalHits} results — images proxied server-side, no external scripts loaded
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {nasaSearch.data.items.map((img) => (
                <button
                  key={img.nasaId}
                  onClick={() => handleSelectImage(img)}
                  className={cn(
                    "relative group rounded-lg overflow-hidden border transition-all duration-200",
                    selectedImage?.nasaId === img.nasaId
                      ? "border-cyan-400/50 ring-1 ring-cyan-400/20"
                      : "border-white/5 hover:border-cyan-500/25"
                  )}
                >
                  {img.thumbnailUrl ? (
                    <NasaThumb nasaId={img.nasaId} title={img.title} thumbnailUrl={img.thumbnailUrl} />
                  ) : (
                    <div className="w-full aspect-square bg-slate-900 flex items-center justify-center">
                      <HardDrive size={20} className="text-slate-700" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="text-[9px] text-white font-mono leading-tight truncate">{img.title}</div>
                  </div>
                  {selectedImage?.nasaId === img.nasaId && (
                    <div className="absolute top-1 right-1">
                      <div className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-black" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </HudPanel>

      {selectedImage && (
        <HudPanel accent="violet" scanline label="SELECTED TARGET">
          <div className="flex gap-4 items-start">
            <div className="w-24 h-24 rounded-lg overflow-hidden border border-violet-500/20 shrink-0">
              <img
                src={`/api/universe/nasa-images/${selectedImage.nasaId}/proxy`}
                alt={selectedImage.title}
                className="w-full h-full object-cover bg-slate-900"
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.dataset.fallback !== "direct" && selectedImage.thumbnailUrl) {
                    el.dataset.fallback = "direct";
                    el.src = selectedImage.thumbnailUrl;
                  } else if (el.dataset.fallback !== "placeholder") {
                    el.dataset.fallback = "placeholder";
                    el.style.display = "none";
                  }
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-violet-300 font-mono">{selectedImage.title}</h3>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{selectedImage.description}</p>
              <div className="text-[9px] text-slate-600 font-mono mt-1">ID: {selectedImage.nasaId}</div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => compressMutation.mutate()}
                  disabled={compressMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/25 rounded-lg text-cyan-400 text-xs font-mono hover:bg-cyan-500/20 transition-colors disabled:opacity-40"
                >
                  {compressMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
                  Compress & Encrypt
                </button>
                <button
                  onClick={() => roundTripMutation.mutate()}
                  disabled={roundTripMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-emerald-400 text-xs font-mono hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                >
                  {roundTripMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                  Full Round-Trip Test
                </button>
              </div>
            </div>
          </div>
        </HudPanel>
      )}

      {compress && (
        <HudPanel accent="cyan" corners label="COMPRESSION PIPELINE RESULTS">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <HudMetric value={formatBytes(compress.originalSize)} label="Original" color="blue" />
            <HudMetric value={formatBytes(compress.pixelCompressedSize)} label="Pixel Compressed" color="violet" />
            <HudMetric value={formatBytes(compress.brotliSize)} label="Brotli-9" color="amber" />
            <HudMetric value={formatBytes(compress.encryptedSize)} label="Encrypted" color="cyan" />
          </div>

          <GradientBar
            value={Math.abs(compress.compressionRatio)}
            max={100}
            label="Compression Ratio"
            rightLabel={`${compress.compressionRatio > 0 ? "+" : ""}${compress.compressionRatio.toFixed(1)}%`}
            color={compress.compressionRatio > 0 ? "emerald" : "rose"}
          />

          <div className="mt-4 space-y-2">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Pipeline Stages</div>
            <div className="flex items-center gap-1 flex-wrap">
              {["Pixel-Compress", "Brotli-9", "AES-256-GCM"].map((stage, i) => (
                <span key={stage} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/15 text-cyan-300 font-mono">
                    {stage}
                  </span>
                  {i < 2 && <ArrowRight size={10} className="text-slate-600" />}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-xs font-mono text-amber-400">{compress.timings.pixelMs}ms</div>
              <div className="text-[9px] text-slate-600">Pixel Encode</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-mono text-violet-400">{compress.timings.brotliMs}ms</div>
              <div className="text-[9px] text-slate-600">Brotli Compress</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-mono text-cyan-400">{compress.timings.encryptMs}ms</div>
              <div className="text-[9px] text-slate-600">AES Encrypt</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-mono text-emerald-400">{compress.timings.totalMs}ms</div>
              <div className="text-[9px] text-slate-600">Total</div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-black/40 border border-white/5">
            <div className="text-[9px] font-mono text-slate-600 mb-1">ENCRYPTED PREVIEW (base64)</div>
            <div className="text-[10px] font-mono text-cyan-400/60 break-all leading-relaxed">{compress.encryptedPreview}</div>
          </div>

          <div className="mt-2 text-[9px] font-mono text-slate-600">
            Key ID: {compress.keyId}
          </div>
        </HudPanel>
      )}

      {roundTrip && (
        <HudPanel
          accent={roundTrip.verified ? "emerald" : "rose"}
          corners
          scanline
          label="ROUND-TRIP VERIFICATION"
        >
          <div className="flex items-center gap-3 mb-4">
            {roundTrip.verified ? (
              <>
                <CheckCircle2 size={24} className="text-emerald-400" />
                <div>
                  <div className="text-sm font-bold text-emerald-300 font-mono">BYTE-PERFECT MATCH</div>
                  <div className="text-[10px] text-emerald-500/60">Compress → Encrypt → Decrypt → Decompress → Verified</div>
                </div>
              </>
            ) : (
              <>
                <XCircle size={24} className="text-rose-400" />
                <div>
                  <div className="text-sm font-bold text-rose-300 font-mono">VERIFICATION FAILED</div>
                  <div className="text-[10px] text-rose-500/60">Data integrity check did not pass</div>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <HudMetric value={formatBytes(roundTrip.originalSize)} label="Original" color="blue" />
            <HudMetric value={formatBytes(roundTrip.compressedSize)} label="Encrypted" color="cyan" />
            <HudMetric value={`${roundTrip.ratio > 0 ? "+" : ""}${roundTrip.ratio}%`} label="Ratio" color={roundTrip.ratio > 0 ? "emerald" : "amber"} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-xs font-mono text-amber-400">{roundTrip.encodeTimings.pixelMs}ms</div>
              <div className="text-[9px] text-slate-600">Pixel Encode</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-mono text-violet-400">{roundTrip.encodeTimings.brotliMs}ms</div>
              <div className="text-[9px] text-slate-600">Brotli-9</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-mono text-cyan-400">{roundTrip.encodeTimings.encryptMs}ms</div>
              <div className="text-[9px] text-slate-600">AES Encrypt</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-mono text-emerald-400">{roundTrip.decodeMs}ms</div>
              <div className="text-[9px] text-slate-600">Full Decrypt</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1 flex-wrap">
            {["Pixel-Compress", "Brotli-9", "AES-GCM", "Decrypt", "Decompress", "Verify"].map((stage, i) => (
              <span key={stage} className="flex items-center gap-1">
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded font-mono border",
                  i < 3
                    ? "bg-cyan-500/10 border-cyan-500/15 text-cyan-300"
                    : "bg-emerald-500/10 border-emerald-500/15 text-emerald-300"
                )}>
                  {stage}
                </span>
                {i < 5 && <ArrowRight size={8} className="text-slate-700" />}
              </span>
            ))}
          </div>
        </HudPanel>
      )}
    </div>
  );
}
