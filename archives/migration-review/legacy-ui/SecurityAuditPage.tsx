import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, AlertTriangle, CheckCircle, Globe, RefreshCw, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const API_BASE = "/api";

interface AuditEntry {
  id: number;
  timestamp: string;
  targetUrl: string;
  method: string;
  status: number | null;
  durationMs: number | null;
  flagged: boolean;
  flagReason: string | null;
  requestedBy: string | null;
}

interface AuditResponse {
  ok: boolean;
  data: AuditEntry[];
  limit: number;
  offset: number;
}

interface AllowlistResponse {
  ok: boolean;
  domains: string[];
  count: number;
}

interface IntegrityResult {
  path: string;
  valid: boolean;
  expectedHash: string;
  actualHash: string;
  error?: string;
}

interface IntegrityResponse {
  ok: boolean;
  allValid: boolean;
  results: IntegrityResult[];
}

function useAuditLog(flaggedOnly: boolean) {
  return useQuery<AuditResponse>({
    queryKey: ["security-audit", flaggedOnly],
    queryFn: async () => {
      const url = `${API_BASE}/security/audit?limit=50${flaggedOnly ? "&flagged=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch audit log");
      return res.json();
    },
    refetchInterval: 15_000,
  });
}

function useAllowlist() {
  return useQuery<AllowlistResponse>({
    queryKey: ["security-allowlist"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/security/allowlist`);
      if (!res.ok) throw new Error("Failed to fetch allowlist");
      return res.json();
    },
  });
}

function useIntegrity() {
  return useQuery<IntegrityResponse>({
    queryKey: ["security-integrity"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/security/integrity`);
      if (!res.ok) throw new Error("Failed to fetch integrity");
      return res.json();
    },
    refetchInterval: 60_000,
  });
}

function StatusBadge({ status }: { status: number | null }) {
  if (status === null) return <Badge variant="outline" className="text-xs">—</Badge>;
  const ok = status >= 200 && status < 300;
  return (
    <Badge variant={ok ? "secondary" : "destructive"} className="text-xs font-mono">
      {status}
    </Badge>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    POST: "bg-green-500/20 text-green-400 border-green-500/30",
    PUT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
    PATCH: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };
  const cls = colors[method] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-mono ${cls}`}>
      {method}
    </span>
  );
}

function truncateUrl(url: string, max = 60) {
  try {
    const u = new URL(url);
    const short = u.hostname + u.pathname;
    return short.length > max ? short.slice(0, max) + "…" : short;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

function formatDuration(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function SecurityAuditPage() {
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } = useAuditLog(flaggedOnly);
  const { data: allowlistData, isLoading: allowlistLoading } = useAllowlist();
  const { data: integrityData, isLoading: integrityLoading, refetch: refetchIntegrity } = useIntegrity();

  const entries = auditData?.data ?? [];
  const flaggedCount = entries.filter((e) => e.flagged).length;
  const domains = allowlistData?.domains ?? [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Audit</h1>
          <p className="text-sm text-muted-foreground">External call monitoring, allowlist, and integrity checks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLoading ? "…" : entries.length}</div>
            <p className="text-xs text-muted-foreground mt-1">last 50 entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Flagged Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${flaggedCount > 0 ? "text-destructive" : "text-green-500"}`}>
              {auditLoading ? "…" : flaggedCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">in current view</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Allowed Domains</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allowlistLoading ? "…" : domains.length === 0 ? "All" : domains.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{domains.length === 0 ? "open (no restrictions)" : "domains whitelisted"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  External Call Log
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="flagged-filter"
                      checked={flaggedOnly}
                      onCheckedChange={setFlaggedOnly}
                    />
                    <Label htmlFor="flagged-filter" className="text-xs text-muted-foreground cursor-pointer">
                      Flagged only
                    </Label>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => refetchAudit()} className="h-7 w-7">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {auditLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading…</div>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 text-green-500/50" />
                  <p className="text-sm">No external calls recorded yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-3 px-4 py-3 text-sm ${entry.flagged ? "bg-destructive/5" : ""}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {entry.flagged ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500/70" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <MethodBadge method={entry.method} />
                          <span className="font-mono text-xs truncate max-w-[280px]" title={entry.targetUrl}>
                            {truncateUrl(entry.targetUrl)}
                          </span>
                          <StatusBadge status={entry.status} />
                          <span className="text-xs text-muted-foreground">{formatDuration(entry.durationMs)}</span>
                        </div>
                        {entry.flagReason && (
                          <p className="text-xs text-destructive mt-0.5">{entry.flagReason}</p>
                        )}
                        {entry.requestedBy && (
                          <p className="text-xs text-muted-foreground mt-0.5">by {entry.requestedBy}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-xs text-muted-foreground font-mono">
                        {formatTime(entry.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Domain Allowlist
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allowlistLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : domains.length === 0 ? (
                <div className="space-y-2">
                  <Badge variant="secondary" className="text-xs">Unrestricted</Badge>
                  <p className="text-xs text-muted-foreground">
                    Set <code className="bg-muted px-1 rounded">ALLOWED_EXTERNAL_DOMAINS</code> env var to restrict outbound calls.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {domains.map((d) => (
                    <li key={d} className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground">{d}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  File Integrity
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => refetchIntegrity()} className="h-7 w-7">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {integrityLoading ? (
                <div className="text-sm text-muted-foreground">Checking…</div>
              ) : !integrityData ? (
                <div className="text-sm text-muted-foreground">Unavailable</div>
              ) : integrityData.results.length === 0 ? (
                <div className="space-y-2">
                  <Badge variant="secondary" className="text-xs">No files configured</Badge>
                  <p className="text-xs text-muted-foreground">
                    Set <code className="bg-muted px-1 rounded">INTEGRITY_CRITICAL_FILES</code> env var with a JSON array of file entries to monitor.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-sm font-medium ${integrityData.allValid ? "text-green-500" : "text-destructive"}`}>
                    {integrityData.allValid ? (
                      <><CheckCircle className="h-4 w-4" /> All files valid</>
                    ) : (
                      <><AlertTriangle className="h-4 w-4" /> Integrity failures detected</>
                    )}
                  </div>
                  <ul className="space-y-1.5 mt-2">
                    {integrityData.results.map((r) => (
                      <li key={r.path} className="flex items-start gap-2">
                        {r.valid ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-mono truncate text-muted-foreground">{r.path}</p>
                          {r.error && <p className="text-xs text-destructive">{r.error}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
