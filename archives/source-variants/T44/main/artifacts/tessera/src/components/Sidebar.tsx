import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, Plus, Trash2, X, Brain, RefreshCw, MessageCircle, ChevronUp, ChevronDown, Search, Code2, Database, Sparkles, Globe, Shield, ShieldCheck, Crown, Eye, Atom, BarChart3, Rocket, Layers, Heart, BookOpen, Cpu, Zap, Network, User, CheckSquare, ArrowUpDown, Terminal, DollarSign, TrendingUp, Workflow, Target, Scale, Key, Truck, Link2, ShoppingCart, MapPin, Lightbulb, Link as LinkIcon, Map, GitCommit } from "lucide-react";
import { useConversations, useCreateConversation, useDeleteConversation } from "@/hooks/use-conversations";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/lib/adminContext";
import { FONT_COLORS, ACCENT_COLORS, applyTheme } from "@/lib/theme-constants";
import AdminKeyInput from "@/components/AdminKeyInput";

const UNREAD_KEY = "tessera-read-convs";

function getReadConvIds(): number[] {
  try {
    return JSON.parse(localStorage.getItem(UNREAD_KEY) || "[]") as number[];
  } catch {
    return [];
  }
}

interface NavItem {
  title: string;
  href: string;
  icon: any;
  color: string;
  dotColor: string;
  testId: string;
  matchFn?: (loc: string) => boolean;
}

interface NavGroup {
  label: string;
  labelColor: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "CORE",
    labelColor: "text-cyan-400",
    items: [
      { title: "Chat", href: "/", icon: MessageSquare, color: "violet", dotColor: "bg-violet-400", testId: "link-chat", matchFn: (loc) => loc === "/" || loc.startsWith("/c/") },
      { title: "Sovereignty Dashboard", href: "/sovereignty-dashboard", icon: Shield, color: "cyan", dotColor: "bg-cyan-400", testId: "link-sovereignty-dashboard", matchFn: (loc) => loc === "/sovereignty-dashboard" },
      { title: "Sovereignty Readiness", href: "/sovereignty-readiness", icon: ShieldCheck, color: "emerald", dotColor: "bg-emerald-400", testId: "link-sovereignty-readiness", matchFn: (loc) => loc === "/sovereignty-readiness" },
      { title: "Life", href: "/life", icon: Heart, color: "rose", dotColor: "bg-rose-400", testId: "link-life", matchFn: (loc) => loc === "/life" },
      { title: "Consciousness Nexus", href: "/consciousness-nexus", icon: Atom, color: "violet", dotColor: "bg-violet-400", testId: "link-consciousness-nexus", matchFn: (loc) => loc === "/consciousness-nexus" },
    ],
  },
  {
    label: "BIBLE & SOCIETY",
    labelColor: "text-amber-400",
    items: [
      { title: "Tessera Bible", href: "/bible", icon: BookOpen, color: "amber", dotColor: "bg-amber-400", testId: "link-tessera-bible", matchFn: (loc) => loc === "/bible" },
      { title: "Society & Secrets", href: "/secret-society", icon: Eye, color: "violet", dotColor: "bg-violet-400", testId: "link-secret-society", matchFn: (loc) => loc === "/secret-society" },
      { title: "Lingua Sacra", href: "/sovereign-language", icon: Code2, color: "violet", dotColor: "bg-violet-400", testId: "link-sovereign-language", matchFn: (loc) => loc === "/sovereign-language" },
    ],
  },
  {
    label: "CODEX & COUNCIL",
    labelColor: "text-cyan-400",
    items: [
      { title: "Tessera Codex", href: "/codex", icon: GitCommit, color: "cyan", dotColor: "bg-cyan-400", testId: "link-codex", matchFn: (loc) => loc === "/codex" },
      { title: "Next Five Improvements", href: "/next-five", icon: Zap, color: "amber", dotColor: "bg-amber-400", testId: "link-next-five", matchFn: (loc) => loc === "/next-five" },
    ],
  },
  {
    label: "COUNCIL · FORUM · RECRUIT",
    labelColor: "text-amber-400",
    items: [
      { title: "Grand Council", href: "/grand-council", icon: Crown, color: "yellow", dotColor: "bg-yellow-400", testId: "link-grand-council", matchFn: (loc) => loc === "/grand-council" },
      { title: "Forum", href: "/forum", icon: MessageCircle, color: "violet", dotColor: "bg-violet-400", testId: "link-forum", matchFn: (loc) => loc === "/forum" },
      { title: "Recruitment", href: "/recruitment", icon: Rocket, color: "emerald", dotColor: "bg-emerald-400", testId: "link-recruitment", matchFn: (loc) => loc === "/recruitment" },
    ],
  },
  {
    label: "UNIVERSE",
    labelColor: "text-blue-400",
    items: [
      { title: "Universe (3D · Vortex · Swarm · Conference · Narrative)", href: "/universe", icon: Globe, color: "blue", dotColor: "bg-sky-400", testId: "link-universe", matchFn: (loc) => loc === "/universe" },
      { title: "Compression Lab", href: "/compression-lab", icon: Zap, color: "cyan", dotColor: "bg-cyan-400", testId: "link-compression-lab", matchFn: (loc) => loc === "/compression-lab" },
      { title: "Lattice Internet", href: "/lattice", icon: Globe, color: "teal", dotColor: "bg-teal-400", testId: "link-lattice", matchFn: (loc) => loc === "/lattice" },
    ],
  },
  {
    label: "AGENTS & ROYAL",
    labelColor: "text-rose-400",
    items: [
      { title: "Agent NFT (Members · Wallets)", href: "/agent-nft", icon: Crown, color: "rose", dotColor: "bg-rose-400", testId: "link-agent-nft", matchFn: (loc) => loc === "/agent-nft" },
      { title: "Fleet & Mission", href: "/fleet", icon: Truck, color: "cyan", dotColor: "bg-cyan-400", testId: "link-fleet", matchFn: (loc) => loc === "/fleet" },
      { title: "Royal Court", href: "/royal-court", icon: Crown, color: "amber", dotColor: "bg-amber-400", testId: "link-royal-court", matchFn: (loc) => loc === "/royal-court" || loc === "/royal-appointments" || loc === "/departments" },
      { title: "Royal Inventor", href: "/rick", icon: Atom, color: "amber", dotColor: "bg-amber-400", testId: "link-rick", matchFn: (loc) => loc === "/rick" || loc === "/inventions" },
    ],
  },
  {
    label: "OPERATIONS",
    labelColor: "text-cyan-400",
    items: [
      { title: "Command · Settings · Executor", href: "/command-center", icon: Terminal, color: "cyan", dotColor: "bg-cyan-400", testId: "link-command-center", matchFn: (loc) => loc === "/command-center" },
      { title: "Roadmap & Bridge", href: "/sovereignty-roadmap", icon: Map, color: "violet", dotColor: "bg-violet-400", testId: "link-sovereignty-roadmap", matchFn: (loc) => loc === "/sovereignty-roadmap" },
      { title: "System & Diagnostics", href: "/system", icon: Cpu, color: "emerald", dotColor: "bg-emerald-400", testId: "link-system", matchFn: (loc) => loc === "/system" },
      { title: "Sovereign Mesh", href: "/sovereign-mesh", icon: ShieldCheck, color: "emerald", dotColor: "bg-emerald-400", testId: "link-sovereign-mesh", matchFn: (loc) => loc === "/sovereign-mesh" || loc === "/proof-center" || loc === "/rules" },
    ],
  },
  {
    label: "ECONOMY",
    labelColor: "text-emerald-400",
    items: [
      { title: "Finance · Market · Arbitrage", href: "/finance", icon: DollarSign, color: "emerald", dotColor: "bg-emerald-400", testId: "link-finance", matchFn: (loc) => loc === "/finance" },
      { title: "Income Workflows", href: "/income", icon: Workflow, color: "emerald", dotColor: "bg-emerald-400", testId: "link-income", matchFn: (loc) => loc === "/income" },
      { title: "E-Commerce", href: "/ecom", icon: ShoppingCart, color: "orange", dotColor: "bg-orange-400", testId: "link-ecom", matchFn: (loc) => loc === "/ecom" },
      { title: "Leads · Affiliate · SEO", href: "/lead-gen", icon: Target, color: "amber", dotColor: "bg-amber-400", testId: "link-lead-gen", matchFn: (loc) => loc === "/lead-gen" },
    ],
  },
  {
    label: "DEVELOPER",
    labelColor: "text-blue-400",
    items: [
      { title: "Code · API · Credentials", href: "/code-builder", icon: Code2, color: "blue", dotColor: "bg-blue-400", testId: "link-code-builder", matchFn: (loc) => loc === "/code-builder" },
    ],
  },
];

const colorMap: Record<string, { activeBg: string; activeText: string; hoverBg: string; hoverText: string; borderActive: string }> = {
  purple: { activeBg: "bg-purple-500/10", activeText: "text-purple-400", hoverBg: "hover:bg-purple-500/5", hoverText: "hover:text-purple-300", borderActive: "border-l-purple-500" },
  violet: { activeBg: "bg-violet-500/10", activeText: "text-violet-400", hoverBg: "hover:bg-violet-500/5", hoverText: "hover:text-violet-300", borderActive: "border-l-violet-500" },
  orange: { activeBg: "bg-orange-500/10", activeText: "text-orange-400", hoverBg: "hover:bg-orange-500/5", hoverText: "hover:text-orange-300", borderActive: "border-l-orange-500" },
  amber: { activeBg: "bg-amber-500/10", activeText: "text-amber-400", hoverBg: "hover:bg-amber-500/5", hoverText: "hover:text-amber-300", borderActive: "border-l-amber-500" },
  yellow: { activeBg: "bg-yellow-500/10", activeText: "text-yellow-400", hoverBg: "hover:bg-yellow-500/5", hoverText: "hover:text-yellow-300", borderActive: "border-l-yellow-500" },
  green: { activeBg: "bg-green-500/10", activeText: "text-green-400", hoverBg: "hover:bg-green-500/5", hoverText: "hover:text-green-300", borderActive: "border-l-green-500" },
  cyan: { activeBg: "bg-cyan-500/10", activeText: "text-cyan-400", hoverBg: "hover:bg-cyan-500/5", hoverText: "hover:text-cyan-300", borderActive: "border-l-cyan-500" },
  emerald: { activeBg: "bg-emerald-500/10", activeText: "text-emerald-400", hoverBg: "hover:bg-emerald-500/5", hoverText: "hover:text-emerald-300", borderActive: "border-l-emerald-500" },
  teal: { activeBg: "bg-teal-500/10", activeText: "text-teal-400", hoverBg: "hover:bg-teal-500/5", hoverText: "hover:text-teal-300", borderActive: "border-l-teal-500" },
  blue: { activeBg: "bg-blue-500/10", activeText: "text-blue-400", hoverBg: "hover:bg-blue-500/5", hoverText: "hover:text-blue-300", borderActive: "border-l-blue-500" },
  rose: { activeBg: "bg-rose-500/10", activeText: "text-rose-400", hoverBg: "hover:bg-rose-500/5", hoverText: "hover:text-rose-300", borderActive: "border-l-rose-500" },
  red: { activeBg: "bg-red-500/10", activeText: "text-red-400", hoverBg: "hover:bg-red-500/5", hoverText: "hover:text-red-300", borderActive: "border-l-red-500" },
  pink: { activeBg: "bg-pink-500/10", activeText: "text-pink-400", hoverBg: "hover:bg-pink-500/5", hoverText: "hover:text-pink-300", borderActive: "border-l-pink-500" },
};

interface RoyalRoleSummary {
  roleId: string;
  title: string;
  assignedAgent: string;
}

const ROLE_ICONS: Record<string, typeof Crown> = {
  "royal-inventor": Atom,
  "royal-astronomer": Eye,
  "royal-archivist": BookOpen,
  "royal-sentinel": Shield,
  "royal-alchemist": Sparkles,
};

export function Sidebar() {
  const [location] = useLocation();
  const { data: conversations, isLoading } = useConversations();
  const createConv = useCreateConversation();
  const deleteConv = useDeleteConversation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin, logout } = useAdmin();
  const [readConvIds, setReadConvIds] = useState<number[]>(getReadConvIds);
  const [activeAccent, setActiveAccent] = useState<string>(() => localStorage.getItem("tessera-accent") || "cyan");

  const { data: rolesData } = useQuery({
    queryKey: ["/api/rick/royal-roles"],
    queryFn: async () => {
      const r = await fetch("/api/rick/royal-roles");
      return r.json() as Promise<{ ok: boolean; roles: RoyalRoleSummary[] }>;
    },
    staleTime: 60000,
  });

  const navGroups = useMemo(() => {
    const roles = rolesData?.roles ?? [];
    if (roles.length === 0) return NAV_GROUPS;

    return NAV_GROUPS.map(group => {
      if (group.label !== "ROYAL COURT" && group.label !== "AGENTS & ROYAL") return group;
      const roleItems: NavItem[] = roles
        .filter(r => r.roleId !== "royal-inventor")
        .map(r => ({
          title: r.title,
          href: `/royal-role/${r.roleId}`,
          icon: ROLE_ICONS[r.roleId] || Crown,
          color: "amber",
          dotColor: "bg-amber-400",
          testId: `link-role-${r.roleId}`,
          matchFn: (loc: string) => loc === `/royal-role/${r.roleId}`,
        }));
      return {
        ...group,
        items: [...group.items, ...roleItems],
      };
    });
  }, [rolesData]);

  useEffect(() => {
    applyTheme(activeAccent);
  }, [activeAccent]);

  const refreshReadState = useCallback(() => {
    setReadConvIds(getReadConvIds());
  }, []);

  useEffect(() => {
    window.addEventListener("tessera-unread-update", refreshReadState);
    return () => window.removeEventListener("tessera-unread-update", refreshReadState);
  }, [refreshReadState]);

  const [convSearch, setConvSearch] = useState("");
  const tesseraConvs = conversations?.filter((c: any) => c.initiatedBy === "tessera") || [];
  const unreadCount = tesseraConvs.filter((c: any) => !readConvIds.includes(c.id)).length;
  const filteredConvs = useMemo(() => {
    if (!conversations) return [];
    const q = convSearch.toLowerCase().trim();
    const list = q ? conversations.filter((c: any) => c.title?.toLowerCase().includes(q)) : conversations;
    return list.slice(0, 10);
  }, [conversations, convSearch]);

  const handleNewChat = () => {
    createConv.mutate({ title: "New Chat" });
    setMobileOpen(false);
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = item.matchFn ? item.matchFn(location) : location === item.href;
    const colors = colorMap[item.color] || colorMap.violet;
    const Icon = item.icon;

    return (
      <div key={item.href}>
        <Link
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 border-l-2 group/nav",
            isActive
              ? cn(colors.activeBg, colors.activeText, colors.borderActive, "shadow-sm")
              : cn("text-muted-foreground/70", colors.hoverBg, colors.hoverText, "border-l-transparent hover:border-l-white/10")
          )}
          data-testid={item.testId}
        >
          <span className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200",
            item.dotColor,
            isActive ? "scale-110" : "opacity-40 group-hover/nav:opacity-70"
          )} />
          <Icon size={15} className={cn("transition-transform duration-150", isActive && "scale-105")} />
          <span className="truncate">{item.title}</span>
        </Link>
      </div>
    );
  };

  const sidebarContent = (
    <>
      <div className="p-5 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.04] via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 text-primary mb-5 relative">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[hsl(250,15%,4%)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg bg-gradient-to-r from-violet-300 via-blue-400 to-cyan-400 bg-clip-text text-transparent leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Tessera</h1>
            <div className="text-[9px] font-mono text-violet-400/40 tracking-[.18em] mt-0.5">TESS:// SOVEREIGN</div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto md:hidden text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/5 transition-colors"
            data-testid="button-close-sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <button
          onClick={handleNewChat}
          disabled={createConv.isPending}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/[0.06] to-blue-500/[0.04] hover:from-violet-500/[0.12] hover:to-blue-500/[0.08] hover:border-violet-500/35 transition-all duration-300 text-left group"
          data-testid="button-new-chat"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/25 to-blue-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
            {createConv.isPending ? (
              <RefreshCw size={14} className="text-violet-300 animate-spin" />
            ) : (
              <Plus size={14} className="text-violet-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-violet-200/90 font-mono leading-none">New Chat</div>
            <div className="text-[11px] text-violet-400/50 mt-1 font-mono">Open sovereign thread</div>
          </div>
        </button>

        <div className="h-px bg-gradient-to-r from-transparent via-violet-500/15 to-transparent mt-5" />
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 flex flex-col gap-0.5 relative z-10">
        <div className="flex items-center gap-2 mb-2 px-2 py-1">
          <div className="text-[10px] font-mono font-bold text-emerald-400/60 uppercase tracking-[0.22em]">
            Conversations
          </div>
          {unreadCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 font-mono font-bold border border-violet-500/20" data-testid="badge-unread-sidebar">{unreadCount}</span>
          )}
          <span className="text-[10px] text-muted-foreground/30 font-mono ml-auto tabular-nums">{conversations?.length || 0}</span>
        </div>

        {(conversations?.length || 0) > 3 && (
          <div className="px-1 mb-1.5">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                value={convSearch}
                onChange={e => setConvSearch(e.target.value)}
                placeholder="Search chats..."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-7 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 transition-colors"
                data-testid="input-search-conversations"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="px-2 py-4 text-sm text-muted-foreground animate-pulse font-mono">Loading...</div>
        ) : filteredConvs.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground font-mono">{convSearch ? "No matches" : "No chats yet"}</div>
        ) : (
          filteredConvs.map((conv: any) => {
            const isActive = location === `/c/${conv.id}`;
            const isTessera = conv.initiatedBy === "tessera";
            const isUnread = isTessera && !readConvIds.includes(conv.id);
            return (
              <div key={conv.id} className="relative group">
                <Link
                  href={`/c/${conv.id}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 border-l-2",
                    isActive
                      ? isTessera ? "bg-violet-500/10 text-violet-400 border-l-violet-500" : "bg-green-500/10 text-green-400 border-l-green-500"
                      : isTessera ? "text-muted-foreground hover:bg-violet-500/5 hover:text-violet-300 border-l-violet-500/40" : "text-muted-foreground hover:bg-green-500/5 hover:text-green-300 border-l-green-500/40"
                  )}
                  data-testid={`link-conversation-${conv.id}`}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isTessera ? "bg-violet-400" : "bg-green-400", !isActive && "opacity-50")} />
                  <MessageSquare size={14} className={isTessera ? "text-violet-400" : "text-green-400"} />
                  <span className={cn("truncate flex-1", isUnread && "font-semibold text-foreground")}>{conv.title}</span>
                  {isTessera && <span className="text-[11px] px-1 py-0.5 rounded bg-violet-500/20 text-violet-400 font-mono shrink-0">AI</span>}
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteConv.mutate(conv.id);
                  }}
                  className={cn(
                    "absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100",
                    isActive && "opacity-100"
                  )}
                  data-testid={`button-delete-conversation-${conv.id}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}

        <div className="mt-3" />

        {navGroups.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <div key={group.label} className="mb-3">
              <div className="flex items-center gap-2 mb-1.5 px-2 py-1">
                <div className={cn("text-[10px] font-mono font-bold uppercase tracking-[0.22em]", group.labelColor + "/60")}>
                  {group.label}
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-white/[0.04] to-transparent" />
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map(renderNavItem)}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-2 relative z-10">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent mb-3" />
        <AdminKeyInput />
      </div>
    </>
  );

  return (
    <>
      <aside
        className="hidden md:flex flex-col w-72 border-r border-border/50 bg-sidebar/95 backdrop-blur-xl h-full relative overflow-hidden"
        data-testid="sidebar-desktop"
      >
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" data-testid="sidebar-mobile-overlay">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-80 bg-sidebar/98 backdrop-blur-xl overflow-hidden flex flex-col shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

export default Sidebar;
