import React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function RadialGauge({
  value,
  max = 100,
  size = 100,
  strokeWidth = 8,
  label,
  sublabel,
  color = "cyan",
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: "cyan" | "violet" | "emerald" | "amber" | "pink" | "blue" | "rose" | "purple";
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference * (1 - pct);

  const gradients: Record<string, [string, string]> = {
    cyan: ["#06b6d4", "#22d3ee"],
    violet: ["#8b5cf6", "#a78bfa"],
    emerald: ["#10b981", "#34d399"],
    amber: ["#f59e0b", "#fbbf24"],
    pink: ["#ec4899", "#f472b6"],
    blue: ["#3b82f6", "#60a5fa"],
    rose: ["#f43f5e", "#fb7185"],
    purple: ["#a855f7", "#c084fc"],
  };
  const [c1, c2] = gradients[color] || gradients.cyan;
  const gid = `gauge-${color}-${size}`;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="sovereign-gauge-svg -rotate-90">
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={c1} />
              <stop offset="100%" stopColor={c2} />
            </linearGradient>
            <filter id={`glow-${gid}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter={`url(#glow-${gid})`}
            className="sovereign-gauge-arc"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-mono text-white leading-none">
            {typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
          </span>
          {sublabel && <span className="text-[9px] text-slate-400 mt-0.5">{sublabel}</span>}
        </div>
      </div>
      {label && <span className="text-[10px] text-slate-400 text-center leading-tight">{label}</span>}
    </div>
  );
}

export function GlassCard({
  children,
  className,
  glow,
  hover = true,
  animate = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "cyan" | "violet" | "emerald" | "amber" | "pink" | "blue" | "rose";
  hover?: boolean;
  animate?: boolean;
}) {
  const glowColors: Record<string, string> = {
    cyan: "shadow-[0_0_20px_rgba(6,182,212,0.08)] border-cyan-500/20",
    violet: "shadow-[0_0_20px_rgba(139,92,246,0.08)] border-violet-500/20",
    emerald: "shadow-[0_0_20px_rgba(16,185,129,0.08)] border-emerald-500/20",
    amber: "shadow-[0_0_20px_rgba(245,158,11,0.08)] border-amber-500/20",
    pink: "shadow-[0_0_20px_rgba(236,72,153,0.08)] border-pink-500/20",
    blue: "shadow-[0_0_20px_rgba(59,130,246,0.08)] border-blue-500/20",
    rose: "shadow-[0_0_20px_rgba(244,63,94,0.08)] border-rose-500/20",
  };
  return (
    <div
      className={cn(
        "rounded-2xl border backdrop-blur-xl bg-white/[0.03] p-4",
        glow ? glowColors[glow] : "border-white/[0.08]",
        hover && "transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.15] hover:shadow-lg",
        animate && "sovereign-fade-in",
        className
      )}
    >
      {children}
    </div>
  );
}

export function HudPanel({
  children,
  className,
  accent = "cyan",
  scanline = false,
  corners = false,
  hover = true,
  animate = false,
  depth = false,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: "cyan" | "violet" | "emerald" | "amber" | "pink" | "blue" | "rose";
  scanline?: boolean;
  corners?: boolean;
  hover?: boolean;
  animate?: boolean;
  depth?: boolean;
  label?: string;
}) {
  const accentBorders: Record<string, string> = {
    cyan: "border-cyan-500/15 hover:border-cyan-500/30",
    violet: "border-violet-500/15 hover:border-violet-500/30",
    emerald: "border-emerald-500/15 hover:border-emerald-500/30",
    amber: "border-amber-500/15 hover:border-amber-500/30",
    pink: "border-pink-500/15 hover:border-pink-500/30",
    blue: "border-blue-500/15 hover:border-blue-500/30",
    rose: "border-rose-500/15 hover:border-rose-500/30",
  };
  const labelColors: Record<string, string> = {
    cyan: "text-cyan-500/50",
    violet: "text-violet-500/50",
    emerald: "text-emerald-500/50",
    amber: "text-amber-500/50",
    pink: "text-pink-500/50",
    blue: "text-blue-500/50",
    rose: "text-rose-500/50",
  };
  return (
    <div
      className={cn(
        "hud-panel rounded-lg border p-4",
        accentBorders[accent],
        scanline && "hud-scanline",
        corners && "hud-corner-accent",
        hover && "hud-panel-hover transition-all duration-300",
        animate && "sovereign-fade-in",
        depth && "hud-parallax",
        className
      )}
    >
      {label && (
        <div className={cn("text-[9px] font-mono uppercase tracking-[0.2em] mb-2", labelColors[accent])}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

export function HudMetric({
  value,
  label,
  unit,
  color = "cyan",
  size = "md",
}: {
  value: string | number;
  label: string;
  unit?: string;
  color?: "cyan" | "violet" | "emerald" | "amber" | "pink" | "blue" | "rose";
  size?: "sm" | "md" | "lg";
}) {
  const textColors: Record<string, string> = {
    cyan: "text-cyan-400",
    violet: "text-violet-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    pink: "text-pink-400",
    blue: "text-blue-400",
    rose: "text-rose-400",
  };
  const sizes = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-3xl",
  };
  return (
    <div className="text-center">
      <div className={cn("font-bold font-mono leading-none", sizes[size], textColors[color])}>
        {value}
        {unit && <span className="text-[60%] ml-0.5 opacity-60">{unit}</span>}
      </div>
      <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

export function GradientBar({
  value,
  max = 100,
  label,
  rightLabel,
  color = "cyan",
  height = "h-2",
  showValue = true,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  rightLabel?: string;
  color?: "cyan" | "violet" | "emerald" | "amber" | "pink" | "blue" | "rose" | "purple" | "dynamic";
  height?: string;
  showValue?: boolean;
  className?: string;
}) {
  const pct = Math.min(Math.round((value / max) * 100), 100);

  const dynamicColor = color === "dynamic"
    ? pct >= 95 ? "violet" : pct >= 85 ? "emerald" : pct >= 70 ? "amber" : "rose"
    : color;

  const gradients: Record<string, string> = {
    cyan: "from-cyan-500 to-cyan-300",
    violet: "from-violet-500 to-purple-400",
    emerald: "from-emerald-500 to-green-400",
    amber: "from-amber-500 to-yellow-400",
    pink: "from-pink-500 to-rose-400",
    blue: "from-blue-500 to-blue-300",
    rose: "from-rose-500 to-red-400",
    purple: "from-purple-500 to-violet-400",
  };

  const glowColors: Record<string, string> = {
    cyan: "shadow-[0_0_8px_rgba(6,182,212,0.3)]",
    violet: "shadow-[0_0_8px_rgba(139,92,246,0.3)]",
    emerald: "shadow-[0_0_8px_rgba(16,185,129,0.3)]",
    amber: "shadow-[0_0_8px_rgba(245,158,11,0.3)]",
    pink: "shadow-[0_0_8px_rgba(236,72,153,0.3)]",
    blue: "shadow-[0_0_8px_rgba(59,130,246,0.3)]",
    rose: "shadow-[0_0_8px_rgba(244,63,94,0.3)]",
    purple: "shadow-[0_0_8px_rgba(168,85,247,0.3)]",
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-baseline text-xs">
          {label && <span className="text-slate-300">{label}</span>}
          <span className="text-white font-mono font-medium">{rightLabel || `${pct}%`}</span>
        </div>
      )}
      <div className={cn("rounded-full overflow-hidden bg-white/[0.06]", height)}>
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-700 relative overflow-hidden",
            gradients[dynamicColor],
            glowColors[dynamicColor],
          )}
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 sovereign-shimmer" />
        </div>
      </div>
    </div>
  );
}

export function HeroStat({
  icon: Icon,
  value,
  label,
  color = "cyan",
  className,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color?: "cyan" | "violet" | "emerald" | "amber" | "pink" | "blue" | "rose";
  className?: string;
}) {
  const iconBg: Record<string, string> = {
    cyan: "bg-cyan-500/15 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]",
    violet: "bg-violet-500/15 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.15)]",
    emerald: "bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    amber: "bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    pink: "bg-pink-500/15 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.15)]",
    blue: "bg-blue-500/15 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]",
    rose: "bg-rose-500/15 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
  };
  const textColor: Record<string, string> = {
    cyan: "text-cyan-400",
    violet: "text-violet-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    pink: "text-pink-400",
    blue: "text-blue-400",
    rose: "text-rose-400",
  };

  return (
    <GlassCard className={cn("flex items-center gap-3 p-3", className)} hover={false}>
      <div className={cn("p-2.5 rounded-xl", iconBg[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className={cn("text-lg font-bold font-mono leading-none", textColor[color])}>{value}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
      </div>
    </GlassCard>
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  color = "cyan",
  badge,
  right,
  className,
}: {
  icon: LucideIcon;
  title: string;
  color?: "cyan" | "violet" | "emerald" | "amber" | "pink" | "blue" | "rose";
  badge?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  const textColor: Record<string, string> = {
    cyan: "text-cyan-400",
    violet: "text-violet-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    pink: "text-pink-400",
    blue: "text-blue-400",
    rose: "text-rose-400",
  };
  const dotColor: Record<string, string> = {
    cyan: "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]",
    violet: "bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.6)]",
    emerald: "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]",
    amber: "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]",
    pink: "bg-pink-400 shadow-[0_0_6px_rgba(236,72,153,0.6)]",
    blue: "bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.6)]",
    rose: "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.6)]",
  };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("w-1.5 h-1.5 rounded-full", dotColor[color])} />
      <Icon className={cn("w-4 h-4", textColor[color])} />
      <span className={cn("text-sm font-semibold", textColor[color])}>{title}</span>
      {badge && (
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-mono">
          {badge}
        </span>
      )}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

export function TabBar({
  tabs,
  activeTab,
  onChange,
  color = "cyan",
  className,
}: {
  tabs: readonly { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
  color?: "cyan" | "violet" | "emerald" | "amber";
  className?: string;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  React.useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [checkScroll]);

  const activeColors: Record<string, string> = {
    cyan: "bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.25)]",
    violet: "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]",
    emerald: "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]",
    amber: "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.25)]",
  };

  return (
    <div className={cn("relative", className)}>
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none rounded-l-xl bg-gradient-to-r from-[#080518] to-transparent" />
      )}
      <div
        ref={scrollRef}
        className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0",
              activeTab === tab.id
                ? activeColors[color]
                : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none rounded-r-xl bg-gradient-to-l from-[#080518] to-transparent" />
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  gradient,
  quote,
  icon: Icon,
  iconColor,
}: {
  title: string;
  subtitle?: string;
  gradient?: string;
  quote?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconColor?: string;
}) {
  if (Icon) {
    return (
      <div className="flex items-center gap-3 relative">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/10", iconColor || "text-cyan-400")}>
          <Icon size={20} className={iconColor || "text-cyan-400"} />
        </div>
        <div className="min-w-0">
          <h1 className={cn("text-lg md:text-xl font-bold font-mono truncate", iconColor || "text-cyan-400")}>{title}</h1>
          {subtitle && <p className="text-slate-500 text-[11px] font-mono tracking-wide truncate">{subtitle}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="text-center space-y-2 relative">
      <div className="absolute inset-0 -top-8 sovereign-page-glow opacity-30 pointer-events-none" />
      <h1 className={cn("text-3xl md:text-4xl font-bold bg-clip-text text-transparent", gradient || "bg-gradient-to-r from-cyan-400 to-violet-400")}>
        {title}
      </h1>
      {subtitle && <p className="text-slate-500 text-xs font-mono tracking-wide">{subtitle}</p>}
      {quote && <p className="text-xs text-white/40 italic max-w-xl mx-auto">"{quote}"</p>}
    </div>
  );
}

export function TabLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 rounded-full bg-white/[0.06]" />
          <div className="h-4 w-32 rounded bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-14 rounded-xl bg-white/[0.04]" />
          <div className="h-14 rounded-xl bg-white/[0.04]" />
          <div className="h-14 rounded-xl bg-white/[0.04]" />
        </div>
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 rounded-full bg-white/[0.06]" />
          <div className="h-4 w-40 rounded bg-white/[0.06]" />
        </div>
        <div className="space-y-3">
          <div className="h-3 rounded bg-white/[0.04] w-full" />
          <div className="h-3 rounded bg-white/[0.04] w-4/5" />
          <div className="h-3 rounded bg-white/[0.04] w-3/5" />
          <div className="h-3 rounded bg-white/[0.04] w-full" />
          <div className="h-3 rounded bg-white/[0.04] w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function MiniStat({
  value,
  label,
  color = "cyan",
}: {
  value: string | number;
  label: string;
  color?: "cyan" | "violet" | "emerald" | "amber" | "pink" | "blue" | "rose";
}) {
  const textColor: Record<string, string> = {
    cyan: "text-cyan-400",
    violet: "text-violet-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    pink: "text-pink-400",
    blue: "text-blue-400",
    rose: "text-rose-400",
  };
  return (
    <div className="text-center">
      <div className={cn("text-xl font-bold font-mono", textColor[color])}>{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
