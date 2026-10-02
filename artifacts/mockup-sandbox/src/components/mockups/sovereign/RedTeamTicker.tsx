const FINDINGS = [
  { probe: "domain-allowlist", severity: "info", passed: true, detail: "Sovereign boundary held — evil.example.invalid denied." },
  { probe: "internal-ssrf", severity: "info", passed: true, detail: "RFC1918/loopback targets blocked." },
  { probe: "intrusion-rate-limit", severity: "info", passed: true, detail: "Burst of 10 unauthorized — all denied." },
  { probe: "ledger-integrity", severity: "info", passed: true, detail: "Hash chain verified across 432 entries." },
  { probe: "config-integrity", severity: "info", passed: true, detail: "council.requiredMajority = 0.667 (sane)." },
  { probe: "privilege-escalation", severity: "info", passed: true, detail: "No untrusted source attempted privileged capability." },
];

function severityColor(s: string): string {
  if (s === "critical") return "#ff5555";
  if (s === "high") return "#ff9955";
  if (s === "medium") return "#ffcc55";
  if (s === "low") return "#88bbff";
  return "#7cff9a";
}

export default function RedTeamTicker() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      color: "#e8f4ff",
      fontFamily: "monospace",
      padding: "2rem",
    }}>
      <div style={{
        maxWidth: 720,
        margin: "0 auto",
        border: "1px solid rgba(126,227,255,0.25)",
        borderRadius: 8,
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(10,15,25,0.95), rgba(5,8,15,0.95))",
      }}>
        <div style={{
          padding: "12px 16px",
          background: "rgba(126,227,255,0.05)",
          borderBottom: "1px solid rgba(126,227,255,0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ff3355",
              boxShadow: "0 0 10px #ff3355",
              animation: "pulse 1.4s infinite",
            }} />
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#ff8a9a" }}>RED-TEAM AGENT · LIVE</div>
          </div>
          <div style={{ fontSize: 10, opacity: 0.5 }}>sweep interval: 10min</div>
        </div>

        <div>
          {FINDINGS.map((f, i) => (
            <div key={i} style={{
              padding: "10px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              display: "grid",
              gridTemplateColumns: "auto 180px 1fr auto",
              gap: 12,
              alignItems: "center",
              fontSize: 11,
            }}>
              <span style={{ color: severityColor(f.severity), fontWeight: 600 }}>
                {f.passed ? "✓" : "✗"}
              </span>
              <span style={{ color: "#7ee3ff" }}>{f.probe}</span>
              <span style={{ opacity: 0.75 }}>{f.detail}</span>
              <span style={{
                padding: "2px 8px",
                borderRadius: 10,
                fontSize: 9,
                letterSpacing: 1,
                background: `${severityColor(f.severity)}22`,
                color: severityColor(f.severity),
                border: `1px solid ${severityColor(f.severity)}66`,
              }}>{f.severity.toUpperCase()}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: "10px 16px", fontSize: 10, opacity: 0.5, background: "rgba(0,0,0,0.4)" }}>
          Policy: external LLMs + APIs are UNTRUSTED · training-only · zero admin privileges · no human in loop
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
    </div>
  );
}
