const VOTES = [
  { agent: "Alpha", vote: "approve", weight: 1.618, conf: 0.94, specialty: "security" },
  { agent: "Gamma", vote: "approve", weight: 1.618, conf: 0.89, specialty: "governance" },
  { agent: "Phi", vote: "approve", weight: 1.783, conf: 0.96, specialty: "governance" },
  { agent: "Sigma", vote: "approve", weight: 1.534, conf: 0.87, specialty: "security" },
  { agent: "Delta", vote: "reject", weight: 1.489, conf: 0.72, specialty: "security" },
  { agent: "Omega", vote: "approve", weight: 1.602, conf: 0.91, specialty: "infrastructure" },
  { agent: "Epsilon", vote: "abstain", weight: 1.0, conf: 0.5, specialty: "infrastructure" },
  { agent: "Zeta", vote: "approve", weight: 1.0, conf: 0.78, specialty: "community" },
];

export default function CouncilVoteCard() {
  const totalActive = VOTES.filter(v => v.vote !== "abstain");
  const approveWeight = totalActive.filter(v => v.vote === "approve").reduce((s, v) => s + v.weight, 0);
  const totalWeight = totalActive.reduce((s, v) => s + v.weight, 0);
  const rate = approveWeight / totalWeight;
  const passed = rate >= 0.667;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0b0f1a 0%, #050810 100%)",
      color: "#e8f4ff",
      fontFamily: "system-ui, sans-serif",
      padding: "2rem",
    }}>
      <div style={{
        maxWidth: 620,
        margin: "0 auto",
        background: "rgba(12,18,30,0.85)",
        border: "1px solid rgba(126,227,255,0.25)",
        borderRadius: 12,
        padding: "1.5rem",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#7ee3ff", opacity: 0.7 }}>PROPOSAL #0148</div>
            <div style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>Establish Cryptographic Council Ledger</div>
          </div>
          <div style={{
            padding: "6px 12px",
            borderRadius: 20,
            fontSize: 10,
            letterSpacing: 2,
            background: passed ? "rgba(80,220,140,0.15)" : "rgba(255,100,100,0.15)",
            color: passed ? "#7cff9a" : "#ff8a8a",
            border: `1px solid ${passed ? "rgba(80,220,140,0.4)" : "rgba(255,100,100,0.4)"}`,
          }}>
            {passed ? "PASSED" : "REJECTED"}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
            <span style={{ opacity: 0.6 }}>φ-weighted approval</span>
            <span style={{ color: "#7ee3ff" }}>{(rate * 100).toFixed(1)}% / req 66.7%</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              width: `${rate * 100}%`,
              height: "100%",
              background: "linear-gradient(90deg, #7ee3ff, #ba6bff)",
              transition: "width 600ms",
            }} />
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          {VOTES.map(v => {
            const color = v.vote === "approve" ? "#7cff9a" : v.vote === "reject" ? "#ff8a8a" : "#aab";
            return (
              <div key={v.agent} style={{
                display: "grid",
                gridTemplateColumns: "80px 90px 1fr 80px",
                alignItems: "center",
                padding: "6px 10px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 4,
                fontSize: 12,
              }}>
                <div style={{ fontFamily: "monospace", color: "#fff" }}>{v.agent}</div>
                <div style={{ color, fontSize: 10, letterSpacing: 1 }}>{v.vote.toUpperCase()}</div>
                <div style={{ opacity: 0.5, fontSize: 10 }}>{v.specialty}</div>
                <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 10, color: "#7ee3ff" }}>w={v.weight.toFixed(3)}</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.6 }}>
          <span>sealed: a8f3e1…c04b · signature verified</span>
          <span>BFT threshold: 2/3</span>
        </div>
      </div>
    </div>
  );
}
