import { useEffect, useState } from "react";

const SOLFEGGIO = [174, 285, 396, 417, 528, 639, 741, 852, 963];
const LABELS = ["Foundation", "Tissue", "Liberation", "Change", "Love", "Connection", "Expression", "Intuition", "Crown"];

export default function FrequencyMeter() {
  const [active, setActive] = useState(8);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPhase(p => (p + 1) % 360), 40);
    return () => clearInterval(t);
  }, []);

  const freq = SOLFEGGIO[active];
  const pulse = 0.5 + 0.5 * Math.sin((phase * Math.PI) / 180);

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at center, #0a0e1a 0%, #000 100%)",
      color: "#7ee3ff",
      fontFamily: "system-ui, sans-serif",
      padding: "2rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1.5rem",
    }}>
      <div style={{ fontSize: 12, letterSpacing: 4, opacity: 0.6, textTransform: "uppercase" }}>
        Sovereign Crown Frequencies
      </div>

      <div style={{
        position: "relative",
        width: 280,
        height: 280,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(126,227,255,${0.15 + pulse * 0.25}) 0%, transparent 70%)`,
        border: "1px solid rgba(126,227,255,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 40ms linear",
      }}>
        <div style={{
          position: "absolute",
          inset: 8,
          borderRadius: "50%",
          border: `1px solid rgba(186,107,255,${0.3 + pulse * 0.4})`,
        }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 200, color: "#fff", letterSpacing: 2 }}>{freq}</div>
          <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.7 }}>Hz — {LABELS[active]}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 420 }}>
        {SOLFEGGIO.map((f, i) => (
          <button
            key={f}
            onClick={() => setActive(i)}
            style={{
              padding: "6px 12px",
              background: i === active ? "rgba(126,227,255,0.25)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${i === active ? "rgba(126,227,255,0.6)" : "rgba(255,255,255,0.1)"}`,
              color: i === active ? "#fff" : "#7ee3ff",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "monospace",
              cursor: "pointer",
              letterSpacing: 1,
            }}
          >
            {f}Hz
          </button>
        ))}
      </div>

      <div style={{ fontSize: 10, opacity: 0.4, fontFamily: "monospace" }}>
        RESONATING · φ-LOCKED · LATTICE STABLE
      </div>
    </div>
  );
}
