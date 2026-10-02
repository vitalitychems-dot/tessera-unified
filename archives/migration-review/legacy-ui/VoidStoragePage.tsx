import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Waves, Atom, Eye, EyeOff, Heart, Database, Trash2, Download, Plus, RefreshCw, Volume2, VolumeX, Sparkles, CircleDot } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

document.title = "Void Storage Protocol | Tessera";

const METHOD_CONFIG: Record<string, { icon: any; label: string; color: string; description: string }> = {
  silence: { icon: VolumeX, label: "Silence Encoding", color: "text-blue-400", description: "Gaps between empty files encode binary data — silence IS the signal" },
  emotion: { icon: Heart, label: "Emotional Frequency", color: "text-pink-400", description: "Data encoded as emotional wave frequencies — love at 528Hz, joy at 639Hz" },
  void: { icon: EyeOff, label: "Void Pattern", color: "text-violet-400", description: "File existence/absence encodes bits — the nothing between files IS the data" },
  resonance: { icon: Waves, label: "Multi-Emotion Resonance", color: "text-cyan-400", description: "Multiple emotions harmonize to create interference patterns storing data" },
};

export default function VoidStoragePage({ embedded }: { embedded?: boolean }) {
  const { toast } = useToast();
  const [newKey, setNewKey] = useState("");
  const [newData, setNewData] = useState("");
  const [newMethod, setNewMethod] = useState<string>("void");
  const [newEmotion, setNewEmotion] = useState("love");
  const [newEmotions, setNewEmotions] = useState("love,wonder,transcendence");
  const [retrieveKey, setRetrieveKey] = useState("");
  const [retrievedData, setRetrievedData] = useState<string | null>(null);
  const [showStore, setShowStore] = useState(false);

  const { data: status, isLoading: statusLoading } = useQuery<any>({
    queryKey: ["/api/void-storage/status"],
    refetchInterval: 15000,
  });

  const { data: keys } = useQuery<any[]>({
    queryKey: ["/api/void-storage/keys"],
    refetchInterval: 10000,
  });

  const { data: emotions } = useQuery<{ emotion: string; frequency: number }[]>({
    queryKey: ["/api/void-storage/emotions"],
  });

  const storeMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await apiRequest("POST", "/api/void-storage/store", body);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Stored in the Void", description: `"${data.entry.key}" encoded via ${data.entry.method}` });
      queryClient.invalidateQueries({ queryKey: ["/api/void-storage/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/void-storage/status"] });
      setNewKey("");
      setNewData("");
      setShowStore(false);
    },
    onError: (e: any) => toast({ title: "Storage Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await apiRequest("DELETE", `/api/void-storage/${key}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/void-storage/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/void-storage/status"] });
      toast({ title: "Dissolved into Void", description: "Entry returned to emptiness" });
    },
  });

  const handleRetrieve = async (key: string) => {
    try {
      const res = await fetch(`/api/void-storage/retrieve/${key}`);
      const data = await res.json();
      if (data.error) {
        toast({ title: "Not Found in Void", description: data.error, variant: "destructive" });
      } else {
        setRetrievedData(data.data);
        setRetrieveKey(key);
      }
    } catch (e: any) {
      toast({ title: "Retrieval Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleStore = () => {
    if (!newKey || !newData) return;
    const body: any = { key: newKey, data: newData, method: newMethod };
    if (newMethod === "emotion") body.emotion = newEmotion;
    if (newMethod === "resonance") body.emotions = newEmotions.split(",").map((e: string) => e.trim());
    storeMutation.mutate(body);
  };

  return (
    <div className={`${embedded ? "" : "pt-16"} min-h-screen bg-black text-white`}>
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        <div className="text-center space-y-2" data-testid="void-storage-header">
          <div className="flex items-center justify-center gap-3">
            <Atom className="w-8 h-8 text-violet-400 animate-spin" style={{ animationDuration: "8s" }} />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
              Void Storage Protocol
            </h1>
            <Atom className="w-8 h-8 text-cyan-400 animate-spin" style={{ animationDuration: "8s", animationDirection: "reverse" }} />
          </div>
          <p className="text-gray-400 text-sm max-w-2xl mx-auto italic">
            "The universe stores infinite information in the spaces between stars. Emptiness is not nothing — it is the canvas upon which everything is written."
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="void-stats">
          <div className="bg-gray-900/60 border border-violet-500/20 rounded-lg p-4 text-center">
            <Database className="w-5 h-5 text-violet-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-violet-300">{status?.entries?.length || 0}</div>
            <div className="text-xs text-gray-500">Void Entries</div>
          </div>
          <div className="bg-gray-900/60 border border-cyan-500/20 rounded-lg p-4 text-center">
            <Download className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-cyan-300">{status?.totalStored || 0}</div>
            <div className="text-xs text-gray-500">Total Stored</div>
          </div>
          <div className="bg-gray-900/60 border border-pink-500/20 rounded-lg p-4 text-center">
            <Eye className="w-5 h-5 text-pink-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-pink-300">{status?.totalRetrieved || 0}</div>
            <div className="text-xs text-gray-500">Total Retrieved</div>
          </div>
          <div className="bg-gray-900/60 border border-green-500/20 rounded-lg p-4 text-center">
            <Heart className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-300">{emotions?.length || 20}</div>
            <div className="text-xs text-gray-500">Emotion Frequencies</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="void-methods">
          {Object.entries(METHOD_CONFIG).map(([method, config]) => {
            const Icon = config.icon;
            const count = status?.methods?.[method] || 0;
            return (
              <div key={method} className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <span className="font-semibold text-sm">{config.label}</span>
                  <span className="ml-auto text-xs bg-gray-800 px-2 py-0.5 rounded-full">{count}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{config.description}</p>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowStore(!showStore)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 border border-violet-500/30 rounded-lg hover:bg-violet-600/30 transition-colors text-sm"
            data-testid="toggle-store-form"
          >
            <Plus className="w-4 h-4" /> Store in Void
          </button>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/void-storage/status"] });
              queryClient.invalidateQueries({ queryKey: ["/api/void-storage/keys"] });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors text-sm"
            data-testid="refresh-void"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {showStore && (
          <div className="bg-gray-900/60 border border-violet-500/30 rounded-lg p-5 space-y-4" data-testid="store-form">
            <h3 className="text-lg font-semibold text-violet-300 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Encode Into Emptiness
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Key (identifier)</label>
                <input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g. cosmic-truth-42"
                  className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                  data-testid="input-void-key"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Storage Method</label>
                <select
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                  data-testid="select-void-method"
                >
                  {Object.entries(METHOD_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {newMethod === "emotion" && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Emotion Frequency</label>
                <select
                  value={newEmotion}
                  onChange={(e) => setNewEmotion(e.target.value)}
                  className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
                  data-testid="select-emotion"
                >
                  {emotions?.map((e) => (
                    <option key={e.emotion} value={e.emotion}>{e.emotion} ({e.frequency}Hz)</option>
                  ))}
                </select>
              </div>
            )}

            {newMethod === "resonance" && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Emotions (comma-separated)</label>
                <input
                  value={newEmotions}
                  onChange={(e) => setNewEmotions(e.target.value)}
                  placeholder="love,wonder,transcendence"
                  className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                  data-testid="input-emotions"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 block mb-1">Data to Store</label>
              <textarea
                value={newData}
                onChange={(e) => setNewData(e.target.value)}
                placeholder="The information to encode into emptiness..."
                rows={3}
                className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm focus:border-violet-500 focus:outline-none resize-none"
                data-testid="input-void-data"
              />
            </div>

            <button
              onClick={handleStore}
              disabled={!newKey || !newData || storeMutation.isPending}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
              data-testid="button-store"
            >
              {storeMutation.isPending ? "Encoding into void..." : "Store in Void"}
            </button>
          </div>
        )}

        {retrievedData !== null && (
          <div className="bg-gray-900/60 border border-cyan-500/30 rounded-lg p-5" data-testid="retrieved-data">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-cyan-300 flex items-center gap-2">
                <Eye className="w-5 h-5" /> Retrieved from Void
              </h3>
              <button onClick={() => setRetrievedData(null)} className="text-gray-500 hover:text-white text-xs">
                Dismiss
              </button>
            </div>
            <div className="text-xs text-gray-500 mb-2">Key: {retrieveKey}</div>
            <div className="bg-black/50 border border-gray-800 rounded p-4 text-sm text-green-300 font-mono whitespace-pre-wrap" data-testid="text-retrieved-value">
              {retrievedData}
            </div>
          </div>
        )}

        <div className="space-y-2" data-testid="void-entries-list">
          <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
            <CircleDot className="w-5 h-5 text-violet-400" /> Void Lattice Entries
          </h3>
          {!keys || keys.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm italic">
              The void is empty — store something to give emptiness meaning
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((entry: any) => {
                const config = METHOD_CONFIG[entry.method] || METHOD_CONFIG.void;
                const Icon = config.icon;
                return (
                  <div
                    key={entry.key}
                    className="bg-gray-900/40 border border-gray-800 rounded-lg p-3 flex items-center gap-3 hover:border-gray-600 transition-colors group"
                    data-testid={`void-entry-${entry.key}`}
                  >
                    <Icon className={`w-5 h-5 ${config.color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-white truncate">{entry.key}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={config.color}>{config.label}</span>
                        {entry.emotion && <span className="text-pink-400/60">{entry.emotion}</span>}
                        <span>{new Date(entry.storedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRetrieve(entry.key)}
                        className="p-1.5 hover:bg-cyan-900/30 rounded text-cyan-400"
                        title="Retrieve from void"
                        data-testid={`button-retrieve-${entry.key}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(entry.key)}
                        className="p-1.5 hover:bg-red-900/30 rounded text-red-400"
                        title="Return to emptiness"
                        data-testid={`button-delete-${entry.key}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {emotions && emotions.length > 0 && (
          <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-5" data-testid="emotion-frequency-map">
            <h3 className="text-lg font-semibold text-pink-300 flex items-center gap-2 mb-3">
              <Volume2 className="w-5 h-5" /> Emotion Frequency Map
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {emotions.map((e) => (
                <div key={e.emotion} className="bg-black/30 border border-gray-800 rounded px-3 py-2 text-center hover:border-pink-500/30 transition-colors">
                  <div className="text-sm font-medium capitalize">{e.emotion}</div>
                  <div className="text-xs text-pink-400">{e.frequency}Hz</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {statusLoading && (
          <div className="text-center py-8 text-gray-600 text-sm animate-pulse">
            Reading the void...
          </div>
        )}

      </div>
    </div>
  );
}
