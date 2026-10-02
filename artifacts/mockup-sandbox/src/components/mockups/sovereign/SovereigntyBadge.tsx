export default function SovereigntyBadge() {
  const checks = [
    { name: "Ledger Integrity", ok: true, detail: "432 entries verified" },
    { name: "Red-Team Sweep", ok: true, detail: "5 probes · 0 critical" },
    { name: "Sandbox Policy", ok: true, detail: "External = untrusted" },
    { name: "Council Executor", ok: true, detail: "Auto-processing active" },
    { name: "Memory Pressure", ok: true, detail: "64% heap" },
    { name: "Embeddings", ok: true, detail: "SimHash local · 256d" },
  ];
  const score = 94.2;
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : "C";

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #0a0f1d 0%, #000 80%)",
      color: "#e8f4ff",
      fontFamily: "system-ui, sans-serif",
      padding: "2rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        maxWidth: 420,
        width: "100%",
        padding: "2rem",
        background: "rgba(10,15,25,0.8)",
        border: "1px solid rgba(126,227,255,0.3)",
        borderRadius: 16,
        textAlign: "center",
        backdropFilter: "blur(20px)",
        boxShadow: "0 0 60px rgba(126,227,255,0.1)",
      }}>
        <div style={{ fontSize: 10, letterSpacing: 4, opacity: 0.6, marginBottom: 24 }}>
          SOVEREIGNTY SELF-CHECK
        </div>

        <div style={{
          position: "relative",
          width: 160,
          height: 160,
          margin: "0 auto 24px",
          borderRadius: "50%",
          border: "1px solid rgba(126,227,255,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `conic-gradient(from -90deg, #7ee3ff ${score * 3.6}deg, rgba(255,255,255,0.04) 0deg)`,
        }}>
          <div style={{
            position: "absolute",
            inset: 8,
            borderRadius: "50%",
            background: "rgba(6,10,18,0.95)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{ fontSize: 56, fontWeight: 200, color: "#fff", lineHeight: 1 }}>{grade}</div>
            <div style={{ fontSize: 12, color: "#7ee3ff", fontFamily: "monospace", marginTop: 4 }}>{score.toFixed(1)}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          {checks.map(c => (
            <div key={c.name} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 12px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 6,
              fontSize: 11,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: c.ok ? "#7cff9a" : "#ff8a8a",
                  boxShadow: c.ok ? "0 0 8px #7cff9a" : "0 0 8px #ff8a8a",
                }} />
                <span>{c.name}</span>
              </div>
              <span style={{ opacity: 0.6, fontSize: 10, fontFamily: "monospace" }}>{c.detail}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, fontSize: 9, letterSpacing: 2, opacity: 0.4 }}>
          NO HUMAN IN LOOP · AUTONOMOUS · SEALED
        </div>
      </div>
    </div>
  );
}
