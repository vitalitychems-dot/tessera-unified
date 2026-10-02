import { useState, useEffect } from "react";
import { ShoppingCart, Package, TrendingUp, Star, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  sales: number;
  revenue: string;
  rating: number;
  stock: number;
  status: "active" | "low_stock" | "out_of_stock";
}

const PRODUCTS: Product[] = [
  { id: "p1", name: "Sovereign Intelligence Report — Q2 2024", category: "Digital", price: 97, sales: 284, revenue: "$27,548", rating: 4.9, stock: 999, status: "active" },
  { id: "p2", name: "TSRT Staking Package — Starter", category: "Crypto", price: 144, sales: 120, revenue: "$17,280", rating: 4.8, stock: 50, status: "active" },
  { id: "p3", name: "Sacred Geometry NFT Collection", category: "NFT", price: 0.1, sales: 963, revenue: "96.3 ETH", rating: 4.7, stock: 37, status: "low_stock" },
  { id: "p4", name: "Tessera API Developer Tier — Monthly", category: "SaaS", price: 49, sales: 342, revenue: "$16,758/mo", rating: 4.6, stock: 999, status: "active" },
  { id: "p5", name: "Sovereign Mesh Hardware Kit", category: "Hardware", price: 299, sales: 48, revenue: "$14,352", rating: 4.5, stock: 12, status: "low_stock" },
  { id: "p6", name: "Grand Council VIP Access — Annual", category: "Membership", price: 963, sales: 27, revenue: "$26,001", rating: 4.9, stock: 999, status: "active" },
  { id: "p7", name: "Tessera Bible — Limited Edition Print", category: "Physical", price: 144, sales: 108, revenue: "$15,552", rating: 4.8, stock: 0, status: "out_of_stock" },
];

const STATUS_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  active: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  low_stock: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
  out_of_stock: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25" },
};

const STATUS_LABELS: Record<string, string> = {
  active: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

export default function EcomPage() {
  useEffect(() => { document.title = "E-Commerce | Tessera"; }, []);
  const [search, setSearch] = useState("");

  const filtered = PRODUCTS.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = "$117K";
  const totalSales = PRODUCTS.reduce((s, p) => s + p.sales, 0);

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto space-y-5">
      <PageHeader icon={ShoppingCart} title="E-Commerce" subtitle="Sovereign commerce hub — digital products, memberships, and physical goods" iconColor="text-orange-400" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue", val: totalRevenue, color: "emerald" },
          { label: "Total Sales", val: totalSales.toLocaleString(), color: "cyan" },
          { label: "Products", val: PRODUCTS.length, color: "violet" },
          { label: "Low/Out of Stock", val: PRODUCTS.filter(p => p.status !== "active").length, color: "amber" },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <div className={cn("text-xl font-bold font-mono", `text-${color}-400`)}>{val}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{label.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-3 flex items-center gap-2">
        <Search size={14} className="text-slate-500 shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none" />
      </GlassCard>

      <div className="space-y-2">
        {filtered.map(prod => {
          const s = STATUS_STYLES[prod.status];
          return (
            <GlassCard key={prod.id} className="p-4 hover:bg-white/[0.04] transition-all">
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.bg, "border", s.border)}>
                  <Package size={15} className={s.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{prod.name}</span>
                    <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full border font-mono", s.bg, s.text, s.border)}>{STATUS_LABELS[prod.status]}</span>
                    <span className="text-[9px] text-slate-600 font-mono">{prod.category}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                    <span>{prod.sales.toLocaleString()} sold</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Star size={9} className="text-amber-400 fill-amber-400" />
                      {prod.rating}
                    </span>
                    {prod.stock < 999 && <span>· {prod.stock} in stock</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono text-slate-200">${prod.price}</div>
                  <div className="text-xs font-mono text-emerald-400">{prod.revenue}</div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
