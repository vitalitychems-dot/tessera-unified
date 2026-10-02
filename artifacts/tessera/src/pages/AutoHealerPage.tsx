import { useEffect, useState } from "react";

interface HealingIncident {
  id: string;
  ts: number;
  strategy: string;
  category: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  status: "ok" | "healed" | "failed" | "escalated" | "noop";
  detected: string;
  action: string;
  outcome: string;
  metadata?: Record<string, unknown>;
}

interface HealingStats {
  enabled: boolean;
  totalRuns: number;
  totalHealed: number;
  totalFailed: number;
  totalEscalated: number;
  lastRunAt: number;
  totalIncidents: number;
  strategiesConfigured: number;
  byStrategy: Record<string, number>;
  byStatus: Record<string, number>;
  ledgerFrozen: boolean;
  unhandledRejections: number;
  uncaughtExceptions: number;
}

interface Strategy {
  name: string;
  category: string;
  description: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "/api";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ff4455",
  high: "#ff884c",
  medium: "#ffc84c",
  low: "#7ee3ff",
  info: "#7cff9a",
};

const STATUS_COLOR: Record<string, string> = {
  healed: "#7cff9a",
  failed: "#ff8a8a",
  escalated: "#ff4455",
  ok: "#7ee3ff",
  noop: "#888",
};

export default function AutoHealerPage() {
  const [incidents, setIncidents] = useState<HealingIncident[]>([]);
  const [stats, setStats] = useState<HealingStats | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [incRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/auto-healer/incidents?limit=100`).then(r => r.json()),
        fetch(`${API_BASE}/auto-healer/stats`).then(r => r.json()),
      ]);
      if (incRes?.ok) setIncidents(incRes.incidents as HealingIncident[]);
      if (statsRes?.ok) {
        setStats(statsRes as HealingStats);
        setStrategies(statsRes.strategies as Strategy[]);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen p-6 text-cyan-100" data-testid="page-auto-healer">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs tracking-[0.25em] text-cyan-400/70 uppercase">Self-Healing Engine</div>
            <h1 className="text-2xl font-light mt-1">Auto-Healer · 10 autonomous fix strategies</h1>
            <div className="text-xs text-cyan-300/60 mt-1">
              Detects issues every 45s and fixes them without human intervention · every action logged to the sovereign ledger
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-2 rounded-md text-xs tracking-wider ${stats?.enabled ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-300" : "bg-rose-500/10 border border-rose-500/40 text-rose-300"}`}>
              {stats?.enabled ? "ACTIVE" : "DISABLED"}
            </div>
            <button
              onClick={load}
              className="px-3 py-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-xs tracking-wider hover:bg-cyan-500/20"
              data-testid="button-refresh"
            >
              REFRESH
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Tile label="Total Runs" value={stats?.totalRuns ?? 0} />
          <Tile label="Healed" value={stats?.totalHealed ?? 0} color="#7cff9a" />
          <Tile label="Failed" value={stats?.totalFailed ?? 0} color="#ff8a8a" />
          <Tile label="Escalated" value={stats?.totalEscalated ?? 0} color="#ff4455" />
          <Tile label="Strategies" value={stats?.strategiesConfigured ?? 0} />
        </div>

        {stats?.ledgerFrozen && (
          <div className="p-4 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200">
            <div className="font-semibold tracking-wide">⚠ LEDGER QUARANTINED</div>
            <div className="text-xs mt-1 opacity-80">
              Tamper detected — ledger writes are frozen. Rotate SOVEREIGN_LEDGER_SECRET and replay from last-good state.
            </div>
          </div>
        )}

        <div>
          <div className="text-xs tracking-widest text-cyan-400/60 uppercase mb-2">Strategies</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {strategies.map(s => (
              <div key={s.name} className="p-3 rounded-lg border border-cyan-500/15 bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <div className="font-mono text-cyan-200 text-sm">{s.name}</div>
                  <div className="text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">{s.category}</div>
                </div>
                <div className="text-xs text-cyan-300/60 mt-1">{s.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs tracking-widest text-cyan-400/60 uppercase mb-2">Recent Incidents</div>
          {loading && incidents.length === 0 && <div className="text-cyan-400/50 text-sm">Loading…</div>}
          {!loading && incidents.length === 0 && (
            <div className="text-cyan-400/50 text-sm italic text-center py-8 border border-cyan-500/10 rounded-lg">
              All systems nominal — no healing incidents recorded yet.
            </div>
          )}
          <div className="space-y-2">
            {incidents.map(i => (
              <div key={i.id} className="p-4 rounded-lg border border-cyan-500/15 bg-slate-900/40">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="px-2 py-0.5 rounded text-[10px] tracking-wider border" style={{ color: SEVERITY_COLOR[i.severity], borderColor: `${SEVERITY_COLOR[i.severity]}55`, background: `${SEVERITY_COLOR[i.severity]}12` }}>
                      {i.severity.toUpperCase()}
                    </div>
                    <div className="px-2 py-0.5 rounded text-[10px] tracking-wider border" style={{ color: STATUS_COLOR[i.status], borderColor: `${STATUS_COLOR[i.status]}55`, background: `${STATUS_COLOR[i.status]}12` }}>
                      {i.status.toUpperCase()}
                    </div>
                    <div className="font-mono text-cyan-200 text-sm">{i.strategy}</div>
                  </div>
                  <div className="text-[10px] text-cyan-400/50 font-mono">{new Date(i.ts).toLocaleString()}</div>
                </div>
                <div className="mt-2 grid md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-cyan-400/60 tracking-wider uppercase text-[9px]">Detected</div>
                    <div className="text-cyan-100 mt-0.5">{i.detected}</div>
                  </div>
                  <div>
                    <div className="text-cyan-400/60 tracking-wider uppercase text-[9px]">Action</div>
                    <div className="text-cyan-100 mt-0.5">{i.action}</div>
                  </div>
                  <div>
                    <div className="text-cyan-400/60 tracking-wider uppercase text-[9px]">Outcome</div>
                    <div className="text-cyan-100 mt-0.5">{i.outcome}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="p-3 rounded-lg border border-cyan-500/20 bg-slate-900/40">
      <div className="text-[10px] tracking-widest text-cyan-400/60 uppercase">{label}</div>
      <div className="mt-1 text-2xl font-light" style={{ color: color ?? "#e8f4ff" }}>{value}</div>
    </div>
  );
}
