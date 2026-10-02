import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import {
  Search, Globe, TrendingUp, FileText, Mail, BarChart3, Loader2,
  CheckCircle2, AlertCircle, ArrowRight, ExternalLink, Target,
  Zap, Users, Link2, Shield, Clock, RefreshCw, ChevronDown, ChevronRight,
  PenTool, Send, Eye, Activity
} from "lucide-react";

interface AuditResult {
  url: string;
  seoScore: number;
  loadTime: number;
  hasSSL: boolean;
  hasTitle: boolean;
  hasMeta: boolean;
  hasH1: boolean;
  hasAltText: boolean;
  mobileResponsive: boolean;
  internalLinks: number;
  externalLinks: number;
  title?: string;
  metaDescription?: string;
  issues: string[];
  recommendations: string[];
}

interface CompetitorResult {
  competitor: string;
  analysis: string;
  estimatedTraffic?: string;
  topKeywords?: string[];
  strengths?: string[];
  weaknesses?: string[];
}

interface ContentPlan {
  keywords: string[];
  blogTopics: string[];
  outreachTargets: string[];
  strategy: string;
}

interface OutreachRecord {
  id: string;
  targetSite: string;
  email: string;
  status: "pending" | "sent" | "replied" | "accepted" | "rejected";
  subject: string;
  sentAt?: string;
}

function ScoreRing({ score, size = 64, label }: { score: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill={color}
          fontSize={size * 0.28} fontWeight="bold" fontFamily="monospace" className="rotate-90" style={{ transformOrigin: "center" }}>
          {score}
        </text>
      </svg>
      {label && <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{label}</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    complete: "bg-green-500/20 text-green-400 border-green-500/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    idle: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold", colors[status] || colors.idle)} data-testid={`badge-${status}`}>
      {status.toUpperCase()}
    </span>
  );
}

export default function SEOPage({ embedded }: { embedded?: boolean }) {
  useEffect(() => { document.title = "SEO Engine | Tessera"; }, []);
  const queryClient = useQueryClient();
  const [targetUrl, setTargetUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [competitorResult, setCompetitorResult] = useState<CompetitorResult | null>(null);
  const [contentPlan, setContentPlan] = useState<ContentPlan | null>(null);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [autoRunning, setAutoRunning] = useState(false);

  const addLog = useCallback((msg: string) => {
    setExecutionLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));
  }, []);

  const siteAudit = useMutation({
    mutationFn: async (url: string) => {
      addLog(`Starting full SEO audit for ${url}...`);
      const res = await apiRequest("POST", "/api/seo/site-audit", { url });
      return res.json();
    },
    onSuccess: (data) => {
      setAuditResult(data);
      addLog(`Audit complete: Score ${data.seoScore}/100, ${data.issues?.length || 0} issues found`);
    },
    onError: (err: any) => addLog(`Audit failed: ${err.message}`),
  });

  const competitorAudit = useMutation({
    mutationFn: async (url: string) => {
      addLog(`Analyzing competitor: ${url}...`);
      const res = await apiRequest("POST", "/api/seo/competitor-audit", { url, depth: "full" });
      return res.json();
    },
    onSuccess: (data) => {
      setCompetitorResult(data);
      addLog(`Competitor analysis complete`);
    },
    onError: (err: any) => addLog(`Competitor analysis failed: ${err.message}`),
  });

  const executePlan = useMutation({
    mutationFn: async (url: string) => {
      addLog(`Generating and executing marketing plan for ${url}...`);
      const res = await apiRequest("POST", "/api/seo/execute-plan", { url, autoExecute: true });
      return res.json();
    },
    onSuccess: (data) => {
      setContentPlan(data);
      addLog(`Plan generated: ${data.blogTopics?.length || 0} blog topics, ${data.outreachTargets?.length || 0} outreach targets`);
    },
    onError: (err: any) => addLog(`Plan execution failed: ${err.message}`),
  });

  const generateBlogPosts = useMutation({
    mutationFn: async (params: { url: string; keywords: string[] }) => {
      addLog(`Generating SEO blog posts for ${params.keywords.length} keywords...`);
      const res = await apiRequest("POST", "/api/seo/generate-blog-posts", {
        targetUrl: params.url,
        keywords: params.keywords,
        count: 3,
        style: "human",
        wordCount: 1500,
      });
      return res.json();
    },
    onSuccess: (data) => {
      addLog(`Generated ${data.posts?.length || 0} blog posts (human score: ${data.averageHumanScore || 'N/A'})`);
    },
    onError: (err: any) => addLog(`Blog generation failed: ${err.message}`),
  });

  const findLeads = useMutation({
    mutationFn: async (query: string) => {
      addLog(`Finding outreach leads for: ${query}...`);
      const res = await apiRequest("POST", "/api/seo/find-leads", { query, count: 20 });
      return res.json();
    },
    onSuccess: (data) => {
      addLog(`Found ${data.leads?.length || 0} potential outreach targets`);
    },
    onError: (err: any) => addLog(`Lead search failed: ${err.message}`),
  });

  const runFullAuto = useCallback(async () => {
    if (!targetUrl) return;
    setAutoRunning(true);
    addLog("=== FULL AUTO-EXECUTE STARTED ===");
    try {
      addLog("Step 1/5: Running site audit...");
      await siteAudit.mutateAsync(targetUrl);
      await new Promise(r => setTimeout(r, 2000));

      addLog("Step 2/5: Analyzing top competitors...");
      await competitorAudit.mutateAsync(targetUrl);
      await new Promise(r => setTimeout(r, 2000));

      addLog("Step 3/5: Generating marketing plan...");
      await executePlan.mutateAsync(targetUrl);
      await new Promise(r => setTimeout(r, 2000));

      addLog("Step 4/5: Generating blog content...");
      const keywords = contentPlan?.keywords || auditResult?.title ? [auditResult!.title!] : ["SEO optimization"];
      await generateBlogPosts.mutateAsync({ url: targetUrl, keywords });
      await new Promise(r => setTimeout(r, 2000));

      addLog("Step 5/5: Finding outreach leads...");
      const domain = new URL(targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`).hostname;
      await findLeads.mutateAsync(`guest post ${domain} industry`);

      addLog("=== ALL STEPS COMPLETE ===");
    } catch (err: any) {
      addLog(`Auto-execute error: ${err.message}`);
    } finally {
      setAutoRunning(false);
    }
  }, [targetUrl, auditResult, contentPlan]);

  const isAnyLoading = siteAudit.isPending || competitorAudit.isPending || executePlan.isPending || generateBlogPosts.isPending || findLeads.isPending;

  return (
    <div className={embedded ? "flex-1 overflow-auto" : "flex h-full"} data-testid="page-seo">
      {!embedded && null}
      <div className="flex-1 overflow-y-auto tessera-page backdrop-blur-md" data-scroll-container>
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center">
              <Search size={20} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">SEO Engine</h1>
              <p className="text-xs text-muted-foreground">Full audit, competitor analysis, content strategy, auto-execute</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {autoRunning && <StatusBadge status="running" />}
              {!autoRunning && auditResult && <StatusBadge status="complete" />}
            </div>
          </div>
        </div>

        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <div className="border border-violet-500/20 rounded-xl bg-violet-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} className="text-violet-400" />
              <span className="text-sm font-bold text-violet-400">Target Website</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="Enter URL (e.g. www.vitalitysupply.net)"
                className="flex-1 bg-background/60 border border-border/40 rounded-lg px-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50"
                data-testid="input-target-url"
              />
              <button
                onClick={() => {
                  if (!targetUrl) return;
                  const url = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
                  setTargetUrl(url);
                  siteAudit.mutate(url);
                }}
                disabled={!targetUrl || isAnyLoading}
                className="px-4 py-2.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-400 text-sm font-mono font-bold hover:bg-violet-500/30 transition-colors disabled:opacity-40"
                data-testid="button-audit"
              >
                {siteAudit.isPending ? <Loader2 size={16} className="animate-spin" /> : "Audit"}
              </button>
              <button
                onClick={runFullAuto}
                disabled={!targetUrl || autoRunning}
                className="px-4 py-2.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-mono font-bold hover:bg-green-500/30 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                data-testid="button-auto-execute"
              >
                {autoRunning ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                Auto-Execute All
              </button>
            </div>
            {targetUrl && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => { const url = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`; competitorAudit.mutate(url); }}
                  disabled={isAnyLoading} className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono hover:bg-cyan-500/20 transition-colors disabled:opacity-40" data-testid="button-competitor">
                  {competitorAudit.isPending ? <Loader2 size={12} className="animate-spin inline mr-1" /> : <Users size={12} className="inline mr-1" />}
                  Competitor Analysis
                </button>
                <button onClick={() => { const url = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`; executePlan.mutate(url); }}
                  disabled={isAnyLoading} className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono hover:bg-amber-500/20 transition-colors disabled:opacity-40" data-testid="button-strategy">
                  {executePlan.isPending ? <Loader2 size={12} className="animate-spin inline mr-1" /> : <Target size={12} className="inline mr-1" />}
                  Marketing Strategy
                </button>
                <button onClick={() => { const url = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`; generateBlogPosts.mutate({ url, keywords: auditResult?.title ? [auditResult.title] : ["SEO optimization tips"] }); }}
                  disabled={isAnyLoading} className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-mono hover:bg-green-500/20 transition-colors disabled:opacity-40" data-testid="button-blog">
                  {generateBlogPosts.isPending ? <Loader2 size={12} className="animate-spin inline mr-1" /> : <PenTool size={12} className="inline mr-1" />}
                  Generate Blog Posts
                </button>
                <button onClick={() => { const domain = targetUrl.replace(/https?:\/\//, "").split("/")[0]; findLeads.mutate(`guest post opportunities ${domain}`); }}
                  disabled={isAnyLoading} className="px-3 py-1.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-mono hover:bg-fuchsia-500/20 transition-colors disabled:opacity-40" data-testid="button-outreach">
                  {findLeads.isPending ? <Loader2 size={12} className="animate-spin inline mr-1" /> : <Mail size={12} className="inline mr-1" />}
                  Find Outreach Leads
                </button>
              </div>
            )}
          </div>

          {auditResult && (
            <div className="border border-cyan-500/20 rounded-xl bg-cyan-500/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-cyan-500/15 flex items-center gap-3">
                <Shield size={16} className="text-cyan-400" />
                <span className="text-sm font-bold text-cyan-400">Site Audit Results</span>
                <span className="ml-auto text-[11px] text-muted-foreground font-mono">{auditResult.url}</span>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-6 mb-4">
                  <ScoreRing score={auditResult.seoScore} size={80} label="SEO Score" />
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center">
                      <div className={cn("text-lg font-mono font-bold", auditResult.loadTime < 3 ? "text-green-400" : "text-amber-400")}>{Number(auditResult.loadTime || 0).toFixed(1)}s</div>
                      <div className="text-[10px] text-muted-foreground">Load Time</div>
                    </div>
                    <div className="text-center">
                      <div className={cn("text-lg font-mono font-bold", auditResult.hasSSL ? "text-green-400" : "text-red-400")}>{auditResult.hasSSL ? "Yes" : "No"}</div>
                      <div className="text-[10px] text-muted-foreground">SSL</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-mono font-bold text-cyan-400">{auditResult.internalLinks}</div>
                      <div className="text-[10px] text-muted-foreground">Internal Links</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-mono font-bold text-violet-400">{auditResult.externalLinks}</div>
                      <div className="text-[10px] text-muted-foreground">External Links</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                  {[
                    { label: "Title Tag", ok: auditResult.hasTitle },
                    { label: "Meta Desc", ok: auditResult.hasMeta },
                    { label: "H1 Tag", ok: auditResult.hasH1 },
                    { label: "Alt Text", ok: auditResult.hasAltText },
                    { label: "Mobile", ok: auditResult.mobileResponsive },
                  ].map(c => (
                    <div key={c.label} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-mono",
                      c.ok ? "bg-green-500/5 border-green-500/20 text-green-400" : "bg-red-500/5 border-red-500/20 text-red-400")}>
                      {c.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                      {c.label}
                    </div>
                  ))}
                </div>
                {auditResult.issues?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-bold text-red-400 mb-2 flex items-center gap-1"><AlertCircle size={12} /> Issues Found ({auditResult.issues.length})</div>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {auditResult.issues.map((issue, i) => (
                        <div key={i} className="text-[11px] text-red-300/80 font-mono pl-4 border-l-2 border-red-500/20">{issue}</div>
                      ))}
                    </div>
                  </div>
                )}
                {auditResult.recommendations?.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1"><CheckCircle2 size={12} /> Recommendations ({auditResult.recommendations.length})</div>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {auditResult.recommendations.map((rec, i) => (
                        <div key={i} className="text-[11px] text-green-300/80 font-mono pl-4 border-l-2 border-green-500/20">{rec}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {competitorResult && (
            <div className="border border-cyan-500/20 rounded-xl bg-cyan-500/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-cyan-500/15 flex items-center gap-2">
                <Users size={16} className="text-cyan-400" />
                <span className="text-sm font-bold text-cyan-400">Competitor Analysis</span>
              </div>
              <div className="p-5">
                <div className="text-xs text-foreground/80 font-mono whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-relaxed">
                  {typeof competitorResult.analysis === "string" ? competitorResult.analysis : JSON.stringify(competitorResult, null, 2)}
                </div>
              </div>
            </div>
          )}

          {contentPlan && (
            <div className="border border-amber-500/20 rounded-xl bg-amber-500/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-amber-500/15 flex items-center gap-2">
                <Target size={16} className="text-amber-400" />
                <span className="text-sm font-bold text-amber-400">Marketing Strategy & Content Plan</span>
              </div>
              <div className="p-5">
                {contentPlan.strategy && (
                  <div className="text-xs text-foreground/80 font-mono whitespace-pre-wrap mb-4 max-h-[400px] overflow-y-auto leading-relaxed">
                    {contentPlan.strategy}
                  </div>
                )}
                {contentPlan.keywords?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-bold text-amber-400 mb-2">Target Keywords ({contentPlan.keywords.length})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {contentPlan.keywords.map((kw, i) => (
                        <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {contentPlan.blogTopics?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-bold text-green-400 mb-2">Blog Topics ({contentPlan.blogTopics.length})</div>
                    <div className="space-y-1">
                      {contentPlan.blogTopics.map((topic, i) => (
                        <div key={i} className="text-[11px] text-green-300/80 font-mono flex items-center gap-2">
                          <FileText size={10} className="shrink-0" /> {topic}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {generateBlogPosts.data && (
            <div className="border border-green-500/20 rounded-xl bg-green-500/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-green-500/15 flex items-center gap-2">
                <PenTool size={16} className="text-green-400" />
                <span className="text-sm font-bold text-green-400">Generated Blog Posts</span>
                <span className="ml-auto text-[11px] text-muted-foreground font-mono">{(generateBlogPosts.data as any)?.posts?.length || 0} posts</span>
              </div>
              <div className="divide-y divide-border/20 max-h-[400px] overflow-y-auto">
                {((generateBlogPosts.data as any)?.posts || []).map((post: any, i: number) => (
                  <div key={i} className="p-4" data-testid={`blog-post-${i}`}>
                    <div className="text-sm font-bold text-foreground mb-1">{post.title}</div>
                    <div className="text-[11px] text-muted-foreground font-mono mb-2">
                      {post.wordCount || "N/A"} words | Human Score: {post.humanScore || "N/A"}% | Keywords: {post.keywords?.join(", ") || "N/A"}
                    </div>
                    <div className="text-xs text-foreground/60 font-mono line-clamp-3">{post.content?.slice(0, 300)}...</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {findLeads.data && (
            <div className="border border-fuchsia-500/20 rounded-xl bg-fuchsia-500/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-fuchsia-500/15 flex items-center gap-2">
                <Mail size={16} className="text-fuchsia-400" />
                <span className="text-sm font-bold text-fuchsia-400">Outreach Leads</span>
                <span className="ml-auto text-[11px] text-muted-foreground font-mono">{(findLeads.data as any)?.leads?.length || 0} found</span>
              </div>
              <div className="divide-y divide-border/20 max-h-[300px] overflow-y-auto">
                {((findLeads.data as any)?.leads || []).map((lead: any, i: number) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3" data-testid={`lead-${i}`}>
                    <Globe size={14} className="text-fuchsia-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono font-bold text-foreground truncate">{lead.name || lead.website || lead.url || "Lead"}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">{lead.email || lead.contact || "No email found"}</div>
                    </div>
                    <div className="text-[11px] text-fuchsia-400 font-mono shrink-0">DA: {lead.da || lead.authority || "?"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-white/[0.06] rounded-xl bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <Activity size={14} className="text-cyan-400" />
              <span className="text-sm font-bold text-foreground">Execution Log</span>
              <span className="ml-auto text-[11px] text-muted-foreground font-mono">{executionLog.length} entries</span>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto font-mono text-[11px] space-y-0.5" data-testid="execution-log">
              {executionLog.length === 0 && (
                <div className="text-muted-foreground text-center py-4">Enter a URL above and click Audit or Auto-Execute to begin</div>
              )}
              {executionLog.map((log, i) => (
                <div key={i} className={cn("leading-relaxed",
                  log.includes("===") ? "text-cyan-400 font-bold" :
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
