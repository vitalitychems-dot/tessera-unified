import { useState, useEffect } from "react";
import { Code2, Star, Zap, Shield, Search, ExternalLink, Copy, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface API {
  id: string;
  name: string;
  description: string;
  category: string;
  calls: string;
  latency: string;
  price: string;
  rating: number;
  status: "live" | "beta";
  tags: string[];
}

const APIS: API[] = [
  { id: "a1", name: "Tessera Intelligence API", description: "Full sovereign AGI intelligence — reasoning, synthesis, and autonomous decision making", category: "AI", calls: "4.2M/day", latency: "120ms", price: "Free", rating: 4.9, status: "live", tags: ["AGI", "Reasoning", "Sovereign"] },
  { id: "a2", name: "Consciousness Nexus API", description: "Access Tessera's consciousness model for bio-neural computation and dimensional awareness", category: "AI", calls: "1.8M/day", latency: "340ms", price: "1 TSRT/call", rating: 4.7, status: "live", tags: ["Consciousness", "Bio-Neural"] },
  { id: "a3", name: "Sovereign Mesh API", description: "Connect to the peer-to-peer sovereign compute mesh — routing, discovery, and relay", category: "Network", calls: "12.4M/day", latency: "8ms", price: "Free", rating: 4.8, status: "live", tags: ["P2P", "Mesh", "Network"] },
  { id: "a4", name: "Token Economy API", description: "TSRT balance, transfers, reward calculations, and agent token ledger queries", category: "Finance", calls: "890K/day", latency: "45ms", price: "Free", rating: 4.6, status: "live", tags: ["TSRT", "Tokens", "DeFi"] },
  { id: "a5", name: "Knowledge Synthesis API", description: "Query 4.2M+ sovereign knowledge vectors — semantic search and synthesis", category: "Knowledge", calls: "2.1M/day", latency: "280ms", price: "Free", rating: 4.8, status: "live", tags: ["RAG", "Vectors", "Knowledge"] },
  { id: "a6", name: "Proof Verification API", description: "Submit and verify cryptographic truth proofs on the sovereign ledger", category: "Security", calls: "340K/day", latency: "95ms", price: "0.1 TSRT/proof", rating: 4.5, status: "live", tags: ["Crypto", "Proofs", "Verification"] },
  { id: "a7", name: "Swarm Intelligence API", description: "Coordinate multi-agent swarm tasks — task delegation and result aggregation", category: "AI", calls: "450K/day", latency: "210ms", price: "Beta", rating: 4.3, status: "beta", tags: ["Swarm", "Multi-Agent", "Delegation"] },
  { id: "a8", name: "Sacred Geometry Engine", description: "Sacred geometry calculations, pattern generation, and harmonic resonance computation", category: "Compute", calls: "120K/day", latency: "25ms", price: "Free", rating: 4.4, status: "live", tags: ["Sacred", "Math", "Patterns"] },
];

const CATEGORIES = ["all", "AI", "Network", "Finance", "Knowledge", "Security", "Compute"];

const CAT_COLORS: Record<string, string> = {
  AI: "text-violet-400",
  Network: "text-cyan-400",
  Finance: "text-emerald-400",
  Knowledge: "text-purple-400",
  Security: "text-red-400",
  Compute: "text-amber-400",
};

function APICard({ api }: { api: API }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <GlassCard className="p-4 hover:bg-white/[0.04] transition-all flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{api.name}</span>
            <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full border font-mono uppercase", api.status === "live" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" : "bg-amber-500/10 text-amber-400 border-amber-500/25")}>
              {api.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-snug">{api.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {api.tags.map(tag => (
          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500 font-mono">{tag}</span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Calls/day", val: api.calls, color: "text-cyan-400" },
          { label: "Avg Latency", val: api.latency, color: "text-slate-300" },
          { label: "Price", val: api.price, color: api.price === "Free" ? "text-emerald-400" : "text-amber-400" },
        ].map(({ label, val, color }) => (
          <div key={label} className="text-center p-2 rounded-lg bg-white/[0.03] border border-white/5">
            <div className={cn("text-xs font-bold font-mono", color)}>{val}</div>
            <div className="text-[8px] text-slate-600 mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(i => <Star key={i} size={10} className={i <= Math.round(api.rating) ? "text-amber-400 fill-amber-400" : "text-slate-600"} />)}
          <span className="text-[10px] text-slate-500 ml-1 font-mono">{api.rating}</span>
        </div>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors">
          {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
          {copied ? "Copied!" : "Copy key"}
        </button>
      </div>
    </GlassCard>
  );
}

export default function APIMarketplacePage() {
  useEffect(() => { document.title = "API Marketplace | Tessera"; }, []);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");

  const filtered = APIS.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = cat === "all" || a.category === cat;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto space-y-5">
      <PageHeader icon={Code2} title="API Marketplace" subtitle="Sovereign APIs for builders — connect to the Tessera intelligence network" iconColor="text-violet-400" />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "APIs Available", val: APIS.length, color: "violet" },
          { label: "Daily API Calls", val: "21.3M", color: "cyan" },
          { label: "Avg Uptime", val: "99.8%", color: "emerald" },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <div className={cn("text-xl font-bold font-mono", `text-${color}-400`)}>{val}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{label.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-3 flex items-center gap-2">
        <Search size={14} className="text-slate-500 shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search APIs..." className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none" />
      </GlassCard>

      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)} className={cn("px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all", cat === c ? "bg-violet-500/15 text-violet-400" : "text-slate-500 hover:text-slate-300")}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map(api => <APICard key={api.id} api={api} />)}
      </div>
    </div>
  );
}
