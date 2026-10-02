import { useEffect } from 'react';
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

function SecurityPanel() {
  const { data: securityStatus } = useQuery<any>({
    queryKey: ["/api/security/fortress/status"],
    refetchInterval: 10000,
  });
  const { data: threatLog } = useQuery<any>({
    queryKey: ["/api/threats/log"],
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-cyan-400 tracking-wider mb-1" data-testid="text-security-title">Security Fortress</h2>
        <p className="text-sm text-muted-foreground">Real-time threat monitoring and protection status</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Threats Blocked", value: securityStatus?.threatsBlocked || threatLog?.length || 0, color: "text-red-400" },
          { label: "Active Shields", value: securityStatus?.activeShields || 7, color: "text-emerald-400" },
          { label: "PII Redactions", value: securityStatus?.piiRedactions || 0, color: "text-amber-400" },
          { label: "Security Score", value: `${securityStatus?.score ?? 0}%`, color: "text-cyan-400" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
            <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Protection Layers</h3>
        <div className="space-y-2">
          {[
            { name: "IP Rate Limiting", status: "active" },
            { name: "Prompt Injection Detection", status: "active" },
            { name: "PII Redaction Engine", status: "active" },
            { name: "Source Code Protection", status: "active" },
            { name: "Honeypot Responses", status: "active" },
            { name: "Admin Authentication", status: "active" },
            { name: "Disinformation Engine", status: "active" },
          ].map(layer => (
            <div key={layer.name} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-white/[0.03]" data-testid={`security-layer-${layer.name.toLowerCase().replace(/\s/g, '-')}`}>
              <span className="text-sm text-gray-300">{layer.name}</span>
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Active
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ConfigPage({ embedded }: { embedded?: boolean } = {}) {
  useEffect(() => {
    if (!embedded) document.title = "Configuration | Tessera";
  }, [embedded]);
  return (
    <div className="flex h-full bg-background" data-testid="config-page">
      <div className="flex-1 overflow-auto" data-scroll-container>
        <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
          <SecurityPanel />
        </Suspense>
      </div>
    </div>
  );
}
