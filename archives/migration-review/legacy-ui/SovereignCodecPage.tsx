import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Cpu, Zap, Archive, Eye, BarChart3, RefreshCw, Play, Lock, Image, ChevronRight, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CodecStats {
  totalCompressed: number;
  totalDecompressed: number;
  totalBytesIn: number;
  totalBytesOut: number;
  avgRatio: number;
  glyphTableSize: number;
  frequencyTableEntries: number;
  stegoPacksCreated: number;
  stegoExtractsRun: number;
  pipelineStages: string[];
  lastAnalysisAt: number;
  bestRatio: number;
  worstRatio: number;
  glyphSample: Array<{ word: string; glyph: string }>;
  topFrequencyPatterns: Array<{ pattern: string; frequency: number }>;
}

interface GlyphEntry {
  word: string;
  glyph: string;
  category: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  meta: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  entity: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  code: "bg-green-500/20 text-green-300 border-green-500/30",
  storage: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  security: "bg-red-500/20 text-red-300 border-red-500/30",
  crypto: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  ai: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  sovereign: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  general: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const PIPELINE_STAGE_COLORS = [
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "bg-green-500/20 text-green-300 border-green-500/30",
  "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "bg-pink-500/20 text-pink-300 border-pink-500/30",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function SovereignCodecPage({ embedded }: { embedded?: boolean }) {
  const activeTab = "all" as any;
  const setActiveTab = (_: any) => {};
  const [compressInput, setCompressInput] = useState('{"hello": "world", "agent": "tessera", "status": "sovereign"}');
  const [stegoInput, setStegoInput] = useState('{"secret": "knowledge", "type": "classified", "level": "sovereign"}');
  const [compressResult, setCompressResult] = useState<any>(null);
  const [stegoResult, setStegoResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: statsData, isLoading: statsLoading } = useQuery<{ success: boolean; stats: CodecStats; glyphTable: GlyphEntry[] }>({
    queryKey: ["/api/codec/stats"],
    refetchInterval: 15000,
  });

  const { data: glyphData } = useQuery<{ glyphs: GlyphEntry[]; total: number }>({
    queryKey: ["/api/codec/glyph-table"],
  });

  const compressMutation = useMutation({
    mutationFn: async () => {
      let data: any;
      try { data = JSON.parse(compressInput); } catch { data = compressInput; }
      return apiRequest("POST", "/api/codec/compress", { data });
    },
    onSuccess: (result: any) => {
      setCompressResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/codec/stats"] });
      toast({ title: "Compressed!", description: `${result.ratio}% reduction — ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)}` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const analyzeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/codec/analyze", {}),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/codec/stats"] });
      toast({ title: "Analysis Complete", description: `Built frequency table from ${result.scannedFiles} knowledge files, ${result.patterns?.length || 0} patterns indexed` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const recompressAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/codec/recompress-all", {}),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/codec/stats"] });
      toast({ title: "Re-compression Complete", description: `${result.totalFiles} files, ${result.overallRatio}% overall reduction` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const stegoPackMutation = useMutation({
    mutationFn: async () => {
      let data: any;
      try { data = JSON.parse(stegoInput); } catch { data = stegoInput; }
      return apiRequest("POST", "/api/codec/stego-pack", { data, width: 256, height: 256 });
    },
    onSuccess: (result: any) => {
      setStegoResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/codec/stats"] });
      toast({ title: "Steganographic Pack Complete", description: `${result.embeddedBytes} bytes hidden in ${result.width}x${result.height} image` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const stats = statsData?.stats;
  const glyphs = glyphData?.glyphs || statsData?.glyphTable || [];

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "compress", label: "Compress", icon: Archive },
    { id: "stego", label: "Stego Pack", icon: Image },
    { id: "glyphs", label: "Glyph Table", icon: Eye },
    { id: "frequency", label: "Frequency", icon: Zap },
  ] as const;

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-background text-white`}>
      <div className="border-b border-[#1a1f2e] bg-gradient-to-r from-[#0a0f1a] to-[#090a0f] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Sovereign Codec</h1>
            <p className="text-xs text-slate-400">TesseraScript Hyper-Compression Engine — structural→glyph→dedup→frequency→brotli</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {stats && (
              <>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs" data-testid="badge-avg-ratio">
                  {stats.avgRatio}% avg reduction
                </Badge>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs" data-testid="badge-glyph-count">
                  {stats.glyphTableSize} glyphs
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs" data-testid="badge-compressed-count">
                  {stats.totalCompressed} ops
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-[#1a1f2e] px-6">
        {false && tabs.map(tab => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-slate-300"}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {true && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Avg Compression", value: `${stats?.avgRatio ?? 0}%`, sub: "data reduction", color: "cyan", icon: Archive },
                { label: "Best Ratio", value: `${stats?.bestRatio ?? 0}%`, sub: "peak compression", color: "green", icon: Zap },
                { label: "Glyph Alphabet", value: stats?.glyphTableSize ?? 0, sub: "TesseraScript symbols", color: "purple", icon: Eye },
                { label: "Total Compressed", value: stats?.totalCompressed ?? 0, sub: "codec operations", color: "blue", icon: Cpu },
              ].map(({ label, value, sub, color, icon: Icon }) => (
                <div key={label} className={`bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-4`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 text-${color}-400`} />
                    <span className="text-xs text-slate-400">{label}</span>
                  </div>
                  <div className={`text-2xl font-bold text-${color}-300`}>{value}</div>
                  <div className="text-xs text-slate-500 mt-1">{sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-cyan-400" />
                Multi-Layer Compression Pipeline
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {(stats?.pipelineStages || ["structural", "glyph", "dedup", "frequency", "brotli"]).map((stage, i) => (
                  <div key={stage} className="flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium ${PIPELINE_STAGE_COLORS[i % PIPELINE_STAGE_COLORS.length]}`} data-testid={`pipeline-stage-${stage}`}>
                      {stage}
                    </div>
                    {i < (stats?.pipelineStages?.length || 5) - 1 && (
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Each stage is independently benchmarkable. Legacy TQL files (v1 magic bytes) are automatically detected and decompressed with the old path for backward compatibility.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  Storage Metrics
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Input Bytes</span>
                    <span className="text-white font-mono" data-testid="stat-bytes-in">{formatBytes(stats?.totalBytesIn ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Output Bytes</span>
                    <span className="text-white font-mono" data-testid="stat-bytes-out">{formatBytes(stats?.totalBytesOut ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Space Saved</span>
                    <span className="text-green-300 font-mono" data-testid="stat-bytes-saved">
                      {formatBytes(Math.max(0, (stats?.totalBytesIn ?? 0) - (stats?.totalBytesOut ?? 0)))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Decompress Ops</span>
                    <span className="text-white font-mono" data-testid="stat-decompress-count">{stats?.totalDecompressed ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-400" />
                  Steganography Stats
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stego Packs Created</span>
                    <span className="text-white font-mono" data-testid="stat-stego-packs">{stats?.stegoPacksCreated ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stego Extracts Run</span>
                    <span className="text-white font-mono" data-testid="stat-stego-extracts">{stats?.stegoExtractsRun ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Freq Table Entries</span>
                    <span className="text-white font-mono" data-testid="stat-freq-entries">{stats?.frequencyTableEntries ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Analysis</span>
                    <span className="text-white font-mono text-xs" data-testid="stat-last-analysis">
                      {stats?.lastAnalysisAt ? new Date(stats.lastAnalysisAt).toLocaleTimeString() : "Never"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button
                data-testid="button-analyze"
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                size="sm"
              >
                {analyzeMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Run Frequency Analysis
              </Button>
              <Button
                data-testid="button-recompress"
                onClick={() => recompressAllMutation.mutate()}
                disabled={recompressAllMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {recompressAllMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
                Re-compress All Knowledge
              </Button>
            </div>
          </div>
        )}

        {true && (
          <div className="space-y-5">
            <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Test Compression</h3>
              <Textarea
                data-testid="input-compress"
                value={compressInput}
                onChange={e => setCompressInput(e.target.value)}
                className="font-mono text-xs bg-[#0a0f1a] border-[#1a1f2e] text-white mb-3"
                rows={6}
                placeholder='{"key": "value", "agent": "tessera"}'
              />
              <Button
                data-testid="button-compress"
                onClick={() => compressMutation.mutate()}
                disabled={compressMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                size="sm"
              >
                {compressMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                Compress
              </Button>
            </div>

            {compressResult && (
              <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Result</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-300" data-testid="result-ratio">{compressResult.ratio}%</div>
                    <div className="text-xs text-slate-400">Reduction</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-mono text-white" data-testid="result-original">{formatBytes(compressResult.originalSize)}</div>
                    <div className="text-xs text-slate-400">Original</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-mono text-green-300" data-testid="result-compressed">{formatBytes(compressResult.compressedSize)}</div>
                    <div className="text-xs text-slate-400">Compressed</div>
                  </div>
                </div>
                <div className="bg-[#0a0f1a] rounded-lg p-3 font-mono text-xs text-slate-400 break-all max-h-24 overflow-y-auto" data-testid="result-base64">
                  {compressResult.compressedBase64?.slice(0, 200)}...
                </div>
              </div>
            )}
          </div>
        )}

        {true && (
          <div className="space-y-5">
            <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2">Steganographic Data Packer</h3>
              <p className="text-xs text-slate-400 mb-4">
                Embeds compressed data into the least-significant bits of PNG image pixels. Data is invisible to the naked eye.
                A 256×256 image holds up to ~24 KB of compressed data.
              </p>
              <Textarea
                data-testid="input-stego"
                value={stegoInput}
                onChange={e => setStegoInput(e.target.value)}
                className="font-mono text-xs bg-[#0a0f1a] border-[#1a1f2e] text-white mb-3"
                rows={5}
                placeholder='{"secret": "data"}'
              />
              <Button
                data-testid="button-stego-pack"
                onClick={() => stegoPackMutation.mutate()}
                disabled={stegoPackMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
              >
                {stegoPackMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Image className="w-4 h-4 mr-2" />}
                Pack into Image
              </Button>
            </div>

            {stegoResult && (
              <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Steganographic Pack Result</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-300" data-testid="stego-embedded">{formatBytes(stegoResult.embeddedBytes)}</div>
                    <div className="text-xs text-slate-400">Embedded</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-300" data-testid="stego-capacity">{formatBytes(stegoResult.capacityBytes)}</div>
                    <div className="text-xs text-slate-400">Capacity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-cyan-300" data-testid="stego-dimensions">{stegoResult.width}×{stegoResult.height}</div>
                    <div className="text-xs text-slate-400">Image Size</div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-3" data-testid="stego-metadata">{stegoResult.metadata}</p>
                <div className="bg-[#0a0f1a] rounded-lg p-3 font-mono text-xs text-slate-500 break-all max-h-20 overflow-y-auto">
                  {stegoResult.imageBase64?.slice(0, 100)}... [PNG image with embedded compressed data]
                </div>
              </div>
            )}

            <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Capacity Reference</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { w: 128, h: 128, label: "128×128" },
                  { w: 256, h: 256, label: "256×256" },
                  { w: 512, h: 512, label: "512×512" },
                  { w: 1024, h: 1024, label: "1024×1024" },
                ].map(({ w, h, label }) => {
                  const cap = Math.floor(w * h * 4 * 3 / 8) - 4;
                  return (
                    <div key={label} className="bg-[#0a0f1a] rounded-lg p-3 text-center" data-testid={`stego-cap-${label.replace("×", "x")}`}>
                      <div className="text-sm font-mono text-white">{label}</div>
                      <div className="text-xs text-purple-300 mt-1">{formatBytes(cap)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {true && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">TesseraScript Glyph Alphabet</h3>
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30" data-testid="badge-glyph-total">
                {glyphData?.total || glyphs.length} glyphs
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {glyphs.map(({ word, glyph, category }) => (
                <div
                  key={word}
                  className="bg-[#0d1117] border border-[#1a1f2e] rounded-lg p-3 flex items-center gap-3"
                  data-testid={`glyph-${word}`}
                >
                  <span className="text-2xl font-bold" title={glyph}>{glyph}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-white truncate">{word}</div>
                    <Badge className={`text-[10px] mt-1 ${CATEGORY_COLORS[category] || CATEGORY_COLORS.general}`}>
                      {category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {true && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Adaptive Frequency Table</h3>
              <Button
                data-testid="button-run-analysis"
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {analyzeMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                Run Analysis
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              The adaptive frequency analyzer scans knowledge base files and builds Huffman-style encoding tables where the most common patterns get the shortest codes. Run analysis to update.
            </p>
            {stats?.topFrequencyPatterns && stats.topFrequencyPatterns.length > 0 ? (
              <div className="space-y-2">
                {stats.topFrequencyPatterns.map(({ pattern, frequency }, i) => (
                  <div key={pattern} className="bg-[#0d1117] border border-[#1a1f2e] rounded-lg p-3 flex items-center gap-4" data-testid={`freq-pattern-${i}`}>
                    <span className="text-xs text-slate-500 w-6">{i + 1}</span>
                    <code className="text-xs font-mono text-cyan-300 flex-1 truncate">{pattern}</code>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-[#0a0f1a] rounded-full h-1.5">
                        <div
                          className="bg-cyan-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, (frequency / (stats.topFrequencyPatterns[0]?.frequency || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-12 text-right">{frequency}×</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#0d1117] border border-[#1a1f2e] rounded-xl p-8 text-center">
                <Zap className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No frequency data yet — run analysis to scan knowledge files and build the adaptive encoding table.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
