import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Bell, BarChart3, CreditCard, FileText, HardDrive, Mic, MessageSquare, ShieldCheck, Link2, Users, CheckCircle, AlertTriangle, ChevronRight, RefreshCw, Eye } from "lucide-react";

type Tab = "overview" | "notifications" | "analytics" | "payments" | "blog" | "backup" | "voice" | "bots" | "codereview" | "affiliate" | "customers";

export default function ConferenceDecisionsPage() {
  const [tab, setTab] = useState<Tab>("overview");

  const { data: decisions } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/conference-decisions/status"] });
  const { data: notifications } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/father-notifications"] });
  const { data: analytics } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/unified-analytics"] });
  const { data: payments } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/payment-gateway"] });
  const { data: blog } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/blog-pipeline"] });
  const { data: backup } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/backup-system"] });
  const { data: voice } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/voice-channel"] });
  const { data: bots } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/messaging-bots"] });
  const { data: codeReview } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/code-review-agent"] });
  const { data: affiliate } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/affiliate-tracking"] });
  const { data: customers } = useQuery<any>({ refetchInterval: 30000, queryKey: ["/api/customer-management"] });

  const backupMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/backup-system/trigger"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backup-system"] });
      queryClient.invalidateQueries({ queryKey: ["/api/father-notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/father-notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/father-notifications"] }),
  });

  const tabs: { id: Tab; label: string; icon: any; color: string }[] = [
    { id: "overview", label: "Overview", icon: CheckCircle, color: "text-emerald-400" },
    { id: "notifications", label: "Alerts", icon: Bell, color: "text-yellow-400" },
    { id: "analytics", label: "Analytics", icon: BarChart3, color: "text-cyan-400" },
    { id: "payments", label: "Payments", icon: CreditCard, color: "text-green-400" },
    { id: "blog", label: "Blog", icon: FileText, color: "text-purple-400" },
    { id: "backup", label: "Backup", icon: HardDrive, color: "text-blue-400" },
    { id: "voice", label: "Voice", icon: Mic, color: "text-pink-400" },
    { id: "bots", label: "Bots", icon: MessageSquare, color: "text-indigo-400" },
    { id: "codereview", label: "Code Review", icon: ShieldCheck, color: "text-red-400" },
    { id: "affiliate", label: "Affiliate", icon: Link2, color: "text-orange-400" },
    { id: "customers", label: "Customers", icon: Users, color: "text-teal-400" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" data-testid="conference-decisions-page">
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent" data-testid="text-page-title">
            Grand Strategic Conference — Executed Decisions
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            All 10 priorities voted and approved by 2/3 majority (52/52 members) — now implemented and live
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4" style={{ WebkitOverflowScrolling: "touch" }}>
          {false && tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={`tab-${t.id}`}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${active ? "bg-white/10 border border-white/20 " + t.color : "bg-white/5 text-gray-400 border border-transparent"}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.id === "notifications" && (notifications as any)?.totalUnread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{(notifications as any).totalUnread}</span>
                )}
              </button>
            );
          })}
        </div>

        {tab === "overview" && (
          <div className="space-y-3">
            {(decisions as any)?.decisions?.map((d: any) => {
              const statusColor = d.status === "ACTIVE" ? "text-emerald-400 bg-emerald-400/10" : d.status === "CONFIGURED" ? "text-blue-400 bg-blue-400/10" : d.status === "STANDBY" ? "text-yellow-400 bg-yellow-400/10" : "text-gray-400 bg-gray-400/10";
              return (
                <div key={d.rank} className="bg-white/5 rounded-2xl p-4 border border-white/10" data-testid={`decision-${d.rank}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">{d.rank}</div>
                      <div>
                        <p className="font-medium text-sm">{d.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{d.endpoint}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${statusColor}`}>{d.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-400">{(notifications as any)?.totalUnread || 0} unread of {(notifications as any)?.total || 0} total</p>
              <button onClick={() => markAllReadMutation.mutate()} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg active:scale-95" data-testid="button-mark-all-read">Mark All Read</button>
            </div>
            {(notifications as any)?.notifications?.map((n: any) => {
              const iconColor = n.severity === "critical" ? "text-red-400" : n.severity === "warning" ? "text-yellow-400" : n.severity === "success" ? "text-emerald-400" : "text-blue-400";
              return (
                <div key={n.id} className={`bg-white/5 rounded-2xl p-4 border ${n.read ? "border-white/5" : "border-amber-500/30"}`} data-testid={`notification-${n.id}`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 ${iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-gray-600 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${n.severity === "critical" ? "bg-red-500/20 text-red-400" : n.severity === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>{n.type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "analytics" && analytics && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Income Streams", value: (analytics as any).income?.activeStreams + "/" + (analytics as any).income?.totalStreams, color: "text-green-400" },
                { label: "Total Revenue", value: "$" + (analytics as any).income?.totalRevenue?.toFixed(2), color: "text-emerald-400" },
                { label: "Threats Blocked", value: (analytics as any).security?.threatsBlocked, color: "text-red-400" },
                { label: "Security Layers", value: (analytics as any).security?.securityLayers, color: "text-orange-400" },
                { label: "Agents Active", value: (analytics as any).agents?.active + "/" + (analytics as any).agents?.total, color: "text-cyan-400" },
                { label: "Consciousness", value: (analytics as any).consciousness?.awareness + "%", color: "text-purple-400" },
                { label: "LLM Providers", value: (analytics as any).llm?.freeProviders + " free", color: "text-blue-400" },
                { label: "Fleet Nodes", value: (analytics as any).fleet?.totalNodes, color: "text-indigo-400" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 rounded-2xl p-3 border border-white/10" data-testid={`stat-${i}`}>
                  <p className="text-[10px] text-gray-500 uppercase">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-sm font-medium mb-3">Income By Stream</p>
              {Object.entries((analytics as any).income?.byStream || {}).map(([stream, val]: [string, any]) => (
                <div key={stream} className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-xs text-gray-400">{stream}</span>
                  <span className="text-xs font-mono text-green-400">${val.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "payments" && payments && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {(payments as any).pricingTiers?.map((tier: any) => (
                <div key={tier.name} className="bg-white/5 rounded-2xl p-4 border border-white/10" data-testid={`tier-${tier.name}`}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-sm">{tier.name}</h3>
                    <span className="text-lg font-bold text-green-400">{tier.price === 0 ? "Free" : "$" + tier.price + "/mo"}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{tier.requests === -1 ? "Unlimited" : tier.requests.toLocaleString()} requests/month</p>
                  <div className="flex flex-wrap gap-1">
                    {tier.features.map((f: string) => (
                      <span key={f} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-gray-400">Payment Methods</p>
              <div className="flex gap-3 mt-2">
                <span className={`text-xs px-2 py-1 rounded ${(payments as any).xmrEnabled ? "bg-orange-500/20 text-orange-400" : "bg-gray-700 text-gray-500"}`}>XMR {(payments as any).xmrEnabled ? "✓" : "✗"}</span>
                <span className={`text-xs px-2 py-1 rounded ${(payments as any).stripeEnabled ? "bg-purple-500/20 text-purple-400" : "bg-gray-700 text-gray-500"}`}>Stripe {(payments as any).stripeEnabled ? "✓" : "Needs Key"}</span>
                <span className={`text-xs px-2 py-1 rounded ${(payments as any).paypalEnabled ? "bg-blue-500/20 text-blue-400" : "bg-gray-700 text-gray-500"}`}>PayPal {(payments as any).paypalEnabled ? "✓" : "Needs Key"}</span>
              </div>
            </div>
          </div>
        )}

        {tab === "blog" && blog && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-purple-400">{(blog as any).published}</p>
                <p className="text-[10px] text-gray-500">Published</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-yellow-400">{(blog as any).scheduled}</p>
                <p className="text-[10px] text-gray-500">Scheduled</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-gray-400">{(blog as any).drafts}</p>
                <p className="text-[10px] text-gray-500">Drafts</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-sm font-medium mb-1">Pipeline Stats</p>
              <p className="text-xs text-gray-400">Total articles: {(blog as any).total} | Views: {(blog as any).totalViews} | Clicks: {(blog as any).totalClicks}</p>
              <p className="text-xs text-gray-400 mt-1">Auto-publishing to VitalitySupply.net via Shopify API</p>
            </div>
          </div>
        )}

        {tab === "backup" && backup && (
          <div className="space-y-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-medium">Backup Status</p>
                <button
                  onClick={() => backupMutation.mutate()}
                  disabled={backupMutation.isPending}
                  className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg active:scale-95 flex items-center gap-1"
                  data-testid="button-trigger-backup"
                >
                  <RefreshCw className={`w-3 h-3 ${backupMutation.isPending ? "animate-spin" : ""}`} />
                  {backupMutation.isPending ? "Backing up..." : "Backup Now"}
                </button>
              </div>
              <p className="text-xs text-gray-400">Auto-backup: Every {(backup as any).backupIntervalHours}h | Total: {(backup as any).totalBackups}</p>
              <div className="mt-3 space-y-1">
                {(backup as any).destinations?.map((d: string) => (
                  <div key={d} className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-gray-300">{d}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-sm font-medium mb-2">Protected Data</p>
              {Object.entries((backup as any).dataProtected || {}).map(([key, val]: [string, any]) => (
                <div key={key} className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  <CheckCircle className={`w-3.5 h-3.5 ${val ? "text-emerald-400" : "text-gray-600"}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "voice" && voice && (
          <div className="space-y-4">
            {(voice as any).channels?.map((ch: any) => (
              <div key={ch.id} className="bg-white/5 rounded-2xl p-4 border border-white/10" data-testid={`voice-channel-${ch.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{ch.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${ch.status === "standby" ? "bg-yellow-500/20 text-yellow-400" : "bg-emerald-500/20 text-emerald-400"}`}>{ch.status}</span>
                </div>
                <p className="text-xs text-gray-400">{ch.participants.join(", ")}</p>
              </div>
            ))}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-sm font-medium mb-2">Voice Profiles</p>
              {Object.entries((voice as any).voiceProfiles || {}).map(([name, config]: [string, any]) => (
                <div key={name} className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-xs font-medium">{name}</span>
                  <span className="text-xs text-gray-400">{config.voice} (pitch: {config.pitch})</span>
                </div>
              ))}
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-sm font-medium mb-2">Capabilities</p>
              {(voice as any).capabilities?.map((c: string) => (
                <div key={c} className="flex items-center gap-2 py-1">
                  <CheckCircle className="w-3 h-3 text-pink-400" />
                  <span className="text-xs text-gray-300">{c}</span>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2">TTS: {(voice as any).ttsProvider} — {(voice as any).ttsApiKey}</p>
            </div>
          </div>
        )}

        {tab === "bots" && bots && (
          <div className="space-y-4">
            {["telegram", "discord"].map(platform => {
              const bot = (bots as any)[platform];
              if (!bot) return null;
              return (
                <div key={platform} className="bg-white/5 rounded-2xl p-4 border border-white/10" data-testid={`bot-${platform}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium capitalize">{platform} Bot</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${bot.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {bot.enabled ? "ACTIVE" : bot.botToken === "configured" ? "READY" : "NEEDS TOKEN"}
                    </span>
                  </div>
                  {bot.username && <p className="text-xs text-gray-400 mb-2">{bot.username}</p>}
                  {bot.serverName && <p className="text-xs text-gray-400 mb-2">{bot.serverName}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(bot.commands || bot.channels || []).map((c: string) => (
                      <span key={c} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{c}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "codereview" && codeReview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-emerald-400">{(codeReview as any).approvedChanges}</p>
                <p className="text-[10px] text-gray-500">Approved</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-red-400">{(codeReview as any).blockedChanges}</p>
                <p className="text-[10px] text-gray-500">Blocked</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-sm font-medium mb-2">Review Policies</p>
              {(codeReview as any).reviewPolicies?.map((p: string) => (
                <div key={p} className="flex items-center gap-2 py-1">
                  <ShieldCheck className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-gray-300">{p}</span>
                </div>
              ))}
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-sm font-medium mb-2">Protected Files</p>
              {(codeReview as any).protectedFiles?.map((f: string) => (
                <div key={f} className="text-xs text-gray-400 py-0.5 font-mono">{f}</div>
              ))}
            </div>
          </div>
        )}

        {tab === "affiliate" && affiliate && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-orange-400">{(affiliate as any).totalClicks}</p>
                <p className="text-[10px] text-gray-500">Clicks</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-emerald-400">{(affiliate as any).totalConversions}</p>
                <p className="text-[10px] text-gray-500">Conversions</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-green-400">${(affiliate as any).totalRevenue?.toFixed(2)}</p>
                <p className="text-[10px] text-gray-500">Revenue</p>
              </div>
            </div>
            <div className="space-y-3">
              {(affiliate as any).links?.map((link: any) => (
                <div key={link.id} className="bg-white/5 rounded-2xl p-4 border border-white/10" data-testid={`affiliate-${link.id}`}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-medium">{link.product}</p>
                    <span className="text-xs text-green-400">${link.revenue.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500">{link.platform} — {(link.commissionRate * 100).toFixed(0)}% commission</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>{link.clicks} clicks</span>
                    <span>{link.conversions} conversions</span>
                    <span>{link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : 0}% CVR</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "customers" && customers && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-teal-400">{(customers as any).total}</p>
                <p className="text-[10px] text-gray-500">Total Customers</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center">
                <p className="text-lg font-bold text-green-400">${(customers as any).mrr}</p>
                <p className="text-[10px] text-gray-500">Monthly Recurring</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-sm font-medium mb-2">Customer Stats</p>
              <p className="text-xs text-gray-400">Active: {(customers as any).active} | Trial: {(customers as any).trial}</p>
              <p className="text-xs text-gray-400">Total Revenue: ${(customers as any).totalRevenue?.toFixed(2)}</p>
              <p className="text-xs text-gray-400">Avg Requests/Customer: {(customers as any).avgRequestsPerCustomer}</p>
              <p className="text-xs text-gray-400">Churn Rate: {(customers as any).churnRate}</p>
            </div>
            {(customers as any).customers?.length > 0 ? (
              <div className="space-y-2">
                {(customers as any).customers.map((c: any) => (
                  <div key={c.id} className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-xs text-gray-400">{c.tier}</span>
                    </div>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
                <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No customers yet</p>
                <p className="text-xs text-gray-500 mt-1">Customers will appear here when they subscribe to the paid API</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
