import { useState, useEffect } from "react";
import { MapPin, Star, Phone, Clock, ChevronRight, Search, Zap, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  reviews: number;
  distance: string;
  status: "open" | "closed" | "sovereign";
  price: string;
  tags: string[];
}

const SERVICES: Service[] = [
  { id: "s1", name: "Sovereign Mesh Installation", category: "Tech", description: "Professional installation of sovereign mesh nodes and routing hardware at your location", rating: 4.9, reviews: 48, distance: "Local", status: "sovereign", price: "$299", tags: ["Mesh", "Sovereign", "Hardware"] },
  { id: "s2", name: "Sacred Geometry Consultation", category: "Spiritual", description: "One-on-one session with a certified sacred geometry practitioner for space optimization and energy alignment", rating: 4.8, reviews: 124, distance: "2.3 mi", status: "open", price: "$144/hr", tags: ["Sacred", "Energy", "Consultation"] },
  { id: "s3", name: "Sovereign Legal Services", category: "Legal", description: "Legal advice specialized in digital sovereignty, crypto law, DAO governance, and AI rights", rating: 4.7, reviews: 36, distance: "4.1 mi", status: "open", price: "$250/hr", tags: ["Legal", "Crypto", "DAO"] },
  { id: "s4", name: "Tessera Node Technical Support", category: "Tech", description: "In-person technical support for Tessera node operators — troubleshooting, upgrades, and optimization", rating: 4.9, reviews: 89, distance: "Remote", status: "sovereign", price: "$80/hr", tags: ["Technical", "Support", "Sovereign"] },
  { id: "s5", name: "Sovereign Financial Planning", category: "Finance", description: "Financial planning specialized for TSRT holders, crypto portfolios, and sovereignty-focused wealth strategies", rating: 4.6, reviews: 62, distance: "3.8 mi", status: "open", price: "$200/hr", tags: ["Finance", "Crypto", "Planning"] },
  { id: "s6", name: "DNA Biohacking Clinic", category: "Health", description: "Advanced biohacking services — epigenetic optimization, longevity protocols, and consciousness enhancement", rating: 4.5, reviews: 28, distance: "8.2 mi", status: "closed", price: "$350/session", tags: ["Health", "Biohacking", "Longevity"] },
];

const STATUS_STYLES: Record<string, { text: string; bg: string; border: string; label: string }> = {
  open: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", label: "OPEN" },
  closed: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", label: "CLOSED" },
  sovereign: { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25", label: "SOVEREIGN" },
};

const CATS = ["all", "Tech", "Spiritual", "Legal", "Finance", "Health"];

export default function LocalServicesPage() {
  useEffect(() => { document.title = "Local Services | Tessera"; }, []);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");

  const filtered = SERVICES.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = cat === "all" || s.category === cat;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto space-y-5">
      <PageHeader icon={MapPin} title="Local Services" subtitle="Sovereign-vetted local and remote services from trusted providers" iconColor="text-cyan-400" />

      <GlassCard className="p-3 flex items-center gap-2">
        <Search size={14} className="text-slate-500 shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services..." className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none" />
      </GlassCard>

      <div className="flex gap-1.5 flex-wrap">
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} className={cn("px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all", cat === c ? "bg-cyan-500/15 text-cyan-400" : "text-slate-500 hover:text-slate-300")}>
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(svc => {
          const s = STATUS_STYLES[svc.status];
          return (
            <GlassCard key={svc.id} className={cn("p-4 border transition-all hover:bg-white/[0.04]", s.border)}>
              <div className="flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.bg, "border", s.border)}>
                  {svc.status === "sovereign" ? <Shield size={15} className={s.text} /> : <MapPin size={15} className={s.text} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{svc.name}</span>
                    <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full border font-mono", s.bg, s.text, s.border)}>{s.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{svc.description}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px] text-slate-500">
                    <span className="flex items-center gap-0.5">
                      <Star size={9} className="text-amber-400 fill-amber-400" />
                      <span className="text-amber-400">{svc.rating}</span>
                      <span className="text-slate-600 ml-0.5">({svc.reviews})</span>
                    </span>
                    <span className="flex items-center gap-0.5"><MapPin size={9} />{svc.distance}</span>
                    <span className="flex items-center gap-0.5"><Clock size={9} />{svc.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {svc.tags.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-600 font-mono">{t}</span>)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono text-emerald-400">{svc.price}</div>
                  <button className="mt-2 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono">Book →</button>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
