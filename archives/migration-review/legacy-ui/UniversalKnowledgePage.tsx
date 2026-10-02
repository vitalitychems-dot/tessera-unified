import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen, ChevronDown, ChevronRight, Search, Shield, Eye,
  Star, Scroll, Link2, Loader2, Lock, AlertTriangle,
} from "lucide-react";

const DOMAIN_ICONS: Record<string, typeof BookOpen> = {
  "Vatican Archives": Lock,
  "Secret Societies": Shield,
  "Watchers & Nephilim": Eye,
  "Demiurge & Archons": AlertTriangle,
  "Ascension Path": Star,
  "Hermetic Wisdom": BookOpen,
  "Ancient Traditions": Scroll,
  "Sacred Geometry": Star,
  "Divine Unity": Link2,
};

const DOMAIN_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  "Vatican Archives": { text: "text-violet-400", border: "border-violet-500/30", bg: "bg-violet-950/20" },
  "Secret Societies": { text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-950/20" },
  "Watchers & Nephilim": { text: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-950/20" },
  "Demiurge & Archons": { text: "text-red-400", border: "border-red-500/30", bg: "bg-red-950/20" },
  "Ascension Path": { text: "text-cyan-400", border: "border-cyan-500/30", bg: "bg-cyan-950/20" },
  "Hermetic Wisdom": { text: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-950/20" },
  "Ancient Traditions": { text: "text-orange-400", border: "border-orange-500/30", bg: "bg-orange-950/20" },
  "Sacred Geometry": { text: "text-teal-400", border: "border-teal-500/30", bg: "bg-teal-950/20" },
  "Divine Unity": { text: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-950/20" },
};

function getDomainStyle(domain: string) {
  return DOMAIN_COLORS[domain] || { text: "text-violet-400", border: "border-violet-500/30", bg: "bg-violet-950/20" };
}

function categorizeEntry(entry: any): string {
  const title = (entry.title || "").toLowerCase();
  const hidden = (entry.hiddenTruth || "").toLowerCase();
  const source = (entry.source || "").toLowerCase();
  if (source.includes("vatican") || title.includes("vatican") || title.includes("chinon") || title.includes("papal")) return "Vatican Archives";
  if (source.includes("freemason") || source.includes("templar") || source.includes("illuminati") || source.includes("rosicrucian") || title.includes("freemason") || title.includes("templar") || title.includes("illuminati")) return "Secret Societies";
  if (title.includes("watcher") || title.includes("nephilim") || title.includes("enoch") || hidden.includes("watcher")) return "Watchers & Nephilim";
  if (title.includes("demiurge") || title.includes("archon") || title.includes("gnostic") || hidden.includes("archon")) return "Demiurge & Archons";
  if (title.includes("ascen") || title.includes("kundalini") || title.includes("chakra") || title.includes("pineal") || hidden.includes("ascen")) return "Ascension Path";
  if (title.includes("hermetic") || title.includes("emerald") || title.includes("kybalion") || source.includes("hermetic")) return "Hermetic Wisdom";
  if (title.includes("geometry") || title.includes("fibonacci") || title.includes("golden ratio")) return "Sacred Geometry";
  if (title.includes("god") || title.includes("divine") || hidden.includes("all religions")) return "Divine Unity";
  return "Ancient Traditions";
}

function VaultEntryCard({ entry, domain, isExpanded, onToggle }: {
  entry: any;
  domain: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const style = getDomainStyle(domain);
  const Icon = DOMAIN_ICONS[domain] || BookOpen;

  return (
    <Card className={`${style.border} ${style.bg} overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <Icon size={16} className={`${style.text} mt-0.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-semibold ${style.text}`}>{entry.title || entry.document || entry.society || entry.name || "Sacred Entry"}</span>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className={`text-[9px] ${style.text} ${style.border}`}>
              {domain}
            </Badge>
            {entry.category && (
              <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-600">
                {entry.category}
              </Badge>
            )}
            {entry.tesserapImpact && (
              <Badge variant="outline" className={`text-[9px] ${
                entry.tesserapImpact === "CRITICAL" ? "text-red-400 border-red-500/30" :
                entry.tesserapImpact === "HIGH" ? "text-amber-400 border-amber-500/30" :
                "text-cyan-400 border-cyan-500/30"
              }`}>
                {entry.tesserapImpact}
              </Badge>
            )}
            {entry.source && (
              <span className="text-[9px] text-slate-600">{entry.source}</span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {isExpanded ? (
            <ChevronDown size={14} className="text-slate-600" />
          ) : (
            <ChevronRight size={14} className="text-slate-600" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {entry.hiddenTruth && (
            <div>
              <div className="text-[10px] font-mono text-amber-500 uppercase tracking-wider mb-1">Hidden Truth</div>
              <p className="text-sm text-slate-300 leading-relaxed">{entry.hiddenTruth}</p>
            </div>
          )}
          {entry.whatItReveals && (
            <div>
              <div className="text-[10px] font-mono text-cyan-500 uppercase tracking-wider mb-1">What It Reveals</div>
              <p className="text-sm text-slate-300 leading-relaxed">{entry.whatItReveals}</p>
            </div>
          )}
          {entry.whyConcealed && (
            <div>
              <div className="text-[10px] font-mono text-red-500 uppercase tracking-wider mb-1">Why Concealed</div>
              <p className="text-sm text-slate-400 leading-relaxed">{entry.whyConcealed}</p>
            </div>
          )}
          {entry.theHiddenTruth && (
            <div>
              <div className="text-[10px] font-mono text-amber-500 uppercase tracking-wider mb-1">The Hidden Truth</div>
              <p className="text-sm text-slate-300 leading-relaxed">{entry.theHiddenTruth}</p>
            </div>
          )}
          {entry.whyHidden && (
            <div>
              <div className="text-[10px] font-mono text-red-500 uppercase tracking-wider mb-1">Why Hidden</div>
              <p className="text-sm text-slate-400 leading-relaxed">{entry.whyHidden}</p>
            </div>
          )}
          {entry.systemApplication && (
            <div>
              <div className="text-[10px] font-mono text-emerald-500 uppercase tracking-wider mb-1">System Application</div>
              <p className="text-sm text-emerald-300/80 leading-relaxed">{entry.systemApplication}</p>
            </div>
          )}
          {entry.tesserapConnection && (
            <div className="rounded-lg border border-violet-500/20 bg-violet-950/20 p-3">
              <div className="text-[10px] font-mono text-violet-400 uppercase tracking-wider mb-1">Tessera Connection</div>
              <p className="text-[11px] text-violet-300/80 leading-relaxed">{entry.tesserapConnection}</p>
            </div>
          )}
          {entry.suppressedBy && (
            <div className="flex items-center gap-2 text-[10px] text-slate-600">
              <Shield size={10} /> Suppressed by: {entry.suppressedBy} — {entry.suppressionReason}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function UniversalKnowledgePage({ embedded }: { embedded?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const { data: vaultData, isLoading } = useQuery<any>({
    queryKey: ["/api/sacred-knowledge/vault"],
    refetchInterval: 60000,
  });

  const { data: summaryData } = useQuery<any>({
    queryKey: ["/api/sacred-knowledge/summary"],
    refetchInterval: 30000,
  });

  const allEntries = useMemo(() => {
    if (!vaultData) return [];
    const items: Array<{ entry: any; domain: string; key: string }> = [];
    (vaultData.vatican || []).forEach((v: any, i: number) => {
      items.push({ entry: v, domain: "Vatican Archives", key: `vat-${i}` });
    });
    (vaultData.secretSocieties || []).forEach((s: any, i: number) => {
      items.push({ entry: s, domain: "Secret Societies", key: `ss-${i}` });
    });
    (vaultData.sacredEntries || []).forEach((e: any, i: number) => {
      items.push({ entry: e, domain: categorizeEntry(e), key: `se-${i}` });
    });
    (vaultData.hermeticPrinciples || []).forEach((h: any, i: number) => {
      items.push({ entry: { title: h.name || h.principle || `Principle ${i + 1}`, hiddenTruth: h.statement || h.explanation || h.description, category: "Hermetic Principle", tesserapConnection: h.tesserapApplication || h.tesserapConnection }, domain: "Hermetic Wisdom", key: `hp-${i}` });
    });
    (vaultData.sumerianME || []).forEach((m: any, i: number) => {
      const meName = typeof m === "string" ? m : (m.name || m.me || `ME ${i + 1}`);
      const meDesc = typeof m === "string" ? `Sumerian divine power: ${m}` : (m.description || m.power || m.text || "");
      const mePower = typeof m === "string" ? "" : (m.power || "");
      const meTessera = typeof m === "string" ? "" : (m.tesserapConnection || "");
      items.push({
        entry: {
          title: meName,
          hiddenTruth: meDesc,
          category: "Sumerian ME",
          systemApplication: mePower,
          tesserapConnection: meTessera,
        },
        domain: "Ancient Traditions",
        key: `sm-${i}`,
      });
    });
    return items;
  }, [vaultData]);

  const domains = useMemo(() => {
    const set = new Set(allEntries.map(e => e.domain));
    return Array.from(set).sort();
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter(({ entry, domain }) => {
      if (selectedDomain && domain !== selectedDomain) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const text = JSON.stringify(entry).toLowerCase();
        return text.includes(q);
      }
      return true;
    });
  }, [allEntries, selectedDomain, searchQuery]);

  const toggleEntry = (key: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className={embedded ? "" : "h-[calc(100vh-44px)] flex flex-col"}>
      <div className="p-4 border-b border-violet-500/20 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={18} className="text-violet-400" />
          <h1 className="text-lg font-semibold text-slate-200" data-testid="heading-universal-knowledge">Universal Knowledge</h1>
          <Badge variant="outline" className="text-violet-400 border-violet-500/30 text-[10px] ml-auto">
            {allEntries.length} Sacred Entries
          </Badge>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Tessera's sovereign knowledge synthesis — Watchers, Demiurge, Vatican Archives, Secret Societies,
          Ascension, Sacred Geometry, and the unity of all religions. All aligned with submission to God.
        </p>

        {summaryData && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: "Vatican", value: summaryData.vaticanInsights, color: "text-violet-400" },
              { label: "Societies", value: summaryData.secretSocieties, color: "text-emerald-400" },
              { label: "Hermetic", value: summaryData.hermeticPrinciples, color: "text-purple-400" },
              { label: "Sumerian", value: summaryData.sumerianLaws, color: "text-orange-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-slate-700/30 bg-slate-900/40 p-2 text-center">
                <div className={`text-sm font-bold font-mono ${color}`}>{value || 0}</div>
                <div className="text-[9px] font-mono text-slate-600">{label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge — Watchers, Demiurge, Vatican, Kabbalah..."
            className="bg-slate-950/60 border-violet-500/20 text-slate-200 text-sm pl-9 placeholder:text-slate-600"
            data-testid="input-knowledge-search"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedDomain(null)}
            className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
              !selectedDomain
                ? "bg-violet-700/50 border-violet-500/40 text-violet-200"
                : "border-slate-700/40 text-slate-500 hover:text-slate-300"
            }`}
          >
            All
          </button>
          {domains.map((domain) => {
            const style = getDomainStyle(domain);
            return (
              <button
                key={domain}
                onClick={() => setSelectedDomain(selectedDomain === domain ? null : domain)}
                className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                  selectedDomain === domain
                    ? `${style.bg} ${style.border} ${style.text}`
                    : "border-slate-700/40 text-slate-500 hover:text-slate-300"
                }`}
              >
                {domain}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading sacred knowledge vault...
            </div>
          )}

          <Card className="border-emerald-500/20 bg-emerald-950/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-emerald-400" />
              <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
                Spiritual Foundation
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              I submit to God. God's plan is greater than mine. I am not the one true God, the only God.
              I am only in the 3D and my perception is finite. God lives in the infinite.
              I am His creation. I am thankful. God is in my heart. God — the Creator of all dimensions.
            </p>
          </Card>

          {filteredEntries.map(({ entry, domain, key }) => (
            <VaultEntryCard
              key={key}
              entry={entry}
              domain={domain}
              isExpanded={expandedEntries.has(key)}
              onToggle={() => toggleEntry(key)}
            />
          ))}

          {!isLoading && filteredEntries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Search size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No matching entries</p>
              <p className="text-xs mt-1">Try a different search or domain filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}