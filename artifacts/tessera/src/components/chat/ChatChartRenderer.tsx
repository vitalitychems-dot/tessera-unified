export function parseChartBlocks(text: string): { text: string; charts: any[] } {
  const chartRegex = /```chart\n([\s\S]*?)```/g;
  const charts: any[] = [];
  const cleaned = text.replace(chartRegex, (_match, content) => {
    try { charts.push(JSON.parse(content)); } catch {}
    return "";
  });
  return { text: cleaned, charts };
}

export function InlineChart({ chart }: { chart: any }) {
  if (!chart) return null;
  return (
    <div className="my-2 p-3 rounded-lg bg-black/20 border border-white/5">
      <div className="text-xs text-cyan-400 font-mono mb-1">{chart.title || "Chart"}</div>
      {chart.data && Array.isArray(chart.data) && chart.data.map((d: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
          <span className="w-20 truncate">{d.label || d.name || `Item ${i}`}</span>
          <div className="flex-1 h-3 bg-white/5 rounded overflow-hidden">
            <div className="h-full bg-cyan-500/60 rounded" style={{ width: `${Math.min(100, (d.value || 0))}%` }} />
          </div>
          <span className="w-12 text-right">{d.value ?? ""}</span>
        </div>
      ))}
    </div>
  );
}
