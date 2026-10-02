import { useEffect, useState, useCallback } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE as string) || "/api";

interface Snapshot {
  workingMemory: { totalHypotheses: number; totalGoals: number; activeGoals: number; openContradictions: number };
  bus: { total: number; avgNovelty: number; avgAttention: number; byTopic: Record<string, number> };
  causal: { effects: Array<{ actionKey: string; metric: string; effectPerUnit: number; samples: number; confidence: number }>; open: number };
  plans: number;
  metacognition: {
    recent: Array<{ id: string; kind: string; severity: string; summary: string; recommendedAction?: string }>;
    bySeverity: { high: number; medium: number; low: number };
  };
  plannerState: { builtInventionCount: number; approvedProposalCount: number; openContradictions: number; lastSynthesisAt: number | null; tunableDriftCount: number };
}

interface Tunable { key: string; label: string; value: number; default: number; unit: string; percentOfRange: number; lastChangeReason: string }

export default function AGICorePage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [tunables, setTunables] = useState<Tunable[]>([]);
  const [goalInput, setGoalInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [s, t] = await Promise.all([
      fetch(`${API_BASE}/agi/snapshot`).then((r) => r.json()),
      fetch(`${API_BASE}/system/tunables`).then((r) => r.json()).catch(() => ({ tunables: [] })),
    ]);
    if (s.ok) setSnap(s);
    setTunables(t.tunables ?? []);
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 8000);
    return () => clearInterval(iv);
  }, [refresh]);

  async function runAction(label: string, url: string, opts?: RequestInit) {
    setBusy(label);
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, ...opts });
      const j = await r.json();
      setMsg(j.ok ? `${label}: OK` : `${label}: ${j.error || "failed"}`);
    } catch (e) {
      setMsg(`${label}: ${String(e)}`);
    } finally {
      setBusy(null);
      refresh();
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", color: "#e6e6e6", background: "#0a0a0f", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>AGI Core</h1>
      <p style={{ color: "#999", marginTop: 0, marginBottom: 24 }}>
        Five cognitive subsystems running live: working memory, inter-agent bus, causal world model, goal planner, metacognition loop.
      </p>

      {msg && <div style={{ padding: 8, background: "#1a2a1a", border: "1px solid #2a5", marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button disabled={busy !== null} onClick={() => runAction("Synthesize", `${API_BASE}/inventions/synthesize`, { body: "{}" })} style={btn}>
          {busy === "Synthesize" ? "…" : "Run Synthesis"}
        </button>
        <button disabled={busy !== null} onClick={() => runAction("Metacognition tick", `${API_BASE}/agi/metacognition/tick`)} style={btn}>
          {busy === "Metacognition tick" ? "…" : "Force Self-Audit"}
        </button>
        <input
          value={goalInput}
          onChange={(e) => setGoalInput(e.target.value)}
          placeholder='Enter a high-level goal e.g. "accelerate building"'
          style={{ flex: 1, minWidth: 240, padding: 8, background: "#111", color: "#eee", border: "1px solid #333" }}
        />
        <button
          disabled={busy !== null || !goalInput.trim()}
          onClick={() => {
            runAction("Create plan", `${API_BASE}/agi/plan`, { body: JSON.stringify({ goal: goalInput }) });
            setGoalInput("");
          }}
          style={btn}
        >Plan</button>
      </div>

      {snap && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
          <Card title="🧠 Working Memory" accent="#5af">
            <Kv k="Active goals" v={`${snap.workingMemory.activeGoals} / ${snap.workingMemory.totalGoals}`} />
            <Kv k="Hypotheses" v={snap.workingMemory.totalHypotheses} />
            <Kv k="Open contradictions" v={snap.workingMemory.openContradictions} />
          </Card>

          <Card title="📡 Agent Bus" accent="#fa5">
            <Kv k="Messages" v={snap.bus.total} />
            <Kv k="Avg novelty" v={snap.bus.avgNovelty.toFixed(2)} />
            <Kv k="Avg attention" v={snap.bus.avgAttention.toFixed(1)} />
            <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
              {Object.entries(snap.bus.byTopic).slice(0, 6).map(([t, n]) => (
                <span key={t} style={{ marginRight: 10 }}>{t}:{n}</span>
              ))}
            </div>
          </Card>

          <Card title="🧩 Causal World Model" accent="#f5a">
            <Kv k="Learned effects" v={snap.causal.effects.length} />
            <Kv k="Open experiments" v={snap.causal.open} />
            <div style={{ fontSize: 12, marginTop: 8 }}>
              {snap.causal.effects.slice(0, 5).map((e, i) => (
                <div key={i} style={{ padding: "4px 0", borderTop: "1px dashed #333" }}>
                  <code style={{ color: "#9cf" }}>{e.actionKey}</code> → <b>{e.metric}</b>
                  <span style={{ color: "#999", marginLeft: 8 }}>
                    {e.effectPerUnit > 0 ? "+" : ""}{e.effectPerUnit.toFixed(4)}/unit · {e.samples} samples · conf {(e.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
              {snap.causal.effects.length === 0 && <span style={{ color: "#666" }}>Effects appear after 5-min outcome windows close.</span>}
            </div>
          </Card>

          <Card title="🎯 Goal Planner" accent="#5f5">
            <Kv k="Active plans" v={snap.plans} />
            <Kv k="Built inventions" v={snap.plannerState.builtInventionCount} />
            <Kv k="Approved proposals" v={snap.plannerState.approvedProposalCount} />
            <Kv k="Last synthesis" v={snap.plannerState.lastSynthesisAt ? `${Math.round((Date.now() - snap.plannerState.lastSynthesisAt) / 1000)}s ago` : "never"} />
          </Card>

          <Card title="🔍 Metacognition" accent="#faa" wide>
            <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              <Pill label="High" n={snap.metacognition.bySeverity.high} color="#f44" />
              <Pill label="Medium" n={snap.metacognition.bySeverity.medium} color="#fa4" />
              <Pill label="Low" n={snap.metacognition.bySeverity.low} color="#4a4" />
            </div>
            {snap.metacognition.recent.length === 0 && <span style={{ color: "#666" }}>No findings yet — loop runs every 60s.</span>}
            {snap.metacognition.recent.map((f) => (
              <div key={f.id} style={{ padding: "6px 0", borderTop: "1px solid #222" }}>
                <span style={{ fontSize: 11, padding: "1px 6px", background: f.severity === "high" ? "#811" : f.severity === "medium" ? "#862" : "#282", borderRadius: 3 }}>{f.severity}</span>
                <span style={{ marginLeft: 8, color: "#bbb" }}>[{f.kind}]</span>
                <span style={{ marginLeft: 8 }}>{f.summary}</span>
                {f.recommendedAction && <div style={{ marginLeft: 8, fontSize: 12, color: "#8cf", marginTop: 2 }}>→ {f.recommendedAction}</div>}
              </div>
            ))}
          </Card>

          <Card title="⚙️ Live Tunables" accent="#aa5" wide>
            {tunables.map((t) => {
              const drifted = t.value !== t.default;
              return (
                <div key={t.key} style={{ padding: "8px 0", borderTop: "1px solid #222" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{t.label}</span>
                    <span style={{ color: drifted ? "#fa5" : "#6c6" }}>
                      {t.value}{t.unit} <span style={{ color: "#666" }}>/ default {t.default}{t.unit}</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#222", borderRadius: 3, marginTop: 4, overflow: "hidden" }}>
                    <div style={{ width: `${t.percentOfRange}%`, height: "100%", background: drifted ? "#fa5" : "#4a4" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>{t.lastChangeReason}</div>
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 14px",
  background: "#1a1a2a",
  border: "1px solid #44f",
  color: "#eee",
  cursor: "pointer",
  borderRadius: 4,
};

function Card({ title, accent, children, wide }: { title: string; accent: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ padding: 16, background: "#0f0f18", border: `1px solid ${accent}40`, borderLeft: `4px solid ${accent}`, borderRadius: 6, gridColumn: wide ? "1 / -1" : undefined }}>
      <h3 style={{ margin: 0, marginBottom: 12, color: accent }}>{title}</h3>
      {children}
    </div>
  );
}
function Kv({ k, v }: { k: string; v: string | number }) {
  return <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14 }}><span style={{ color: "#999" }}>{k}</span><span><b>{v}</b></span></div>;
}
function Pill({ label, n, color }: { label: string; n: number; color: string }) {
  return <span style={{ padding: "3px 10px", borderRadius: 10, background: color + "30", border: `1px solid ${color}`, fontSize: 12 }}>{label}: <b>{n}</b></span>;
}
