import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface LedgerEntry {
  id: string;
  title: string;
  category: string;
  status: "approved" | "rejected" | string;
  approvalRate: number;
  yesCount: number;
  noCount: number;
  abstainCount: number;
  createdAt: number;
  proposedBy: string;
}

interface LedgerResponse {
  ok: boolean;
  count: number;
  entries: LedgerEntry[];
}

export default function CouncilLedgerPage() {
  const { data, isLoading, error, refetch } = useQuery<LedgerResponse>({
    queryKey: ["/api/council/ledger?limit=100"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/council/ledger?limit=100");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-background text-foreground p-6" data-testid="page-council-ledger">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="flex items-baseline justify-between border-b border-border pb-3">
          <div>
            <h1 className="text-2xl font-bold tracking-wide">Council Ledger</h1>
            <p className="text-sm text-muted-foreground font-mono">
              Append-only record of every ratified or rejected proposal. Read-only.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 text-xs uppercase tracking-wider border border-border rounded hover:bg-muted"
            data-testid="button-refresh-ledger"
          >
            Refresh
          </button>
        </header>

        {isLoading && <div className="text-sm text-muted-foreground">Loading ledger…</div>}
        {error && <div className="text-sm text-red-400">Failed to load ledger.</div>}

        {data?.entries && (
          <>
            <div className="text-xs font-mono text-muted-foreground" data-testid="ledger-count">
              {data.count} entries (newest first)
            </div>
            <div className="space-y-2" data-testid="ledger-list">
              {data.entries.map((e) => {
                const ratio = (e.approvalRate * 100).toFixed(1);
                const dot =
                  e.status === "approved" ? "bg-green-500" :
                  e.status === "rejected" ? "bg-red-500" : "bg-amber-500";
                return (
                  <div
                    key={e.id}
                    className="border border-border rounded-lg p-3 bg-card hover:bg-muted/30"
                    data-testid={`ledger-entry-${e.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 inline-block w-2 h-2 rounded-full ${dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{e.title}</div>
                        <div className="text-xs font-mono text-muted-foreground mt-0.5">
                          {new Date(e.createdAt).toISOString()} · {e.category} · {e.proposedBy}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-mono">{ratio}%</div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                          {e.yesCount}y / {e.noCount}n / {e.abstainCount}a
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
