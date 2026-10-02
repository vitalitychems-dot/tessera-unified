import { useState, useEffect } from "react";
import { Link2, Zap, ArrowRight, CheckCircle2, XCircle, RefreshCw, Plus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface Bridge {
  id: string;
  name: string;
  sourceApp: string;
  targetApp: string;
  trigger: string;
  action: string;
  status: "active" | "paused" | "error";
  runs: number;
  lastRun: string;
  dataFlow: string;
}

const BRIDGES: Bridge[] = [
  { id: "b1", name: "Tessera → Notion", sourceApp: "Tessera Intelligence", targetApp: "Notion", trigger: "New knowledge vector indexed", action: "Create Notion page", status: "active", runs: 1240, lastRun: "5m ago", dataFlow: "knowledge → pages" },
  { id: "b2", name: "Council → Slack", sourceApp: "Grand Council", targetApp: "Slack", trigger: "New council vote", action: "Post to #governance channel", status: "active", runs: 44, lastRun: "2h ago", dataFlow: "votes → notifications" },
  { id: "b3", name: "Arbitrage → Telegram", sourceApp: "Arbitrage Scanner", targetApp: "Telegram Bot", trigger: "Hot opportunity detected", action: "Send alert message", status: "active", runs: 890, lastRun: "30s ago", dataFlow: "opportunities → alerts" },
  { id: "b4", name: "Fleet → PagerDuty", sourceApp: "Fleet Monitor", targetApp: "PagerDuty", trigger: "Node goes offline", action: "Create P1 incident", status: "active", runs: 6, lastRun: "4h ago", dataFlow: "alerts → incidents" },
  { id: "b5", name: "Finance → Airtable", sourceApp: "Finance Dashboard", targetApp: "Airtable", trigger: "Daily portfolio snapshot", action: "Update Airtable row", status: "paused", runs: 142, lastRun: "1d ago", dataFlow: "portfolio → spreadsheet" },
  { id: "b6", name: "Lead Gen → HubSpot", sourceApp: "Lead Generation", targetApp: "HubSpot CRM", trigger: "New hot lead scored", action: "Create CRM contact", status: "error", runs: 38, lastRun: "3h ago", dataFlow: "leads → CRM" },
];

const STATUS_STYLES: Record<string, { text: string; bg: string; border: string; Icon: any }> = {
  active: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", Icon: CheckCircle2 },
  paused: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", Icon: RefreshCw },
  error: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", Icon: XCircle },
};

const APP_COLORS: Record<string, string> = {
  "Tessera Intelligence": "text-violet-400",
  "Grand Council": "text-amber-400",
  "Arbitrage Scanner": "text-emerald-400",
  "Fleet Monitor": "text-cyan-400",
  "Finance Dashboard": "text-orange-400",
  "Lead Generation": "text-pink-400",
};

export default function CrossAppBridgePage() {
  useEffect(() => { document.title = "Cross-App Bridge | Tessera"; }, []);

  const active = BRIDGES.filter(b => b.status === "active").length;
  const totalRuns = BRIDGES.reduce((s, b) => s + b.runs, 0);

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <PageHeader icon={Link2} title="Cross-App Bridge" subtitle="Connect Tessera sovereign apps to external platforms and automate data flows" iconColor="text-violet-400" />
        <button className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-400 text-xs font-mono hover:bg-violet-500/25 transition-all">
          <Plus size={12} />
          New Bridge
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Bridges", val: active, color: "emerald" },
          { label: "Total Runs", val: totalRuns.toLocaleString(), color: "cyan" },
          { label: "Errors", val: BRIDGES.filter(b => b.status === "error").length, color: "red" },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <div className={cn("text-xl font-bold font-mono", `text-${color}-400`)}>{val}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{label.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      <div className="space-y-3">
        {BRIDGES.map(bridge => {
          const s = STATUS_STYLES[bridge.status];
          const StatusIcon = s.Icon;
          const sourceColor = APP_COLORS[bridge.sourceApp] || "text-slate-400";

          return (
            <GlassCard key={bridge.id} className={cn("p-4 border transition-all hover:bg-white/[0.04]", s.border)}>
              <div className="flex items-start gap-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", s.bg, "border", s.border)}>
                  <StatusIcon size={13} className={s.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{bridge.name}</span>
                    <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full border font-mono uppercase", s.bg, s.text, s.border)}>{bridge.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                    <span className={cn("font-medium", sourceColor)}>{bridge.sourceApp}</span>
                    <ArrowRight size={10} className="text-slate-600 shrink-0" />
                    <span className="text-slate-400">{bridge.targetApp}</span>
                  </div>
                  <div className="mt-1.5 text-[10px] text-slate-600">
                    <span className="text-slate-500">When:</span> {bridge.trigger} → <span className="text-slate-500">Do:</span> {bridge.action}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-600 font-mono">
                    <span>{bridge.runs.toLocaleString()} runs</span>
                    <span>Last: {bridge.lastRun}</span>
                    <span className="text-slate-700">{bridge.dataFlow}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
