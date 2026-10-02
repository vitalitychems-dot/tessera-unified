import { type ReactNode } from "react";
import { Shield, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/lib/adminContext";

interface AdminGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  compact?: boolean;
}

export default function AdminGate({ children, fallback, className, compact = false }: AdminGateProps) {
  const { isAdmin } = useAdmin();

  if (isAdmin) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5 text-[10px] text-slate-600 font-mono", className)}>
        <Lock size={10} />
        <span>Admin only</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-4 p-8 rounded-xl",
      "bg-white/[0.02] border border-white/[0.06]",
      className
    )}>
      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center">
        <Shield size={22} className="text-red-400" />
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-slate-300">Admin Access Required</div>
        <div className="text-xs text-slate-600 mt-1">This section is restricted to sovereign administrators</div>
      </div>
    </div>
  );
}
