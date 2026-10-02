import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Copy, CheckCheck, Plus, Shield, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard, PageHeader } from "@/components/ui/sovereign";

interface Credential {
  id: string;
  name: string;
  type: "api_key" | "webhook" | "oauth" | "seed";
  value: string;
  created: string;
  lastUsed: string;
  permissions: string[];
  status: "active" | "expired" | "revoked";
}

const CREDS: Credential[] = [
  { id: "c1", name: "Tessera API Key — Production", type: "api_key", value: "tess_prod_sk_9f3a2b1c4d5e6f7a8b9c0d1e2f3a4b5c", created: "2024-01-01", lastUsed: "2 min ago", permissions: ["intelligence:read", "intelligence:write", "mesh:connect"], status: "active" },
  { id: "c2", name: "Webhook Secret — Council Events", type: "webhook", value: "whsec_4f5e6d7c8b9a0b1c2d3e4f5a6b7c8d9e", created: "2024-02-15", lastUsed: "1h ago", permissions: ["events:council", "events:agent"], status: "active" },
  { id: "c3", name: "OAuth Token — Mesh Relay", type: "oauth", value: "mesh_oauth_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d", created: "2024-03-01", lastUsed: "30 min ago", permissions: ["mesh:read", "mesh:relay"], status: "active" },
  { id: "c4", name: "Development API Key", type: "api_key", value: "tess_dev_sk_8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b", created: "2024-03-10", lastUsed: "3d ago", permissions: ["intelligence:read"], status: "active" },
  { id: "c5", name: "Legacy Integration Token", type: "oauth", value: "legacy_tok_5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f", created: "2023-12-01", lastUsed: "2w ago", permissions: ["read:all"], status: "expired" },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  api_key: { label: "API Key", color: "text-cyan-400" },
  webhook: { label: "Webhook", color: "text-violet-400" },
  oauth: { label: "OAuth", color: "text-amber-400" },
  seed: { label: "Seed Phrase", color: "text-red-400" },
};

const STATUS_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  active: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  expired: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
  revoked: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25" },
};

function CredRow({ cred }: { cred: Credential }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const s = STATUS_STYLES[cred.status];
  const t = TYPE_LABELS[cred.type];

  const maskedValue = cred.value.slice(0, 20) + "..." + cred.value.slice(-8);

  const copy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <GlassCard className="p-4 hover:bg-white/[0.04] transition-all">
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", s.bg, "border", s.border)}>
          <Key size={13} className={s.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{cred.name}</span>
            <span className={cn("text-[8px] px-1.5 py-0.5 rounded-full border font-mono uppercase", s.bg, s.text, s.border)}>{cred.status}</span>
            <span className={cn("text-[9px] font-mono", t.color)}>{t.label}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 p-1.5 rounded-lg bg-black/20 border border-white/5 font-mono text-[11px] text-slate-400 truncate">
              {visible ? cred.value : maskedValue}
            </div>
            <button onClick={() => setVisible(!visible)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors">
              {visible ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <button onClick={copy} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors">
              {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {cred.permissions.map(p => <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500 font-mono">{p}</span>)}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-600 font-mono">
            <span>Created: {cred.created}</span>
            <span>Last used: {cred.lastUsed}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default function CredentialsPage() {
  useEffect(() => { document.title = "Credentials | Tessera"; }, []);

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <PageHeader icon={Key} title="Credentials" subtitle="Manage API keys, webhooks, and authentication tokens" iconColor="text-cyan-400" />
        <button className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 text-xs font-mono hover:bg-cyan-500/25 transition-all">
          <Plus size={12} />
          New Key
        </button>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/80">
        <AlertTriangle size={14} className="shrink-0" />
        <span>Never share your credentials. Tessera will never ask for them in chat. Rotate keys regularly for maximum security.</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Keys", val: CREDS.filter(c => c.status === "active").length, color: "emerald" },
          { label: "Expired", val: CREDS.filter(c => c.status === "expired").length, color: "amber" },
          { label: "Total", val: CREDS.length, color: "cyan" },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-3 text-center">
            <div className={cn("text-2xl font-bold font-mono", `text-${color}-400`)}>{val}</div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">{label.toUpperCase()}</div>
          </GlassCard>
        ))}
      </div>

      <div className="space-y-3">
        {CREDS.map(c => <CredRow key={c.id} cred={c} />)}
      </div>
    </div>
  );
}
