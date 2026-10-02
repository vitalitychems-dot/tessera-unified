import { useEffect, useState } from "react";

interface LedgerEntry {
  index: number;
  ts: number;
  kind: string;
  actor: string;
  payload: Record<string, unknown>;
  prevHash: string;
  hash: string;
  signature: string;
}

interface Verification {
  ok: boolean;
  entries: number;
  firstBadIndex: number | null;
  reason?: string;
}

interface LedgerStats {
  entries: number;
  byKind: Record<string, number>;
  firstTs: number | null;
  lastTs: number | null;
  lastHash: string;
  genesisHash: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "/api";

const KIND_LABELS: Record<string, { label: string; color: string }> = {
  "council-meeting": { label: "Council Meeting", color: "#ba6bff" },
  "council-decision": { label: "Decision", color: "#7ee3ff" },
  "agent-attestation": { label: "Attestation", color: "#7cff9a" },
  "red-team-finding": { label: "Red-Team", color: "#ff8a9a" },
  "self-check": { label: "Self-Check", color: "#ffd27e" },
  "system-event": { label: "System", color: "#8aa" },
};

export default function CouncilTranscriptPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [kindFilter, setKindFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const q = kindFilter ? `?kind=${encodeURIComponent(kindFilter)}&limit=200` : "?limit=200";
      const [lr, vr] = await Promise.all([
        fetch(`${API_BASE}/sovereign-ledger${q}`).then(r => r.json()),
        fetch(`${API_BASE}/sovereign-ledger/verify`).then(r => r.json()),
      ]);
      if (lr?.ok) {
        setEntries((lr.entries as LedgerEntry[]).slice().reverse());
        setStats(lr.stats as LedgerStats);
      }
      if (vr?.ok) setVerification(vr.verification as Verification);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [kindFilter]);

  async function runRedTeam() {
    try {
      await fetch(`${API_BASE}/red-team/sweep`, { method: "POST" });
      load();
    } catch {}
  }

  return (
    <div className="min-h-screen p-6 text-cyan-100" data-testid="page-council-transcript">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs tracking-[0.25em] text-cyan-400/70 uppercase">Sovereign Ledger</div>
            <h1 className="text-2xl font-light mt-1">Council Transcript & Audit Chain</h1>
            <div className="text-xs text-cyan-300/60 mt-1">
              Hash-chained · HMAC-signed · tamper-evident · every council action sealed
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runRedTeam}
              className="px-3 py-2 rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs tracking-wider hover:bg-rose-500/20"
              data-testid="button-run-red-team"
            >
              RUN RED-TEAM SWEEP
            </button>
            <button
              onClick={load}
              className="px-3 py-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-xs tracking-wider hover:bg-cyan-500/20"
              data-testid="button-refresh"
            >
              REFRESH
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Total Entries" value={stats?.entries ?? "—"} />
          <StatTile
            label="Chain Integrity"
            value={
              verification?.ok
                ? <span className="text-emerald-400">VERIFIED</span>
                : verification
                  ? <span className="text-rose-400">TAMPER @ #{verification.firstBadIndex}</span>
                  : "—"
            }
          />
          <StatTile label="Genesis" value={stats ? shortHash(stats.genesisHash) : "—"} mono />
          <StatTile label="Last Hash" value={stats ? shortHash(stats.lastHash) : "—"} mono />
        </div>

        <div className="flex gap-2 flex-wrap">
          <KindChip active={kindFilter === ""} onClick={() => setKindFilter("")} label="all" count={stats?.entries} />
          {stats && Object.entries(stats.byKind).map(([k, n]) => (
            <KindChip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)} label={KIND_LABELS[k]?.label ?? k} count={n} color={KIND_LABELS[k]?.color} />
          ))}
        </div>

        {err && <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300 text-sm">{err}</div>}
        {loading && entries.length === 0 && <div className="text-cyan-400/60 text-sm">Loading ledger…</div>}

        <div className="space-y-2">
          {entries.map(e => {
            const meta = KIND_LABELS[e.kind] ?? { label: e.kind, color: "#7ee3ff" };
            return (
              <div
                key={`${e.index}-${e.hash}`}
                className="p-4 rounded-lg border border-cyan-500/15 bg-slate-900/40 backdrop-blur"
                data-testid={`ledger-entry-${e.index}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div
                      className="px-2 py-0.5 rounded text-[10px] tracking-wider border"
                      style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}12` }}
                    >
                      {meta.label.toUpperCase()}
                    </div>
                    <div className="text-cyan-100 font-medium">#{e.index} · {e.actor}</div>
                  </div>
                  <div className="text-[10px] text-cyan-400/50 font-mono">
                    {new Date(e.ts).toLocaleString()}
                  </div>
                </div>

                <pre className="mt-2 text-xs text-cyan-200/80 whitespace-pre-wrap font-mono bg-black/30 p-2 rounded overflow-x-auto">
{JSON.stringify(e.payload, null, 2)}
                </pre>

                <div className="mt-2 flex gap-3 text-[10px] text-cyan-400/50 font-mono flex-wrap">
                  <span>prev: {shortHash(e.prevHash)}</span>
                  <span>hash: {shortHash(e.hash)}</span>
                  <span>sig: {shortHash(e.signature)}</span>
                </div>
              </div>
            );
          })}
          {!loading && entries.length === 0 && (
            <div className="text-cyan-400/50 text-sm italic text-center py-8">
              No ledger entries yet. The first council session will seal shortly.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="p-3 rounded-lg border border-cyan-500/20 bg-slate-900/40">
      <div className="text-[10px] tracking-widest text-cyan-400/60 uppercase">{label}</div>
      <div className={`mt-1 text-lg ${mono ? "font-mono text-sm" : ""}`}>{value}</div>
    </div>
  );
}

function KindChip({ active, onClick, label, count, color }: { active: boolean; onClick: () => void; label: string; count?: number; color?: string }) {
  const c = color ?? "#7ee3ff";
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-[11px] tracking-wide border transition"
      style={{
        borderColor: active ? c : `${c}40`,
        background: active ? `${c}22` : "transparent",
        color: active ? "#fff" : c,
      }}
      data-testid={`chip-kind-${label}`}
    >
      {label}{count !== undefined ? ` · ${count}` : ""}
    </button>
  );
}

function shortHash(h: string): string {
  if (!h) return "—";
  return h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-4)}` : h;
}
