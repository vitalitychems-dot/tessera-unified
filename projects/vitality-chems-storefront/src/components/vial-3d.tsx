import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  name: string;
  dose: string;
  purity?: string;
  className?: string;
  interactive?: boolean;
  compact?: boolean;
};

/**
 * 2.5D lyophilized vial. The studio photo is wrapped as a cylindrical label so
 * the buyer can drag a full 360° — front shows the real lot label, back is glass
 * + freeze-dried cake. One canvas, no extra libraries.
 */
export function Vial3D({
  src,
  name,
  dose,
  purity = "≥99%",
  className,
  interactive = true,
  compact = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src.split("?")[0] + (src.includes("?") ? src.slice(src.indexOf("?")) : "");

    const state = {
      angle: 0.18,
      vel: 0,
      dragging: false,
      lastX: 0,
      lastT: 0,
      hovering: false,
      visible: true,
      raf: 0,
      w: 0,
      h: 0,
    };

    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      state.w = Math.max(160, Math.floor(rect.width));
      state.h = Math.max(180, Math.floor(rect.height));
      canvas.width = Math.floor(state.w * dpr);
      canvas.height = Math.floor(state.h * dpr);
      canvas.style.width = `${state.w}px`;
      canvas.style.height = `${state.h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = state.w;
      const h = state.h;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const bodyTop = h * 0.18;
      const bodyBot = h * 0.88;
      const R = Math.min(w * 0.28, (bodyBot - bodyTop) * 0.28);
      const neckR = R * 0.42;
      const capH = h * 0.11;

      // stage glow
      const g = ctx.createRadialGradient(cx, h * 0.72, 8, cx, h * 0.78, w * 0.55);
      g.addColorStop(0, "rgba(163,59,255,0.16)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // cylinder strips
      const strips = compact ? 48 : 72;
      for (let i = 0; i < strips; i++) {
        const t = (i / strips) * 2 - 1; // -1..1
        const next = ((i + 1) / strips) * 2 - 1;
        if (t * t >= 1 || next * next >= 1) continue;
        const x0 = cx + t * R;
        const x1 = cx + next * R;
        const world = state.angle + Math.asin(Math.max(-1, Math.min(1, (t + next) / 2)));
        const wrapU = ((world / (Math.PI * 2)) % 1 + 1) % 1;
        const lambert = Math.sqrt(Math.max(0, 1 - ((t + next) / 2) ** 2));
        const front = Math.cos(world) > 0.12;

        ctx.beginPath();
        ctx.rect(x0, bodyTop, Math.max(1, x1 - x0), bodyBot - bodyTop);

        if (front && img.complete && img.naturalWidth > 0) {
          const sx = (0.22 + wrapU * 0.56) * img.naturalWidth;
          const sy = img.naturalHeight * 0.08;
          const sw = Math.max(2, img.naturalWidth * 0.018);
          const sh = img.naturalHeight * 0.84;
          try {
            ctx.save();
            ctx.clip();
            ctx.globalAlpha = 0.55 + lambert * 0.45;
            ctx.drawImage(img, sx, sy, sw, sh, x0, bodyTop, Math.max(1, x1 - x0), bodyBot - bodyTop);
            ctx.restore();
          } catch {
            ctx.fillStyle = `rgba(18,14,28,${0.4 + lambert * 0.4})`;
            ctx.fill();
          }
        } else {
          const shade = 18 + Math.floor(lambert * 42);
          ctx.fillStyle = `rgb(${shade},${shade - 4},${shade + 10})`;
          ctx.fill();
        }
      }

      // glass rim
      ctx.strokeStyle = "rgba(220,210,255,0.28)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(cx, bodyTop, R, R * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, bodyBot, R, R * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();

      // freeze-dried cake (visible more on the back)
      const backAmt = (1 - Math.cos(state.angle)) * 0.5;
      ctx.fillStyle = `rgba(232,228,240,${0.12 + backAmt * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(cx, bodyBot - (bodyBot - bodyTop) * 0.12, R * 0.72, R * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();

      // neck
      ctx.fillStyle = "rgba(180,190,210,0.18)";
      ctx.fillRect(cx - neckR, bodyTop - h * 0.07, neckR * 2, h * 0.08);
      ctx.strokeStyle = "rgba(220,210,255,0.2)";
      ctx.strokeRect(cx - neckR, bodyTop - h * 0.07, neckR * 2, h * 0.08);

      // cap
      const capTop = bodyTop - h * 0.07 - capH;
      const capGrad = ctx.createLinearGradient(cx - neckR * 1.35, capTop, cx + neckR * 1.35, capTop);
      capGrad.addColorStop(0, "#1a1424");
      capGrad.addColorStop(0.5, "#3a2a4e");
      capGrad.addColorStop(1, "#120e18");
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.roundRect(cx - neckR * 1.25, capTop, neckR * 2.5, capH, 4);
      ctx.fill();
      ctx.fillStyle = "#a33bff";
      ctx.fillRect(cx - neckR * 1.25, capTop + capH * 0.72, neckR * 2.5, 3);

      // specular
      const spec = ctx.createLinearGradient(cx - R * 0.7, bodyTop, cx - R * 0.2, bodyBot);
      spec.addColorStop(0, "rgba(255,255,255,0.14)");
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = spec;
      ctx.fillRect(cx - R * 0.72, bodyTop, R * 0.28, bodyBot - bodyTop);

      if (!compact) {
        ctx.fillStyle = "rgba(212,168,255,0.9)";
        ctx.font = `600 ${Math.max(9, w * 0.028)}px "IBM Plex Mono", monospace`;
        ctx.textAlign = "center";
        ctx.fillText("DRAG · 360°", cx, h * 0.97);
        ctx.fillStyle = "rgba(155,148,171,0.9)";
        ctx.font = `500 ${Math.max(8, w * 0.022)}px "IBM Plex Sans", sans-serif`;
        ctx.fillText(`${name} ${dose} · ${purity} HPLC`, cx, h * 0.04 + 8);
      }
    };

    const tick = (t: number) => {
      if (!state.visible) {
        state.raf = requestAnimationFrame(tick);
        return;
      }
      if (!state.dragging) {
        const auto = interactive
          ? reduced
            ? 0
            : compact
              ? state.hovering
                ? 0.012
                : 0.003
              : 0.006
          : compact
            ? 0.004
            : 0.005;
        state.vel *= 0.94;
        state.angle += state.vel + auto;
      }
      draw();
      state.raf = requestAnimationFrame(tick);
      state.lastT = t;
    };

    const onDown = (e: PointerEvent) => {
      if (!interactive) return;
      state.dragging = true;
      state.vel = 0;
      state.lastX = e.clientX;
      wrap.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!state.dragging) return;
      const dx = e.clientX - state.lastX;
      state.lastX = e.clientX;
      state.angle += dx * 0.012;
      state.vel = dx * 0.008;
    };
    const onUp = (e: PointerEvent) => {
      state.dragging = false;
      try {
        wrap.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    const io = new IntersectionObserver(
      (entries) => {
        state.visible = entries.some((en) => en.isIntersecting);
      },
      { rootMargin: "80px" },
    );
    io.observe(wrap);
    img.addEventListener("load", draw);
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("pointerenter", () => {
      state.hovering = true;
    });
    wrap.addEventListener("pointerleave", () => {
      state.hovering = false;
      state.dragging = false;
    });
    state.raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(state.raf);
      ro.disconnect();
      io.disconnect();
      img.removeEventListener("load", draw);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
    };
  }, [src, name, dose, purity, interactive, compact]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "vial-stage relative touch-pan-y select-none",
        interactive && "cursor-grab active:cursor-grabbing",
        className,
      )}
      role={interactive ? "slider" : undefined}
      aria-label={interactive ? `${name} ${dose} · drag to rotate 360 degrees` : undefined}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
