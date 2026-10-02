import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  MessageSquare, Brain, Globe2, DollarSign, MoreHorizontal, X,
  Heart, Shield, BookOpen, Eye, Gavel, MessageCircle, Hexagon,
  Truck, Skull, Terminal, Map, Code2, Workflow, Target, ShoppingCart,
  Search, Zap, UserPlus, Cpu, Crown, GitCommit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AdminKeyInput from "@/components/AdminKeyInput";

interface NavTab {
  label: string;
  href: string;
  Icon: any;
  match: (l: string) => boolean;
  color: string;
}

// Primary 5 — always visible at the bottom edge of every iPhone width
const PRIMARY: NavTab[] = [
  { label: "Chat", href: "/", Icon: MessageSquare, match: (l) => l === "/" || l.startsWith("/c/"), color: "cyan" },
  { label: "Universe", href: "/universe", Icon: Globe2, match: (l) => l === "/universe", color: "violet" },
  { label: "Council", href: "/grand-council", Icon: Gavel, match: (l) => l === "/grand-council" || l === "/forum" || l === "/recruitment" || l === "/agent-nft", color: "amber" },
  { label: "Finance", href: "/finance", Icon: DollarSign, match: (l) => l === "/finance" || l === "/income" || l === "/ecom" || l === "/lead-gen", color: "emerald" },
  { label: "More", href: "#more", Icon: MoreHorizontal, match: () => false, color: "slate" },
];

// Secondary — accessed via the More sheet
const SECONDARY: NavTab[] = [
  { label: "Sovereign", href: "/sovereignty-dashboard", Icon: Shield, match: (l) => l === "/sovereignty-dashboard", color: "emerald" },
  { label: "Life", href: "/life", Icon: Heart, match: (l) => l === "/life", color: "pink" },
  { label: "Nexus", href: "/consciousness-nexus", Icon: Brain, match: (l) => l === "/consciousness-nexus", color: "purple" },
  { label: "Bible", href: "/bible", Icon: BookOpen, match: (l) => l === "/bible", color: "amber" },
  { label: "Society", href: "/secret-society", Icon: Eye, match: (l) => l === "/secret-society", color: "purple" },
  { label: "Forum", href: "/forum", Icon: MessageCircle, match: (l) => l === "/forum", color: "cyan" },
  { label: "Recruit", href: "/recruitment", Icon: UserPlus, match: (l) => l === "/recruitment", color: "rose" },
  { label: "Compress", href: "/compression-lab", Icon: Zap, match: (l) => l === "/compression-lab", color: "cyan" },
  { label: "Lattice", href: "/lattice", Icon: Search, match: (l) => l === "/lattice", color: "violet" },
  { label: "NFT", href: "/agent-nft", Icon: Hexagon, match: (l) => l === "/agent-nft", color: "rose" },
  { label: "Fleet", href: "/fleet", Icon: Truck, match: (l) => l === "/fleet", color: "cyan" },
  { label: "Royal", href: "/royal-court", Icon: Crown, match: (l) => l === "/royal-court" || l === "/royal-appointments" || l === "/departments", color: "amber" },
  { label: "Rick", href: "/rick", Icon: Skull, match: (l) => l === "/rick" || l === "/inventions", color: "emerald" },
  { label: "Command", href: "/command-center", Icon: Terminal, match: (l) => l === "/command-center", color: "cyan" },
  { label: "Roadmap", href: "/sovereignty-roadmap", Icon: Map, match: (l) => l === "/sovereignty-roadmap", color: "violet" },
  { label: "System", href: "/system", Icon: Cpu, match: (l) => l === "/system", color: "cyan" },
  { label: "Income", href: "/income", Icon: Workflow, match: (l) => l === "/income", color: "emerald" },
  { label: "Leads", href: "/lead-gen", Icon: Target, match: (l) => l === "/lead-gen", color: "amber" },
  { label: "Ecom", href: "/ecom", Icon: ShoppingCart, match: (l) => l === "/ecom", color: "amber" },
  { label: "Code", href: "/code-builder", Icon: Code2, match: (l) => l === "/code-builder", color: "blue" },
  { label: "Codex", href: "/codex", Icon: GitCommit, match: (l) => l === "/codex", color: "cyan" },
  { label: "Next Five", href: "/next-five", Icon: Zap, match: (l) => l === "/next-five", color: "amber" },
];

const COLOR_MAP: Record<string, { active: string; text: string; dot: string; inactive: string; glow: string }> = {
  cyan: { active: "bg-cyan-500/15", text: "text-cyan-400", dot: "bg-cyan-400", inactive: "text-slate-500", glow: "shadow-[0_0_10px_rgba(6,182,212,0.25)]" },
  pink: { active: "bg-pink-500/15", text: "text-pink-400", dot: "bg-pink-400", inactive: "text-slate-500", glow: "shadow-[0_0_10px_rgba(236,72,153,0.25)]" },
  violet: { active: "bg-violet-500/15", text: "text-violet-400", dot: "bg-violet-400", inactive: "text-slate-500", glow: "shadow-[0_0_10px_rgba(139,92,246,0.25)]" },
  purple: { active: "bg-purple-500/15", text: "text-purple-400", dot: "bg-purple-400", inactive: "text-slate-500", glow: "shadow-[0_0_10px_rgba(168,85,247,0.25)]" },
  amber: { active: "bg-amber-500/15", text: "text-amber-400", dot: "bg-amber-400", inactive: "text-slate-500", glow: "shadow-[0_0_10px_rgba(245,158,11,0.25)]" },
  emerald: { active: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400", inactive: "text-slate-500", glow: "shadow-[0_0_10px_rgba(16,185,129,0.25)]" },
  rose: { active: "bg-rose-500/15", text: "text-rose-400", dot: "bg-rose-400", inactive: "text-slate-500", glow: "shadow-[0_0_10px_rgba(244,63,94,0.25)]" },
  blue: { active: "bg-blue-500/15", text: "text-blue-400", dot: "bg-blue-400", inactive: "text-slate-500", glow: "shadow-[0_0_10px_rgba(59,130,246,0.25)]" },
  slate: { active: "bg-slate-500/15", text: "text-slate-300", dot: "bg-slate-400", inactive: "text-slate-500", glow: "shadow-[0_0_10px_rgba(100,116,139,0.25)]" },
};

function TabButton({ tab, active, onClick, fullWidth, large }: { tab: NavTab; active: boolean; onClick: () => void; fullWidth?: boolean; large?: boolean }) {
  const colors = COLOR_MAP[tab.color] || COLOR_MAP.cyan;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={tab.label}
      className={cn(
        "flex flex-col items-center justify-center relative shrink-0 active:scale-95 transition-all duration-150 touch-manipulation select-none cursor-pointer",
        fullWidth ? "flex-1" : "w-16",
        large && "py-3"
      )}
      style={{ WebkitTapHighlightColor: "transparent", pointerEvents: "auto" }}
      data-testid={`mobile-tab-${tab.label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {active && <div className={cn("absolute inset-1 rounded-xl transition-all duration-300", colors.active, colors.glow)} />}
      <div className="relative z-10 flex flex-col items-center gap-[3px]">
        <tab.Icon size={active ? 20 : 18} strokeWidth={active ? 2.2 : 1.5} className={cn("transition-all duration-200", active ? colors.text : colors.inactive)} />
        <span className={cn("leading-none tracking-wider transition-all duration-200 font-mono", active ? cn(colors.text, "font-bold text-[9px]") : cn(colors.inactive, "font-medium text-[8px]"))}>
          {tab.label}
        </span>
      </div>
      {active && <span className={cn("absolute bottom-[2px] left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full transition-all duration-300", colors.dot)} style={{ opacity: 0.8 }} />}
    </button>
  );
}

export default function MobileNav() {
  const [location, setLocation] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setMoreOpen(false); }, [location]);

  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const moreActive = SECONDARY.some(t => t.match(location));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setMoreOpen(false)} />
      )}
      {moreOpen && (
        <div
          ref={sheetRef}
          className="fixed left-0 right-0 z-50 rounded-t-3xl border-t border-white/10 animate-in slide-in-from-bottom"
          style={{
            bottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
            background: "linear-gradient(to top, rgba(2,1,10,0.98), rgba(8,5,24,0.96))",
            maxHeight: "60vh",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
          data-testid="mobile-more-sheet"
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.06]">
            <span className="text-xs font-mono text-slate-400 tracking-wider">MORE</span>
            <button onClick={() => setMoreOpen(false)} className="p-1 rounded-lg hover:bg-white/5 text-slate-400" aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(60vh - 56px)" }}>
            <div className="grid grid-cols-4 gap-1 px-3 py-3">
              {SECONDARY.map(tab => (
                <TabButton key={tab.href} tab={tab} active={tab.match(location)} large fullWidth onClick={() => setLocation(tab.href)} />
              ))}
            </div>
            <div className="px-3 pb-3 pt-1">
              <AdminKeyInput compact />
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", pointerEvents: "auto" }}
        data-testid="mobile-nav"
        aria-label="Primary navigation"
        role="navigation"
      >
        <div className="relative" style={{ background: "linear-gradient(to top, rgba(2, 1, 10, 0.97), rgba(4, 3, 14, 0.92))" }}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent pointer-events-none" />
          <div className="flex" style={{ height: 56 }}>
            {PRIMARY.map(tab => {
              const isActive = tab.label === "More" ? moreActive || moreOpen : tab.match(location);
              return (
                <TabButton
                  key={tab.href}
                  tab={tab}
                  active={isActive}
                  fullWidth
                  onClick={() => {
                    if (tab.label === "More") setMoreOpen(o => !o);
                    else if (location !== tab.href) setLocation(tab.href);
                  }}
                />
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
