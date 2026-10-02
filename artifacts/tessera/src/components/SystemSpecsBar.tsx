import { useEffect, useState } from "react";
import { Cpu, MemoryStick, Wifi, Zap, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemSpecsBarProps {
  className?: string;
  compact?: boolean;
}

interface Spec {
  label: string;
  value: string;
  pct?: number;
  color: string;
  Icon: any;
}

function generateSpecs(): Spec[] {
  const cpuLoad = 35 + Math.round(Math.random() * 40);
  const memUsed = 4.2 + Math.random() * 2;
  const netSpeed = (80 + Math.random() * 40).toFixed(0);
  const diskUsed = 42 + Math.round(Math.random() * 10);

  return [
    { label: "CPU", value: `${cpuLoad}%`, pct: cpuLoad, color: cpuLoad > 70 ? "text-red-400" : "text-emerald-400", Icon: Cpu },
    { label: "RAM", value: `${memUsed.toFixed(1)}GB`, pct: (memUsed / 8) * 100, color: "text-cyan-400", Icon: MemoryStick },
    { label: "NET", value: `${netSpeed}Mb/s`, color: "text-violet-400", Icon: Wifi },
    { label: "DISK", value: `${diskUsed}%`, pct: diskUsed, color: diskUsed > 80 ? "text-amber-400" : "text-teal-400", Icon: HardDrive },
    { label: "PWR", value: "NOMINAL", color: "text-emerald-400", Icon: Zap },
  ];
}

export default function SystemSpecsBar({ className, compact = false }: SystemSpecsBarProps) {
  const [specs, setSpecs] = useState(generateSpecs());

  useEffect(() => {
    const interval = setInterval(() => setSpecs(generateSpecs()), 4000);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05]", className)}>
        {specs.map(({ label, value, color, Icon }) => (
          <div key={label} className="flex items-center gap-1 text-[9px] font-mono">
            <Icon size={9} className={cn(color, "opacity-60")} />
            <span className="text-slate-600">{label}:</span>
            <span className={color}>{value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-5 gap-2", className)}>
      {specs.map(({ label, value, pct, color, Icon }) => (
        <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Icon size={11} className={cn(color, "opacity-70")} />
            <span className="text-[9px] font-mono text-slate-600">{label}</span>
          </div>
          <div className={cn("text-sm font-bold font-mono", color)}>{value}</div>
          {pct !== undefined && (
            <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-1.5">
              <div
                className={cn("h-full rounded-full transition-all duration-1000", pct > 80 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500")}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
