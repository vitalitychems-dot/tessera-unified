import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import {
  ShoppingBag, TrendingUp, Mail, FileText, Search, Globe, BarChart3,
  Loader2, CheckCircle2, AlertCircle, Zap, Users, Target, Activity,
  Package, DollarSign, Eye, Send, PenTool, RefreshCw, ExternalLink,
  Megaphone, ArrowUpRight, ShoppingCart, Palette, Clock
} from "lucide-react";

const VITALITY_URL = "https://www.vitalitysupply.net";
const STORE_DOMAIN = "vitalitysupply.myshopify.com";

interface ShopifyStatus {
  connected: boolean;
  products?: number;
  orders?: number;
  revenue?: number;
  monthlyRevenue?: number;
}

interface BlogPost {
  title: string;
  slug: string;
  publishedAt?: string;
  category: string;
  wordCount?: number;
  humanScore?: number;
  url?: string;
}

interface AgentTask {
  id: string;
  agent: string;
  task: string;
  status: "running" | "complete" | "pending" | "error";
  lastRun?: string;
  result?: string;
}

function MetricCard({ label, value, color = "text-foreground", sub, icon: Icon }: { label: string; value: string | number; color?: string; sub?: string; icon?: any }) {
  return (
    <div className="bg-background/40 border border-border/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={12} className="text-muted-foreground" />}
        <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn("text-xl font-bold font-mono", color)}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{sub}</div>}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-cyan-400 animate-pulse",
    complete: "bg-green-400",
    error: "bg-red-400",
    pending: "bg-amber-400",
  };
  return <div className={cn("w-2 h-2 rounded-full shrink-0", colors[status] || "bg-gray-400")} />;
}

export default function VitalityPage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "Vitality Supply | Tessera"; }, []);
  const queryClient = useQueryClient();
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [autoRunning, setAutoRunning] = useState(false);
  const activeTab = "all" as any;

  const addLog = useCallback((msg: string) => {
    setExecutionLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 200));
  }, []);

  const { data: shopifyStatus } = useQuery<any>({
    queryKey: ["/api/realification/shopify"],
    refetchInterval: 60000,
  });

  const { data: blogPosts } = useQuery<any>({
    queryKey: ["/api/blog/posts"],
    refetchInterval: 60000,
  });

  const { data: seoStatus } = useQuery<any>({
    queryKey: ["/api/shopify/seo/status"],
    refetchInterval: 60000,
  });

  const { data: outreachStats } = useQuery<any>({
    queryKey: ["/api/outreach/stats"],
    refetchInterval: 60000,
  });

  const { data: incomeProcesses } = useQuery<any>({
    queryKey: ["/api/income/processes"],
    refetchInterval: 30000,
  });

  const siteAudit = useMutation({
    mutationFn: async () => {
      addLog("Running full SEO audit on vitalitysupply.net...");
      const res = await apiRequest("POST", "/api/seo/site-audit", { url: VITALITY_URL });
      return res.json();
    },
    onSuccess: (data) => addLog(`Audit complete: Score ${data.seoScore}/100`),
    onError: (err: any) => addLog(`Audit failed: ${err.message}`),
  });

  const publishBlog = useMutation({
    mutationFn: async () => {
      addLog("Generating and publishing SEO blog post to Shopify...");
      const res = await apiRequest("POST", "/api/seo/generate-blog-posts", {
        targetUrl: VITALITY_URL,
        keywords: ["natural supplements", "health wellness", "vitality supply"],
        count: 1,
        style: "human",
        wordCount: 1500,
      });
      return res.json();
    },
    onSuccess: (data) => {
      addLog(`Blog post generated: ${data.posts?.[0]?.title || "Success"}`);
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
    },
    onError: (err: any) => addLog(`Blog publish failed: ${err.message}`),
  });

  const runCompetitorAnalysis = useMutation({
    mutationFn: async () => {
      addLog("Analyzing VitalitySupply competitors...");
      const res = await apiRequest("POST", "/api/seo/competitor-audit", { url: VITALITY_URL, depth: "full" });
      return res.json();
    },
    onSuccess: () => addLog("Competitor analysis complete"),
    onError: (err: any) => addLog(`Competitor analysis failed: ${err.message}`),
  });

  const generateAds = useMutation({
    mutationFn: async () => {
      addLog("Generating ad creatives for VitalitySupply...");
      const res = await apiRequest("POST", "/api/seo/generate-ads", {
        product: "VitalitySupply Health Supplements",
        url: VITALITY_URL,
        platforms: ["google", "facebook", "tiktok"],
      });
      return res.json();
    },
    onSuccess: (data) => addLog(`Ad creatives generated for ${Object.keys(data).length} platforms`),
    onError: (err: any) => addLog(`Ad generation failed: ${err.message}`),
  });

  const executePlan = useMutation({
    mutationFn: async () => {
      addLog("Generating full marketing execution plan...");
      const res = await apiRequest("POST", "/api/seo/execute-plan", { url: VITALITY_URL, autoExecute: true });
      return res.json();
    },
    onSuccess: (data) => addLog(`Marketing plan generated with ${data.blogTopics?.length || 0} blog topics`),
    onError: (err: any) => addLog(`Plan generation failed: ${err.message}`),
  });

  const storeAudit = useMutation({
    mutationFn: async () => {
      addLog("Running full Shopify store audit...");
      const res = await apiRequest("POST", "/api/shopify/audit", { url: VITALITY_URL });
      return res.json();
    },
    onSuccess: (data) => addLog(`Store audit complete: ${data.score || "N/A"}/100`),
    onError: (err: any) => addLog(`Store audit failed: ${err.message}`),
  });

  const findLeads = useMutation({
    mutationFn: async () => {
      addLog("Finding outreach leads for guest posting...");
      const res = await apiRequest("POST", "/api/seo/find-leads", { query: "health wellness supplement blog guest post", count: 20 });
      return res.json();
    },
    onSuccess: (data) => addLog(`Found ${data.leads?.length || 0} outreach leads`),
    onError: (err: any) => addLog(`Lead search failed: ${err.message}`),
  });

  const runFullAuto = useCallback(async () => {
    setAutoRunning(true);
    addLog("=== FULL AUTONOMOUS VITALITY ENGINE STARTED ===");
    try {
      addLog("Step 1/6: Site audit...");
      await siteAudit.mutateAsync();
      await new Promise(r => setTimeout(r, 3000));

      addLog("Step 2/6: Competitor analysis...");
      await runCompetitorAnalysis.mutateAsync();
      await new Promise(r => setTimeout(r, 3000));

      addLog("Step 3/6: Marketing plan generation...");
      await executePlan.mutateAsync();
      await new Promise(r => setTimeout(r, 3000));

      addLog("Step 4/6: Blog post generation & publishing...");
      await publishBlog.mutateAsync();
      await new Promise(r => setTimeout(r, 3000));

      addLog("Step 5/6: Ad creative generation...");
      await generateAds.mutateAsync();
      await new Promise(r => setTimeout(r, 3000));

      addLog("Step 6/6: Guest post outreach lead discovery...");
      await findLeads.mutateAsync();

      addLog("=== ALL 6 STEPS COMPLETE — AUTONOMOUS ENGINE CYCLING ===");
    } catch (err: any) {
      addLog(`Auto-execute error: ${err.message}`);
    } finally {
      setAutoRunning(false);
    }
  }, []);

  const posts = Array.isArray(blogPosts) ? blogPosts : blogPosts?.posts || [];
  const shopify = shopifyStatus || {};
  const streams = Array.isArray(incomeProcesses) ? incomeProcesses : [];
  const vitalityStreams = streams.filter((s: any) => {
    const n = (s.name || s.type || s.method || "").toLowerCase();
    return n.includes("shopify") || n.includes("seo") || n.includes("blog") || n.includes("affiliate") || n.includes("vitality") || n.includes("content") || n.includes("email");
  });

  const isAnyLoading = siteAudit.isPending || publishBlog.isPending || runCompetitorAnalysis.isPending || generateAds.isPending || executePlan.isPending || storeAudit.isPending || findLeads.isPending;

  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { id: "seo" as const, label: "SEO & Content", icon: Search },
    { id: "email" as const, label: "Email & Outreach", icon: Mail },
    { id: "traffic" as const, label: "Traffic & Funnels", icon: TrendingUp },
    { id: "agents" as const, label: "Agent Tasks", icon: Zap },
  ];

  return (
    <div className={embedded ? "flex-1 overflow-auto" : "flex h-full"} data-testid="page-vitality">
      {!embedded && null}
      <div className="flex-1 overflow-y-auto tessera-page backdrop-blur-md" data-scroll-container>
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
              <ShoppingBag size={20} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">VitalitySupply.net</h1>
              <p className="text-xs text-muted-foreground">Autonomous Shopify engine for organic traffic, SEO, and conversions</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <a href={VITALITY_URL} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 hover:underline">
                <ExternalLink size={12} /> Live Site
              </a>
              <button
                onClick={runFullAuto}
                disabled={autoRunning}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                data-testid="button-auto-all"
              >
                {autoRunning ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                {autoRunning ? "Running..." : "Auto-Execute All"}
              </button>
            </div>
          </div>
          
        </div>

        <div className="p-6 max-w-5xl mx-auto space-y-6">
          {true && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard label="Products" value={shopify.products || shopify.productCount || "..."} color="text-emerald-400" icon={Package} sub="Synced from Shopify" />
                <MetricCard label="Orders" value={shopify.orders || shopify.orderCount || "..."} color="text-cyan-400" icon={ShoppingCart} sub={shopify.monthlyRevenue ? `$${Number(shopify.monthlyRevenue).toFixed(2)}/mo` : "Tracking"} />
                <MetricCard label="Blog Posts" value={posts.length} color="text-violet-400" icon={FileText} sub="Published SEO content" />
                <MetricCard label="Active Streams" value={vitalityStreams.length} color="text-amber-400" icon={Activity} sub="Income processes running" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-emerald-500/20 rounded-xl bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag size={14} className="text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-400">Store Status</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Shopify Connected", ok: !!shopify.connected || !!shopify.products },
                      { label: "SEO Bot Active", ok: !!seoStatus?.active },
                      { label: "Blog Engine Running", ok: posts.length > 0 },
                      { label: "Email Marketing", ok: !!outreachStats?.campaignCount },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2 text-xs font-mono">
                        {item.ok ? <CheckCircle2 size={14} className="text-green-400" /> : <AlertCircle size={14} className="text-amber-400" />}
                        <span className={item.ok ? "text-green-400" : "text-amber-400"}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => storeAudit.mutate()}
                    disabled={isAnyLoading}
                    className="mt-3 w-full px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                    data-testid="button-store-audit"
                  >
                    {storeAudit.isPending ? <Loader2 size={12} className="animate-spin" /> : <Palette size={12} />}
                    Run Store Audit
                  </button>
                </div>

                <div className="border border-cyan-500/20 rounded-xl bg-cyan-500/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Megaphone size={14} className="text-cyan-400" />
                    <span className="text-sm font-bold text-cyan-400">Quick Actions</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => siteAudit.mutate()} disabled={isAnyLoading}
                      className="px-3 py-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-mono hover:bg-violet-500/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                      data-testid="button-seo-audit">
                      {siteAudit.isPending ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} SEO Audit
                    </button>
                    <button onClick={() => publishBlog.mutate()} disabled={isAnyLoading}
                      className="px-3 py-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono hover:bg-green-500/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                      data-testid="button-publish-blog">
                      {publishBlog.isPending ? <Loader2 size={12} className="animate-spin" /> : <PenTool size={12} />} Publish Blog
                    </button>
                    <button onClick={() => runCompetitorAnalysis.mutate()} disabled={isAnyLoading}
                      className="px-3 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono hover:bg-cyan-500/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                      data-testid="button-competitors">
                      {runCompetitorAnalysis.isPending ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />} Competitors
                    </button>
                    <button onClick={() => generateAds.mutate()} disabled={isAnyLoading}
                      className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono hover:bg-amber-500/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                      data-testid="button-gen-ads">
                      {generateAds.isPending ? <Loader2 size={12} className="animate-spin" /> : <Megaphone size={12} />} Gen Ads
                    </button>
                    <button onClick={() => executePlan.mutate()} disabled={isAnyLoading}
                      className="px-3 py-2.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-mono hover:bg-fuchsia-500/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                      data-testid="button-marketing-plan">
                      {executePlan.isPending ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />} Marketing Plan
                    </button>
                    <button onClick={() => findLeads.mutate()} disabled={isAnyLoading}
                      className="px-3 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono hover:bg-rose-500/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                      data-testid="button-find-leads">
                      {findLeads.isPending ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Outreach Leads
                    </button>
                  </div>
                </div>
              </div>

              {storeAudit.data && (
                <div className="border border-emerald-500/20 rounded-xl bg-emerald-500/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-emerald-500/15 flex items-center gap-2">
                    <Palette size={14} className="text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-400">Store Audit Results</span>
                  </div>
                  <div className="p-4 text-xs text-foreground/80 font-mono whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-relaxed">
                    {typeof (storeAudit.data as any)?.audit === "string" ? (storeAudit.data as any).audit : JSON.stringify(storeAudit.data, null, 2)}
                  </div>
                </div>
              )}
            </>
          )}

          {true && (
            <>
              <div className="border border-violet-500/20 rounded-xl bg-violet-500/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Search size={16} className="text-violet-400" />
                  <span className="text-sm font-bold text-violet-400">SEO Performance</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button onClick={() => siteAudit.mutate()} disabled={isAnyLoading}
                    className="px-3 py-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-mono hover:bg-violet-500/20 disabled:opacity-40 flex items-center gap-1.5">
                    {siteAudit.isPending ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />} Run Full Audit
                  </button>
                  <button onClick={() => runCompetitorAnalysis.mutate()} disabled={isAnyLoading}
                    className="px-3 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono hover:bg-cyan-500/20 disabled:opacity-40 flex items-center gap-1.5">
                    {runCompetitorAnalysis.isPending ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />} Competitor Analysis
                  </button>
                </div>
                {siteAudit.data && (
                  <div className="text-xs text-foreground/80 font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto leading-relaxed border-t border-violet-500/15 pt-3 mt-3">
                    {JSON.stringify(siteAudit.data, null, 2)}
                  </div>
                )}
                {runCompetitorAnalysis.data && (
                  <div className="text-xs text-foreground/80 font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto leading-relaxed border-t border-cyan-500/15 pt-3 mt-3">
                    {typeof (runCompetitorAnalysis.data as any)?.analysis === "string" ? (runCompetitorAnalysis.data as any).analysis : JSON.stringify(runCompetitorAnalysis.data, null, 2)}
                  </div>
                )}
              </div>

              <div className="border border-green-500/20 rounded-xl bg-green-500/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-green-500/15 flex items-center gap-2">
                  <FileText size={14} className="text-green-400" />
                  <span className="text-sm font-bold text-green-400">Published Blog Posts</span>
                  <span className="ml-auto text-[11px] text-muted-foreground font-mono">{posts.length} posts</span>
                  <button onClick={() => publishBlog.mutate()} disabled={isAnyLoading}
                    className="px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-mono hover:bg-green-500/20 disabled:opacity-40 flex items-center gap-1">
                    {publishBlog.isPending ? <Loader2 size={10} className="animate-spin" /> : <PenTool size={10} />} New Post
                  </button>
                </div>
                <div className="divide-y divide-border/20 max-h-[400px] overflow-y-auto">
                  {posts.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground text-xs font-mono">No blog posts yet. Click "New Post" to generate one.</div>
                  )}
                  {posts.map((post: any, i: number) => (
                    <div key={post.slug || i} className="px-4 py-3 flex items-center gap-3" data-testid={`blog-row-${i}`}>
                      <FileText size={14} className="text-green-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono font-bold text-foreground truncate">{post.title}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{post.category} | {post.wordCount || "?"} words | Score: {post.humanScore || "?"}%</div>
                      </div>
                      {post.url && (
                        <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {true && (
            <>
              <div className="border border-fuchsia-500/20 rounded-xl bg-fuchsia-500/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Mail size={16} className="text-fuchsia-400" />
                  <span className="text-sm font-bold text-fuchsia-400">Email & Outreach</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <MetricCard label="Campaigns" value={outreachStats?.campaignCount || 0} color="text-fuchsia-400" icon={Send} />
                  <MetricCard label="Emails Sent" value={outreachStats?.totalSent || 0} color="text-cyan-400" icon={Mail} />
                  <MetricCard label="Open Rate" value={outreachStats?.openRate ? `${Number(outreachStats.openRate).toFixed(1)}%` : "—"} color="text-green-400" icon={Eye} />
                  <MetricCard label="Leads Found" value={outreachStats?.leadsFound || findLeads.data?.leads?.length || 0} color="text-amber-400" icon={Users} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => findLeads.mutate()} disabled={isAnyLoading}
                    className="px-3 py-2.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-mono hover:bg-fuchsia-500/20 disabled:opacity-40 flex items-center gap-1.5">
                    {findLeads.isPending ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Find Guest Post Leads
                  </button>
                  <button onClick={() => generateAds.mutate()} disabled={isAnyLoading}
                    className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono hover:bg-amber-500/20 disabled:opacity-40 flex items-center gap-1.5">
                    {generateAds.isPending ? <Loader2 size={12} className="animate-spin" /> : <Megaphone size={12} />} Generate Ad Copy
                  </button>
                </div>
              </div>

              {findLeads.data && (
                <div className="border border-fuchsia-500/20 rounded-xl bg-fuchsia-500/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-fuchsia-500/15 flex items-center gap-2">
                    <Users size={14} className="text-fuchsia-400" />
                    <span className="text-sm font-bold text-fuchsia-400">Outreach Targets</span>
                    <span className="ml-auto text-[11px] text-muted-foreground font-mono">{(findLeads.data as any)?.leads?.length || 0} found</span>
                  </div>
                  <div className="divide-y divide-border/20 max-h-[300px] overflow-y-auto">
                    {((findLeads.data as any)?.leads || []).map((lead: any, i: number) => (
                      <div key={i} className="px-4 py-3 flex items-center gap-3">
                        <Globe size={14} className="text-fuchsia-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono font-bold text-foreground truncate">{lead.name || lead.website || "Lead"}</div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">{lead.email || lead.contact || "Contact not found"}</div>
                        </div>
                        <span className="text-[11px] text-fuchsia-400 font-mono shrink-0">DA: {lead.da || "?"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generateAds.data && (
                <div className="border border-amber-500/20 rounded-xl bg-amber-500/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-amber-500/15 flex items-center gap-2">
                    <Megaphone size={14} className="text-amber-400" />
                    <span className="text-sm font-bold text-amber-400">Generated Ad Creatives</span>
                  </div>
                  <div className="p-4 text-xs text-foreground/80 font-mono whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-relaxed">
                    {typeof (generateAds.data as any)?.ads === "string" ? (generateAds.data as any).ads : JSON.stringify(generateAds.data, null, 2)}
                  </div>
                </div>
              )}
            </>
          )}

          {true && (
            <>
              <div className="border border-teal-500/20 rounded-xl bg-teal-500/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-teal-400" />
                  <span className="text-sm font-bold text-teal-400">Traffic & Conversion Strategy</span>
                </div>
                <button onClick={() => executePlan.mutate()} disabled={isAnyLoading}
                  className="w-full px-3 py-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-mono font-bold hover:bg-teal-500/20 disabled:opacity-40 flex items-center justify-center gap-1.5 mb-4">
                  {executePlan.isPending ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />}
                  Generate Full Marketing Plan
                </button>
                {executePlan.data && (
                  <div className="text-xs text-foreground/80 font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed border-t border-teal-500/15 pt-3">
                    {typeof (executePlan.data as any)?.strategy === "string" ? (executePlan.data as any).strategy : JSON.stringify(executePlan.data, null, 2)}
                  </div>
                )}
              </div>

              {vitalityStreams.length > 0 && (
                <div className="border border-cyan-500/20 rounded-xl bg-cyan-500/5 overflow-hidden">
                  <div className="px-4 py-3 border-b border-cyan-500/15 flex items-center gap-2">
                    <Activity size={14} className="text-cyan-400" />
                    <span className="text-sm font-bold text-cyan-400">Active Vitality Streams</span>
                    <span className="ml-auto text-[11px] text-muted-foreground font-mono">{vitalityStreams.length} running</span>
                  </div>
                  <div className="divide-y divide-border/20">
                    {vitalityStreams.map((s: any, i: number) => (
                      <div key={i} className="px-4 py-3 flex items-center gap-3">
                        <StatusDot status={s.status === "active" ? "running" : s.status || "pending"} />
                        <span className="text-xs font-mono text-foreground/80 truncate flex-1">{s.name || s.type || "Stream"}</span>
                        <span className="text-xs font-mono text-cyan-400 font-bold shrink-0">{s.executions || 0}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {true && (
            <div className="border border-amber-500/20 rounded-xl bg-amber-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-amber-400" />
                <span className="text-sm font-bold text-amber-400">Autonomous Agent Tasks</span>
              </div>
              <div className="space-y-2">
                {[
                  { agent: "SEO-Bot", task: "Site audit & keyword optimization", status: siteAudit.isPending ? "running" : siteAudit.data ? "complete" : "pending" },
                  { agent: "Content-Engine", task: "Blog post generation & publishing", status: publishBlog.isPending ? "running" : posts.length > 0 ? "complete" : "pending" },
                  { agent: "Outreach-Agent", task: "Guest post lead discovery & email", status: findLeads.isPending ? "running" : findLeads.data ? "complete" : "pending" },
                  { agent: "Competitor-Analyst", task: "Competitor strategy reverse-engineering", status: runCompetitorAnalysis.isPending ? "running" : runCompetitorAnalysis.data ? "complete" : "pending" },
                  { agent: "Ad-Generator", task: "Google/Facebook/TikTok ad creatives", status: generateAds.isPending ? "running" : generateAds.data ? "complete" : "pending" },
                  { agent: "Store-Auditor", task: "Shopify theme & performance audit", status: storeAudit.isPending ? "running" : storeAudit.data ? "complete" : "pending" },
                  { agent: "Email-Marketing", task: "Klaviyo campaigns & sequences", status: outreachStats?.campaignCount > 0 ? "running" : "pending" },
                  { agent: "Funnel-Builder", task: "Sales funnel optimization", status: executePlan.data ? "complete" : "pending" },
                ].map((task, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-background/30 border border-border/20">
                    <StatusDot status={task.status} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono font-bold text-foreground">{task.agent}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">{task.task}</div>
                    </div>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold",
                      task.status === "running" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" :
                      task.status === "complete" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                      "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    )}>{task.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-white/[0.06] rounded-xl bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <Activity size={14} className="text-emerald-400" />
              <span className="text-sm font-bold text-foreground">Execution Log</span>
              <span className="ml-auto text-[11px] text-muted-foreground font-mono">{executionLog.length} entries</span>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto font-mono text-[11px] space-y-0.5" data-testid="vitality-execution-log">
              {executionLog.length === 0 && (
                <div className="text-muted-foreground text-center py-4">Click Auto-Execute All or use Quick Actions to begin autonomous operations</div>
              )}
              {executionLog.map((log, i) => (
                <div key={i} className={cn("leading-relaxed",
                  log.includes("===") ? "text-emerald-400 font-bold" :
                  log.includes("error") || log.includes("failed") ? "text-red-400" :
                  log.includes("complete") || log.includes("COMPLETE") ? "text-green-400" :
                  "text-foreground/60"
                )}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
