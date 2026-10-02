import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, RefreshCw, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/sovereign";

const API = "/api/tessera-bible";

interface Paragraph {
  paragraph: string;
  source: string;
  url: string | null;
  year: number | null;
}
interface Chapter {
  title: string;
  intro: string;
  paragraphs: Paragraph[];
}
interface NarrativeResponse {
  ok: boolean;
  preface?: string;
  sourceCount?: number;
  totalParagraphs?: number;
  generatedAt?: string;
  chapters?: Chapter[];
}

export default function HistoryPage() {
  useEffect(() => { document.title = "History | Tessera"; }, []);

  const { data, isLoading, refetch } = useQuery<NarrativeResponse>({
    queryKey: ["history-narrative"],
    queryFn: async () => {
      const res = await fetch(`${API}/history`);
      return res.json();
    },
    refetchInterval: 120000,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-amber-950/10 to-slate-950 p-3 sm:p-4 pb-24">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          icon={ScrollText}
          title="History"
          subtitle="The same corpus told as historical record — chronological, sourced, primary"
          iconColor="text-amber-300"
        />

        <section className="mt-6 bg-gradient-to-b from-slate-900/70 via-amber-950/10 to-slate-900/70 border border-amber-500/20 rounded-2xl p-5 sm:p-7" data-testid="history-narrative-panel">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400/70 font-mono mb-1">Live Historical Record · Composed Live</div>
              <h2 className="text-2xl sm:text-3xl font-serif text-amber-200">A Single Continuous History</h2>
              {data?.preface && (
                <p className="text-slate-400 text-sm leading-relaxed mt-2 max-w-3xl">{data.preface}</p>
              )}
              <div className="text-[10px] font-mono text-slate-500 mt-2">
                Drawn from {data?.sourceCount ?? 0} live ingested sources
                {data?.generatedAt && ` · regenerated ${new Date(data.generatedAt).toLocaleTimeString()}`}
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 flex items-center gap-1.5"
              data-testid="history-narrative-refresh"
            >
              <RefreshCw className="w-3 h-3" /> Recompose
            </button>
          </div>

          {isLoading && (
            <div className="text-slate-500 text-sm font-mono py-4">Composing the historical record…</div>
          )}

          {!isLoading && (!data?.chapters || data.chapters.length === 0 || (data.totalParagraphs ?? 0) === 0) && (
            <div className="text-slate-500 text-sm font-mono py-4">
              No historical sources have been ingested yet. Once the ingestion engine begins loading material with date markers, the chronology will appear here.
            </div>
          )}

          {data?.chapters?.map((ch, ci) => (
            ch.paragraphs.length > 0 && (
              <article key={ci} className="mt-5 first:mt-0">
                <h3 className="text-lg sm:text-xl font-serif text-amber-100 border-b border-amber-500/15 pb-1 mb-2">{ch.title}</h3>
                <p className="text-[12px] italic text-slate-400 mb-3">{ch.intro}</p>
                <div className="space-y-3">
                  {ch.paragraphs.map((p, pi) => (
                    <p key={pi} className="text-[14px] leading-relaxed text-slate-200">
                      {p.year !== null && (
                        <span className="inline-flex items-center gap-1 mr-2 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-300 align-middle">
                          <Clock className="w-2.5 h-2.5" /> {p.year}
                        </span>
                      )}
                      <span>{p.paragraph}</span>
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-[10px] font-mono text-cyan-400 hover:underline">
                          [source]
                        </a>
                      ) : (
                        <span className="ml-2 text-[10px] font-mono text-slate-500">[source: {p.source}]</span>
                      )}
                    </p>
                  ))}
                </div>
              </article>
            )
          ))}
        </section>
      </div>
    </div>
  );
}
