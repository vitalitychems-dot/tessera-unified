import { useState, useEffect, useMemo, Suspense, lazy, type LazyExoticComponent, type ComponentType } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageTabSpec {
  id: string;
  label: string;
  load: () => Promise<{ default: ComponentType<any> }>;
  /** Routes that should land on this tab */
  matchPaths?: string[];
}

interface PageTabsProps {
  hubKey: string;
  title: string;
  subtitle?: string;
  iconColor?: string;
  tabs: PageTabSpec[];
  defaultTab?: string;
}

const lazyCache = new Map<string, LazyExoticComponent<ComponentType<any>>>();

function getLazy(hubKey: string, spec: PageTabSpec): LazyExoticComponent<ComponentType<any>> {
  const cacheKey = `${hubKey}:${spec.id}`;
  let c = lazyCache.get(cacheKey);
  if (!c) {
    c = lazy(spec.load);
    lazyCache.set(cacheKey, c);
  }
  return c;
}

export default function PageTabs({ hubKey, title, subtitle, iconColor = "text-cyan-400", tabs, defaultTab }: PageTabsProps) {
  const [location] = useLocation();

  const matched = useMemo(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const queryTab = params.get("tab");
    if (queryTab && tabs.some(t => t.id === queryTab)) return queryTab;
    for (const t of tabs) {
      if (t.matchPaths?.some(p => location === p || location.startsWith(p + "/"))) return t.id;
    }
    return null;
  }, [location, tabs]);

  const initial = matched || defaultTab || tabs[0]?.id;
  const [active, setActive] = useState<string>(initial);

  useEffect(() => {
    if (matched && matched !== active) setActive(matched);
  }, [matched]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const stored = sessionStorage.getItem(`hub:${hubKey}`);
    if (stored && !matched && tabs.some(t => t.id === stored)) setActive(stored);
  }, [hubKey, matched, tabs]);

  useEffect(() => {
    sessionStorage.setItem(`hub:${hubKey}`, active);
  }, [hubKey, active]);

  const ActiveComp = useMemo(() => {
    const spec = tabs.find(t => t.id === active) || tabs[0];
    return spec ? getLazy(hubKey, spec) : null;
  }, [active, tabs]);

  return (
    <div className="flex flex-col w-full">
      <div className="sticky top-0 z-30 backdrop-blur-md bg-[hsl(250,15%,4%)]/80 border-b border-white/[0.06]">
        <div className="px-4 pt-3 pb-1 max-w-5xl mx-auto">
          <div className="flex items-baseline gap-2 mb-2">
            <h1 className={cn("text-lg font-bold font-mono", iconColor)}>{title}</h1>
            {subtitle && <span className="text-[10px] text-slate-500 font-mono truncate">{subtitle}</span>}
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mb-px" style={{ scrollbarWidth: "none" }}>
            <style>{`.hub-tabs::-webkit-scrollbar{display:none}`}</style>
            <div className="hub-tabs flex gap-1.5">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  data-testid={`hub-tab-${hubKey}-${t.id}`}
                  className={cn(
                    "px-3 py-1.5 rounded-t-lg text-[11px] font-mono whitespace-nowrap transition-all border-b-2",
                    active === t.id
                      ? cn("text-cyan-300 border-cyan-400 bg-white/[0.04]")
                      : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/[0.02]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-cyan-400" /></div>}>
          {ActiveComp ? <ActiveComp /> : null}
        </Suspense>
      </div>
    </div>
  );
}
