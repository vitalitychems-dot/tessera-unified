import { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "/api";

async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { headers: { "X-Sigil-Key": "plain" } });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}
async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Sigil-Key": "plain" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

interface VoteRow { member: string; role: string; vote: string; weight: number; rationale: string }
interface ResultRow {
  id: string; title: string; passed: boolean; threshold: number;
  tally: { yea: number; nay: number; abstain: number; weightedYea: number; weightedTotal: number };
  votes: VoteRow[];
}
interface SessionFull {
  id: string; seed: string; convenedAt: string; adopted: number;
  proposalQuorumRequired: number; meetsQuorum: boolean;
  proposals: Array<{ id: string; title: string; spec: string; acceptance: string }>;
  results: ResultRow[];
  transcript: Array<{ speaker: string; role: string; content: string }>;
  members: Array<{ name: string; role: string; domain: string }>;
}

type Tab = "sessions" | "vgpu" | "mssp" | "constants";

export default function GrandCouncilDeliberationPage() {
  const [tab, setTab] = useState<Tab>("sessions");
  const [sessions, setSessions] = useState<Array<{ id: string; seed: string; convenedAt: string; adopted: number; meetsQuorum: boolean }>>([]);
  const [active, setActive] = useState<SessionFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [seed, setSeed] = useState("");
  const [constants, setConstants] = useState<Record<string, unknown> | null>(null);

  // vGPU panel
  const [vgpuInfo, setVgpuInfo] = useState<Record<string, unknown> | null>(null);
  const [vgpuTick, setVgpuTick] = useState(0);
  const [program, setProgram] = useState(
    "# clear with cosmic indigo\n☉ #061026\n# golden block\nrect 10 10 60 30 #ffaa00\n# triangle\n△ 80 8 138 60 90 80 #00d8ff\n# horizon\nline 0 70 144 70 #ffffff\n# label\ntext 5 78 SOVEREIGN #ffffff",
  );

  // MSSP panel
  const [expression, setExpression] = useState("A | ☉ | veritas & ?△");
  const [mssp, setMssp] = useState<{ amplitudes: Array<{ state: string; amplitude: number }>; collapsed: { state: string; amplitude: number }; alphabetSize: number; occupancy: number } | null>(null);
  const [msspErr, setMsspErr] = useState<string | null>(null);
  type MsspHistoryEntry = { expression: string; collapsedState: string; amplitude: number; at: number };
  const MSSP_HISTORY_KEY = "tessera.mssp.history.v1";
  const MSSP_HISTORY_MAX = 10;
  const [msspHistory, setMsspHistory] = useState<MsspHistoryEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(MSSP_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((e): e is MsspHistoryEntry =>
          e && typeof e.expression === "string"
            && typeof e.collapsedState === "string"
            && typeof e.amplitude === "number"
            && typeof e.at === "number")
        .slice(0, MSSP_HISTORY_MAX);
    } catch { return []; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(MSSP_HISTORY_KEY, JSON.stringify(msspHistory)); } catch { /* ignore */ }
  }, [msspHistory]);

  const refresh = async () => {
    try {
      const s = await getJSON<{ sessions: typeof sessions }>("/grand-council/sessions");
      setSessions(s.sessions);
      if (s.sessions[0] && !active) {
        const full = await getJSON<{ session: SessionFull }>(`/grand-council/sessions/${s.sessions[0].id}`);
        setActive(full.session);
      }
      const c = await getJSON<{ constants: Record<string, unknown> }>("/grand-council/constants");
      setConstants(c.constants);
    } catch (e) { setErr(String(e)); }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    if (tab !== "vgpu") return;
    const id = setInterval(() => setVgpuTick(t => t + 1), 1500);
    return () => clearInterval(id);
  }, [tab]);
  useEffect(() => {
    if (tab !== "vgpu") return;
    getJSON<{ info: Record<string, unknown> }>("/vgpu/info").then(d => setVgpuInfo(d.info)).catch(() => {});
  }, [tab, vgpuTick]);

  const convene = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await postJSON<{ session: SessionFull }>("/grand-council/convene", seed ? { seed } : {});
      setActive(r.session);
      await refresh();
    } catch (e) { setErr(String(e)); } finally { setLoading(false); }
  };

  const submitProgram = async () => {
    try { await postJSON("/vgpu/cmd", { program }); } catch (e) { alert(String(e)); }
  };
  const evalExpr = async () => {
    setMsspErr(null);
    try {
      const r = await postJSON<{ result: NonNullable<typeof mssp> }>("/mssp/eval", { expression });
      setMssp(r.result);
      const entry: MsspHistoryEntry = {
        expression,
        collapsedState: r.result.collapsed.state,
        amplitude: r.result.collapsed.amplitude,
        at: Date.now(),
      };
      setMsspHistory(prev => [entry, ...prev].slice(0, MSSP_HISTORY_MAX));
    } catch (e) { setMsspErr(String(e)); }
  };

  const headerStat = useMemo(() => {
    if (!active) return null;
    return `${active.adopted}/${active.proposals.length} adopted · quorum ${active.proposalQuorumRequired}`;
  }, [active]);

  return (
    <div style={{ padding: "1rem 1.5rem", color: "#e8e6ff", background: "linear-gradient(180deg,#0a0613 0%,#1a0d2e 100%)", minHeight: "100vh", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 1 }}>Grand Council · vGPU · Multi-State Core</h1>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{headerStat}</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["sessions", "vgpu", "mssp", "constants"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "6px 12px", border: "1px solid #555", borderRadius: 4, background: tab === t ? "#3a2858" : "transparent", color: "inherit", cursor: "pointer", textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {err && <div style={{ color: "#ff8080", fontSize: 12, marginBottom: 8 }}>{err}</div>}

      {tab === "sessions" && (
        <section>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input placeholder="seed (optional, blank = cosmic time)" value={seed} onChange={e => setSeed(e.target.value)}
              style={{ flex: 1, padding: 6, background: "#0e0820", color: "#fff", border: "1px solid #444", borderRadius: 4 }} />
            <button onClick={convene} disabled={loading}
              style={{ padding: "6px 16px", background: "#5b3aa1", color: "white", border: 0, borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>
              {loading ? "Convening…" : "Convene Council"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 13, opacity: 0.7, margin: "0 0 6px" }}>Sessions</h3>
              {sessions.length === 0 && <div style={{ fontSize: 12, opacity: 0.6 }}>No sessions yet.</div>}
              {sessions.map(s => (
                <div key={s.id} onClick={async () => {
                  const full = await getJSON<{ session: SessionFull }>(`/grand-council/sessions/${s.id}`);
                  setActive(full.session);
                }}
                  style={{ padding: 8, marginBottom: 6, border: "1px solid #333", borderRadius: 4, cursor: "pointer", background: active?.id === s.id ? "#2a1f4a" : "transparent" }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{s.id}</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>{new Date(s.convenedAt).toLocaleTimeString()}</div>
                  <div style={{ fontSize: 10, color: s.meetsQuorum ? "#90ee90" : "#ffaa66" }}>
                    {s.adopted}/10 {s.meetsQuorum ? "· QUORUM" : "· deferred"}
                  </div>
                </div>
              ))}
            </div>
            <div>
              {!active && <div style={{ opacity: 0.6, fontSize: 13 }}>Pick or convene a session.</div>}
              {active && (
                <>
                  <h3 style={{ fontSize: 14, marginTop: 0 }}>Adoption table — seed <code>{active.seed}</code></h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: "#1a1230" }}>
                        <th style={th}>Proposal</th><th style={th}>Yea</th><th style={th}>Nay</th><th style={th}>Abstain</th><th style={th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.results.map(r => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #222" }}>
                          <td style={td}><b>{r.id}</b> {r.title}</td>
                          <td style={td}>{r.tally.yea}</td>
                          <td style={td}>{r.tally.nay}</td>
                          <td style={td}>{r.tally.abstain}</td>
                          <td style={{ ...td, color: r.passed ? "#90ee90" : "#ffaa66", fontWeight: 600 }}>
                            {r.passed ? "ADOPTED" : "DEFERRED"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <h3 style={{ fontSize: 14 }}>Transcript</h3>
                  <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #333", borderRadius: 4, padding: 8, background: "#0a0518" }}>
                    {active.transcript.map((u, i) => (
                      <div key={i} style={{ padding: "4px 0", fontSize: 12, borderBottom: "1px dashed #222" }}>
                        <span style={{ color: "#a08adf" }}><b>{u.speaker}</b> <i style={{ opacity: 0.6 }}>({u.role})</i>:</span> {u.content}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === "vgpu" && (
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, marginTop: 0 }}>Live frame</h3>
            <img alt="vgpu" src={`${API}/vgpu/frame.png?t=${vgpuTick}`}
              style={{ width: "100%", maxWidth: 432, imageRendering: "pixelated", border: "1px solid #444", background: "#000" }} />
            <pre style={{ fontSize: 11, background: "#0a0518", padding: 8, marginTop: 8, border: "1px solid #333", borderRadius: 4 }}>
{vgpuInfo ? JSON.stringify(vgpuInfo, null, 2) : "—"}
            </pre>
          </div>
          <div>
            <h3 style={{ fontSize: 14, marginTop: 0 }}>Glyph draw program</h3>
            <textarea value={program} onChange={e => setProgram(e.target.value)}
              style={{ width: "100%", height: 220, background: "#0a0518", color: "#cfe", border: "1px solid #333", borderRadius: 4, padding: 8, fontFamily: "monospace", fontSize: 12 }} />
            <button onClick={submitProgram}
              style={{ marginTop: 8, padding: "6px 16px", background: "#3aa15b", color: "white", border: 0, borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>
              Submit to vGPU
            </button>
            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
              Glyph opcodes: <code>☉</code> clear · <code>□</code> rect · <code>△</code> triangle · <code>◇</code> line · <code>⬡</code> text · <code>⬢</code> blit · <code>✶</code> shaderStub.
              ASCII opcodes (rect/line/etc) also accepted. φ-aligned 144 × 89 canvas.
            </p>
          </div>
        </section>
      )}

      {tab === "mssp" && (
        <section>
          <h3 style={{ fontSize: 14, marginTop: 0 }}>Multi-State Symbolic Processor playground</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={expression} onChange={e => setExpression(e.target.value)}
              style={{ flex: 1, padding: 8, background: "#0e0820", color: "#fff", border: "1px solid #444", borderRadius: 4, fontFamily: "monospace" }} />
            <button onClick={evalExpr}
              style={{ padding: "6px 16px", background: "#5b3aa1", color: "white", border: 0, borderRadius: 4, cursor: "pointer", fontWeight: 600 }}>
              Evaluate
            </button>
          </div>
          <p style={{ fontSize: 11, opacity: 0.7 }}>
            Operators: <code>|</code> compose, <code>&amp;</code> intersect, <code>^</code> symmetric, <code>*</code> uniform, <code>?G</code> escape glyph G.
            Alphabet has {constants?.MSSP_STATE_COUNT ? String(constants.MSSP_STATE_COUNT) : "—"} states.
          </p>
          {msspErr && <div style={{ color: "#ff8080" }}>{msspErr}</div>}
          <div style={{ marginTop: 12, border: "1px solid #333", borderRadius: 4, background: "#0a0518" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderBottom: "1px solid #222" }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>History · last {MSSP_HISTORY_MAX}</span>
              {msspHistory.length > 0 && (
                <button onClick={() => setMsspHistory([])}
                  style={{ fontSize: 11, padding: "2px 8px", background: "transparent", color: "#a08adf", border: "1px solid #3a2858", borderRadius: 3, cursor: "pointer" }}>
                  Clear
                </button>
              )}
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {msspHistory.length === 0 && <div style={{ padding: 10, fontSize: 11, opacity: 0.5 }}>No evaluations yet. Hit Evaluate to begin.</div>}
              {msspHistory.map((h, i) => (
                <div key={`${h.at}-${i}`} onClick={() => setExpression(h.expression)}
                  title="Click to restore expression"
                  style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 10px", borderBottom: "1px dashed #1f1730", cursor: "pointer", fontSize: 12, fontFamily: "monospace" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.expression}</span>
                  <span style={{ color: "#90ee90", minWidth: 80, textAlign: "right" }}>{h.collapsedState}</span>
                  <span style={{ opacity: 0.7, minWidth: 56, textAlign: "right" }}>{h.amplitude.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
          {mssp && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13 }}>
                Collapsed → <b style={{ color: "#90ee90" }}>{mssp.collapsed.state}</b> @ {mssp.collapsed.amplitude.toFixed(3)}
                <span style={{ opacity: 0.6 }}> · occupancy {mssp.occupancy} / {mssp.alphabetSize}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                {mssp.amplitudes.slice(0, 24).map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "monospace" }}>
                    <span style={{ width: 80 }}>{a.state}</span>
                    <div style={{ flex: 1, height: 8, background: "#221538", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${a.amplitude * 100}%`, background: "linear-gradient(90deg,#5b3aa1,#9d6cff)", borderRadius: 2 }} />
                    </div>
                    <span style={{ width: 60, textAlign: "right" }}>{a.amplitude.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "constants" && (
        <section>
          <h3 style={{ fontSize: 14, marginTop: 0 }}>Sovereign constants (single source of truth)</h3>
          <pre style={{ fontSize: 12, background: "#0a0518", padding: 12, border: "1px solid #333", borderRadius: 4 }}>
{constants ? JSON.stringify(constants, null, 2) : "—"}
          </pre>
        </section>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "6px 8px", fontWeight: 600, fontSize: 11, opacity: 0.85 };
const td: React.CSSProperties = { padding: "6px 8px", verticalAlign: "top" };
