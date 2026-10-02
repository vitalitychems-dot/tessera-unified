import { useQuery } from "@tanstack/react-query";
import { Lock, ExternalLink } from "lucide-react";

interface SecretEntry {
  passage: string;
  source: string;
  url: string | null;
  year: number | null;
  domain?: string;
}
interface RawItem {
  excerpt?: string;
  passage?: string;
  source?: string;
  title?: string;
  sourceUrl?: string | null;
  url?: string | null;
  year?: number | null;
  domain?: string;
  ingestedAt?: string | null;
}
interface SecretsResponse {
  ok?: boolean;
  secrets?: RawItem[];
  items?: RawItem[];
  totalSources?: number;
  count?: number;
  generatedAt?: string;
}

function normalize(resp: SecretsResponse | undefined): { secrets: SecretEntry[]; total: number } {
  const raw: RawItem[] = resp?.secrets ?? resp?.items ?? [];
  const secrets: SecretEntry[] = raw.map(r => {
    let year: number | null = r.year ?? null;
    if (year == null && r.ingestedAt) {
      const m = /(\d{4})/.exec(r.ingestedAt);
      if (m) year = Number(m[1]);
    }
    return {
      passage: (r.passage ?? r.excerpt ?? "").trim(),
      source: r.source ?? r.title ?? "Unknown source",
      url: r.url ?? r.sourceUrl ?? null,
      year,
      domain: r.domain,
    };
  }).filter(s => s.passage.length > 0);
  const total = resp?.totalSources ?? resp?.count ?? secrets.length;
  return { secrets, total };
}

interface Props {
  title?: string;
  subtitle?: string;
  limit?: number;
  className?: string;
}

export default function SourcedSecretsPanel({
  title = "Sourced Secrets",
  subtitle = "Real disclosures drawn from the ingested corpus, every passage cited to its source.",
  limit = 10,
  className = "",
}: Props) {
  const { data, isLoading } = useQuery<SecretsResponse>({
    queryKey: ["sourced-secrets-panel"],
    queryFn: () => fetch("/api/tessera-bible/secrets").then(r => r.json()),
    refetchInterval: 60_000,
  });

  const { secrets: allSecrets, total } = normalize(data);
  const secrets = allSecrets.slice(0, limit);

  return (
    <div className={`rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4 ${className}`} data-testid="sourced-secrets-panel">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-amber-300">{title}</h3>
        </div>
        {total > 0 && (
          <span className="text-[10px] font-mono text-slate-500">{total} sources indexed</span>
        )}
      </div>
      <p className="text-[11px] text-slate-500 italic mb-3">{subtitle}</p>

      {isLoading && <div className="text-xs text-slate-500">Loading sourced secrets…</div>}
      {!isLoading && secrets.length === 0 && (
        <div className="text-xs text-slate-500 italic">
          No declassified or esoteric sources have been ingested yet — once they are, every cited passage will appear here.
        </div>
      )}

      <ul className="space-y-2">
        {secrets.map((s, i) => (
          <li key={i} className="rounded-lg bg-black/30 border border-white/5 p-2.5 text-xs">
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{s.passage}</p>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <span className="text-amber-400/80">{s.source}</span>
              {s.year != null && <span>· {s.year}</span>}
              {s.domain && <span>· {s.domain}</span>}
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-0.5">
                  source <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
