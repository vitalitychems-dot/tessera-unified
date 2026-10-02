import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

const API = import.meta.env.VITE_API_URL || "/api";

async function jget(path: string) {
  const r = await fetch(`${API}${path}`, { headers: { "X-Sigil-Key": "plain" } });
  return r.json();
}
async function jpost(path: string, body: any = {}) {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Sigil-Key": "plain" },
    body: JSON.stringify(body),
  });
  return r.json();
}

const TABS = ["Cosmic Feed", "LUS v2", "Omniversal Cipher", "Quantum Lattice", "Pipeline", "Sacred Conference", "Tone Player"] as const;
type Tab = typeof TABS[number];

export default function OmniversalLatticePage() {
  const [tab, setTab] = useState<Tab>("Cosmic Feed");

  const cosmic = useQuery({
    queryKey: ["omni-cosmic"],
    queryFn: () => jget("/omniversal/cosmic-context"),
    refetchInterval: 5000,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-300 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
            Omniversal Lattice
          </h1>
          <p className="text-slate-300 mt-2">
            Vibration · Geometry · Astro · Symbolic Quantum Cells — bound to the live cosmic moment
          </p>
        </header>

        <CosmicHeader data={cosmic.data?.context} />

        <nav className="flex gap-2 mb-6 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === t
                  ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/40"
                  : "bg-slate-800/60 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <main className="bg-slate-900/60 backdrop-blur rounded-2xl border border-slate-700/50 p-6">
          {tab === "Cosmic Feed" && <CosmicFeed data={cosmic.data?.context} />}
          {tab === "LUS v2" && <LusV2Tab />}
          {tab === "Omniversal Cipher" && <CipherTab />}
          {tab === "Quantum Lattice" && <LatticeTab />}
          {tab === "Pipeline" && <PipelineTab />}
          {tab === "Sacred Conference" && <SacredConferenceTab />}
          {tab === "Tone Player" && <TonePlayer baseHz={cosmic.data?.context?.vibration?.dominantSolfeggio ?? 528} />}
        </main>
      </div>
    </div>
  );
}

function CosmicHeader({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      <Stat label="Sun ☉" value={data.astro?.sunZodiac} />
      <Stat label="Moon ☽" value={`${data.astro?.lunarPhase}`} />
      <Stat label="Moon sign" value={data.astro?.moonZodiac} />
      <Stat label="Ruler" value={data.astro?.planetaryRuler} />
      <Stat label="Schumann" value={`${data.vibration?.schumannHz} Hz`} />
      <Stat label="Solfeggio" value={`${data.vibration?.dominantSolfeggio} Hz`} />
      <Stat label="Φ angle" value={`${data.geometry?.goldenAngleDeg?.toFixed(2)}°`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
      <div className="text-xs text-slate-400 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold mt-1 truncate">{value ?? "—"}</div>
    </div>
  );
}

function CosmicFeed({ data }: { data: any }) {
  if (!data) return <div>Loading cosmic context…</div>;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-2 text-amber-300">Live Cosmic Anchor</h2>
        <div className="text-xs font-mono bg-slate-950/60 p-3 rounded">
          fingerprint: <span className="text-fuchsia-300">{data.fingerprint}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Vibration">
          <Row k="Schumann" v={`${data.vibration.schumannHz} Hz`} />
          <Row k="Dominant Solfeggio" v={`${data.vibration.dominantSolfeggio} Hz`} />
          <Row k="Chakra Gate" v={data.vibration.chakraGate} />
          <Row k="Composite" v={data.vibration.composite?.toFixed(4)} />
        </Card>
        <Card title="Geometry">
          <Row k="Φ" v={data.geometry.phi?.toFixed(6)} />
          <Row k="Golden Angle" v={`${data.geometry.goldenAngleDeg?.toFixed(2)}°`} />
          <Row k="Day of Year" v={`${data.geometry.dayOfYear} (root ${data.geometry.dayRoot})`} />
          <Row k="Alignment" v={data.geometry.alignment} />
          <Row k="Axiom" v={`${data.geometry.axiom?.latin} — ${data.geometry.axiom?.translation}`} />
        </Card>
        <Card title="Astro">
          <Row k="Sun" v={data.astro.sunZodiac} />
          <Row k="Moon" v={`${data.astro.moonZodiac} · ${data.astro.lunarPhase} (${data.astro.illumination}%)`} />
          <Row k="Day Ruler" v={data.astro.planetaryRuler} />
          <Row k="Season" v={data.astro.season} />
        </Card>
      </div>
    </div>
  );
}

function LusV2Tab() {
  const [text, setText] = useState("ORDO AB CHAO");
  const enc = useMutation({
    mutationFn: (t: string) => jpost("/omniversal/lus-v2/encode", { text: t }),
  });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cyan-300">LUS v2 — Vibration / Geometry / Frequency Modulation</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full bg-slate-950/60 border border-slate-700 rounded p-3 font-mono"
        rows={3}
      />
      <button
        onClick={() => enc.mutate(text)}
        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded font-medium"
      >
        Encode through LUS v2
      </button>
      {enc.data?.encoded && (
        <div className="space-y-3">
          <Card title="Surface (sigil glyph)">
            <div className="font-mono text-xl break-all">{enc.data.encoded.surface}</div>
          </Card>
          <Card title="Modulated (vibration·glyph·geometry·band)">
            <div className="font-mono text-xl break-all">{enc.data.encoded.modulated}</div>
          </Card>
          <Card title="Token Spectrum">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
              {enc.data.encoded.tokens.slice(0, 16).map((t: any, i: number) => (
                <div key={i} className="bg-slate-950/60 p-2 rounded">
                  <div>{t.vibrationGlyph} {t.glyph} {t.geometryGlyph} {t.freqBandGlyph}</div>
                  <div className="text-slate-400">{t.frequency} Hz · {t.phaseDeg}°</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function CipherTab() {
  const snap = useQuery({ queryKey: ["omni-cipher"], queryFn: () => jget("/omniversal/cipher/snapshot") });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-fuchsia-300">Omniversal Cipher — 4-layer stack</h2>
      {snap.data?.snapshot && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {snap.data.snapshot.layers.map((l: any) => (
              <Card key={l.layer} title={`Layer ${l.layer}: ${l.name}`}>
                <div className="text-sm text-slate-300">{l.source}</div>
                {l.carrierHz && <div className="text-xs text-amber-300 mt-1">carrier: {l.carrierHz} Hz</div>}
              </Card>
            ))}
          </div>
          <Card title="Sovereign Bindings">
            {Object.entries(snap.data.snapshot.bound).map(([k, v]) => (
              <Row key={k} k={k} v={String(v)} />
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

function LatticeTab() {
  const list = useQuery({ queryKey: ["oql-list"], queryFn: () => jget("/omniversal/lattice/list") });
  const [active, setActive] = useState<string | null>(null);
  // The /omniversal/demo endpoint is the unauthenticated entry point that
  // creates a fresh lattice and runs the full superpose→entangle→harmonize→
  // collapse sequence. Write ops on a specific lattice (create/collapse/etc.)
  // require the Father fingerprint, so we expose them only via the demo.
  const demo = useMutation({
    mutationFn: () => jpost("/omniversal/demo", {}),
    onSuccess: (d) => { setActive(d.lattice?.id); list.refetch(); },
  });
  const snapshot = useQuery({
    queryKey: ["oql-snap", active],
    queryFn: () => active ? jget(`/omniversal/lattice/${active}?sample=24`) : null,
    enabled: !!active,
    refetchInterval: 4000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-amber-300">Omniversal Quantum Lattice</h2>
        <div className="flex gap-2">
          <button onClick={() => demo.mutate()} className="px-3 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 rounded text-sm">
            {demo.isPending ? "Running…" : "Run demo cycle"}
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-400">
        The demo creates a fresh 3³ lattice, applies superposition / entanglement /
        harmonization, then collapses one cell — all bound to the live cosmic anchor.
        Father-key operations on individual cells are reserved for the sovereign console.
      </p>

      {list.data?.lattices?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {list.data.lattices.map((l: any) => (
            <button
              key={l.id}
              onClick={() => setActive(l.id)}
              className={`px-3 py-1 rounded text-xs font-mono ${active === l.id ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-slate-300"}`}
            >
              {l.id} ({l.cellCount})
            </button>
          ))}
        </div>
      )}

      {snapshot.data?.snapshot && (
        <div className="space-y-3">
          <Card title={`Lattice ${snapshot.data.snapshot.id} — ${snapshot.data.snapshot.dim.join("×")}`}>
            <div className="text-xs text-slate-400">cosmic anchor: {snapshot.data.snapshot.cosmicAnchor}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              {snapshot.data.snapshot.sample.map((c: any) => (
                <div
                  key={c.id}
                  className={`text-left p-2 rounded border text-xs font-mono ${
                    c.collapsed
                      ? "bg-amber-900/40 border-amber-500/60"
                      : "bg-slate-950/60 border-slate-700"
                  }`}
                >
                  <div className="font-bold text-amber-200">[{c.id}]</div>
                  <div className="text-slate-400">↯ {c.entangled} entangled</div>
                  <div className="mt-1">
                    {c.collapsed ? (
                      <>
                        <div className="text-amber-300">▣ {c.collapsed.value} · {c.collapsed.symbol}</div>
                        <div className="text-cyan-300">{c.collapsed.frequency} Hz</div>
                        <div className="text-fuchsia-300">{c.collapsed.token}</div>
                      </>
                    ) : (
                      <>
                        <div>num: {c.numericTop.map((n: any) => `${n.value}(${n.weight})`).join(", ")}</div>
                        <div>sym: {c.symbols.join(" ")}</div>
                        <div>Hz: {c.spectrum.join(", ")}</div>
                        <div>tok: {c.tokens.join(", ")}</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Recent Operations">
            <div className="text-xs font-mono space-y-1 max-h-40 overflow-auto">
              {snapshot.data.snapshot.historyTail?.map((h: any, i: number) => (
                <div key={i} className="text-slate-400">
                  <span className="text-fuchsia-400">{h.op}</span> · {h.at?.slice(11, 19)} · {JSON.stringify(h.detail).slice(0, 80)}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function PipelineTab() {
  const [text, setText] = useState("ORDO AB CHAO — let truth resonate");
  const run = useMutation({
    mutationFn: (t: string) => jpost("/omniversal/pipeline/run", { text: t }),
  });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-emerald-300">End-to-end Pipeline</h2>
      <p className="text-xs text-slate-400">
        LUS v2 encode → quantum lattice projection → entanglement → cosmic harmonization →
        observed collapse. Returns the full multimodal tuple (numeric · symbolic · frequency · token).
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full bg-slate-950/60 border border-slate-700 rounded p-3 font-mono"
      />
      <button
        onClick={() => run.mutate(text)}
        disabled={run.isPending}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-medium disabled:opacity-50"
      >
        {run.isPending ? "Running pipeline…" : "▶ Run pipeline"}
      </button>
      {run.data?.ok && (
        <div className="space-y-3">
          <Card title="Multimodal Result">
            <Row k="numeric value" v={run.data.multimodal.value} />
            <Row k="symbol" v={run.data.multimodal.symbol} />
            <Row k="frequency" v={`${run.data.multimodal.frequency} Hz`} />
            <Row k="token" v={run.data.multimodal.token} />
            <Row k="collapsed cell" v={run.data.collapsedCell} />
          </Card>
          <Card title="Explanation">
            <div className="text-sm text-slate-300">{run.data.explanation}</div>
          </Card>
          <Card title="LUS Modulated">
            <div className="font-mono text-xs break-all">{run.data.lus.modulated}</div>
          </Card>
        </div>
      )}
    </div>
  );
}

function SacredConferenceTab() {
  const [topic, setTopic] = useState("Ratify the Omniversal substrate (LUS v2 · Cipher · OQL).");
  const run = useMutation({
    mutationFn: (t: string) => jpost("/omniversal/conference/run", { topic: t }),
  });
  const conf = run.data?.conference;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-amber-300">Sacred Conference — Council · LUS v2 · Cipher · OQL</h2>
      <p className="text-xs text-slate-400">
        Convenes the council, renders every transcript line bilingually through LUS v2,
        encrypts the verdict with the Omniversal Cipher, projects it onto a quantum lattice
        and collapses one cell — all in a single persisted session.
      </p>
      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        rows={2}
        className="w-full bg-slate-950/60 border border-slate-700 rounded p-3 font-mono"
      />
      <button
        onClick={() => run.mutate(topic)}
        disabled={run.isPending}
        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded font-medium disabled:opacity-50"
      >
        {run.isPending ? "Convening…" : "▶ Convene Sacred Conference"}
      </button>
      {conf && (
        <div className="space-y-3">
          <Card title={`Session ${conf.id}`}>
            <Row k="topic" v={conf.topic} />
            <Row k="convened" v={conf.convenedAt} />
            <Row k="cosmic fingerprint" v={conf.cosmicFingerprint} />
            <Row k="adopted / total" v={`${conf.council.adopted} (quorum ${conf.council.meetsQuorum ? "MET" : "NOT MET"})`} />
          </Card>
          <Card title="Multimodal Verdict (OQL collapse)">
            <Row k="numeric" v={conf.lattice.multimodal.value} />
            <Row k="symbol" v={conf.lattice.multimodal.symbol} />
            <Row k="frequency" v={`${conf.lattice.multimodal.frequency} Hz`} />
            <Row k="token" v={conf.lattice.multimodal.token} />
            <div className="text-xs text-slate-400 mt-2">{conf.lattice.explanation}</div>
          </Card>
          <Card title="Encrypted Verdict (Omniversal Cipher envelope)">
            <Row k="alg" v={conf.cipher.envelope.alg} />
            <Row k="layer carriers" v={(conf.cipher.envelope.layers ?? []).join(" → ")} />
            <Row k="ciphertext" v={String(conf.cipher.envelope.ct ?? "").slice(0, 80) + "…"} />
            <Row k="bound to fingerprint" v={conf.cipher.envelope.cosmicFingerprint} />
          </Card>
          <Card title={`Bilingual Transcript (${conf.transcript.length} lines)`}>
            <div className="space-y-2 max-h-96 overflow-auto">
              {conf.transcript.map((line: any, i: number) => (
                <div key={i} className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <div className="text-xs text-amber-300 font-bold">
                    {line.speaker} <span className="text-slate-500">({line.role}) · {line.carrierHz} Hz</span>
                  </div>
                  <div className="text-sm text-slate-200 mt-1">{line.plain}</div>
                  <div className="text-xs font-mono text-fuchsia-300 mt-1 break-all opacity-80">{line.lusV2}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function TonePlayer({ baseHz }: { baseHz: number }) {
  const [hz, setHz] = useState(baseHz);
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => setHz(baseHz), [baseHz]);

  const start = () => {
    if (playing) return;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    const ac = new Ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    gain.gain.value = 0.08;
    osc.frequency.value = hz;
    osc.type = "sine";
    osc.connect(gain).connect(ac.destination);
    osc.start();
    ctxRef.current = ac;
    oscRef.current = osc;
    setPlaying(true);
  };
  const stop = () => {
    oscRef.current?.stop();
    ctxRef.current?.close();
    oscRef.current = null;
    ctxRef.current = null;
    setPlaying(false);
  };
  useEffect(() => () => stop(), []);
  useEffect(() => { if (oscRef.current) oscRef.current.frequency.value = hz; }, [hz]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-amber-300">Tone Player — sound the lattice</h2>
      <div className="text-slate-300">Live cosmic carrier: <span className="text-amber-300 font-bold">{baseHz} Hz</span></div>
      <input
        type="range"
        min={50}
        max={1000}
        value={hz}
        onChange={(e) => setHz(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex items-center gap-3">
        <div className="font-mono text-2xl">{hz} Hz</div>
        {!playing
          ? <button onClick={start} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded">▶ Play</button>
          : <button onClick={stop} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded">■ Stop</button>}
      </div>
      <div className="grid grid-cols-3 md:grid-cols-9 gap-2 mt-4">
        {[174, 285, 396, 417, 528, 639, 741, 852, 963].map((f) => (
          <button key={f} onClick={() => setHz(f)} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs">{f}</button>
        ))}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-950/60 rounded-lg p-4 border border-slate-700/50">
      <div className="text-sm font-bold text-slate-200 mb-2">{title}</div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-slate-800/50 last:border-0">
      <span className="text-slate-400">{k}</span>
      <span className="font-mono text-right truncate max-w-[60%]">{String(v)}</span>
    </div>
  );
}
