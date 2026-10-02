import { useEffect, useRef, memo, Component, type ReactNode, useState } from "react";
import { useLocation } from "wouter";

class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const StaticFallback = (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 0,
      background: "radial-gradient(ellipse at 30% 40%, #1a0a3e 0%, #0d0628 30%, #050215 70%, #010005 100%)",
      pointerEvents: "none",
    }}
  />
);

interface Star {
  x: number; y: number; size: number; brightness: number;
  twinkleSpeed: number; twinklePhase: number;
  r: number; g: number; b: number;
}

interface NebulaCloud {
  cx: number; cy: number;
  rx: number; ry: number;
  hue: number; hueShift: number;
  rotation: number; rotSpeed: number;
  intensity: number;
}

interface DustRing {
  cx: number; cy: number;
  radius: number; thickness: number;
  hue: number; speed: number;
  tiltX: number; tiltY: number;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 1) + 1) % 1;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function isLowEnd(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) return true;
  if ("deviceMemory" in navigator) {
    const nav = navigator as Navigator & { deviceMemory?: number };
    if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return true;
  }
  return false;
}

function HyperdimensionalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const starsRef = useRef<Star[]>([]);
  const nebulaeRef = useRef<NebulaCloud[]>([]);
  const ringsRef = useRef<DustRing[]>([]);
  const visibleRef = useRef(true);
  const onScreenRef = useRef(true);
  const lastFrameRef = useRef(0);
  const targetFpsRef = useRef(24);

  useEffect(() => {
    const lowEnd = isLowEnd();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      targetFpsRef.current = 1;
    } else if (lowEnd) {
      targetFpsRef.current = 14;
    }

    const onVisChange = () => { visibleRef.current = !document.hidden; };
    document.addEventListener("visibilitychange", onVisChange);

    const canvas = canvasRef.current;
    if (!canvas) return;

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => { onScreenRef.current = entries[0]?.isIntersecting ?? true; },
        { threshold: 0 },
      );
      observer.observe(canvas);
    }

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const STAR_COLORS: [number, number, number][] = [
      [255, 255, 255],
      [200, 220, 255],
      [255, 200, 150],
      [255, 130, 200],
      [130, 255, 220],
      [180, 160, 255],
      [255, 240, 200],
    ];

    function createStars(W: number, H: number) {
      const density = lowEnd ? 5000 : 3000;
      const count = Math.floor((W * H) / density);
      starsRef.current = [];
      for (let i = 0; i < count; i++) {
        const c = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
        starsRef.current.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size: 0.3 + Math.random() * 2.2,
          brightness: 0.3 + Math.random() * 0.7,
          twinkleSpeed: 0.3 + Math.random() * 2.5,
          twinklePhase: Math.random() * Math.PI * 2,
          r: c[0], g: c[1], b: c[2],
        });
      }
    }

    function createNebulae(W: number, H: number) {
      nebulaeRef.current = [
        { cx: W * 0.2, cy: H * 0.25, rx: W * 0.3, ry: H * 0.25, hue: 0.75, hueShift: 0.02, rotation: 0, rotSpeed: 0.003, intensity: 0.35 },
        { cx: W * 0.75, cy: H * 0.7, rx: W * 0.35, ry: H * 0.3, hue: 0.55, hueShift: -0.015, rotation: 0.5, rotSpeed: -0.002, intensity: 0.3 },
        { cx: W * 0.5, cy: H * 0.45, rx: W * 0.45, ry: H * 0.35, hue: 0.85, hueShift: 0.01, rotation: -0.3, rotSpeed: 0.001, intensity: 0.25 },
        { cx: W * 0.15, cy: H * 0.8, rx: W * 0.25, ry: H * 0.2, hue: 0.15, hueShift: 0.025, rotation: 0.8, rotSpeed: -0.004, intensity: 0.3 },
        { cx: W * 0.85, cy: H * 0.2, rx: W * 0.28, ry: H * 0.22, hue: 0.65, hueShift: -0.01, rotation: -0.6, rotSpeed: 0.002, intensity: 0.28 },
        { cx: W * 0.45, cy: H * 0.85, rx: W * 0.32, ry: H * 0.18, hue: 0.95, hueShift: 0.018, rotation: 0.2, rotSpeed: -0.003, intensity: 0.22 },
      ];
    }

    function createRings(W: number, H: number) {
      const cx = W / 2, cy = H / 2;
      ringsRef.current = [];
      for (let i = 0; i < 6; i++) {
        ringsRef.current.push({
          cx: cx + (Math.random() - 0.5) * W * 0.3,
          cy: cy + (Math.random() - 0.5) * H * 0.3,
          radius: 80 + i * 50 + Math.random() * 40,
          thickness: 1 + Math.random() * 2,
          hue: i / 6,
          speed: 0.15 + Math.random() * 0.3,
          tiltX: Math.random() * Math.PI,
          tiltY: Math.random() * Math.PI,
        });
      }
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createStars(canvas.width, canvas.height);
      createNebulae(canvas.width, canvas.height);
      createRings(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = (timestamp: number) => {
      const frameInterval = 1000 / targetFpsRef.current;
      if (timestamp - lastFrameRef.current < frameInterval) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameRef.current = timestamp;

      if (!visibleRef.current || !onScreenRef.current) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      const W = canvas.width;
      const H = canvas.height;
      timeRef.current += 0.012;
      const t = timeRef.current;

      ctx.fillStyle = "#050210";
      ctx.fillRect(0, 0, W, H);

      const bgGrad = ctx.createRadialGradient(W * 0.3, H * 0.4, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
      bgGrad.addColorStop(0, "rgba(25, 10, 60, 0.4)");
      bgGrad.addColorStop(0.3, "rgba(10, 5, 35, 0.3)");
      bgGrad.addColorStop(0.6, "rgba(5, 15, 40, 0.2)");
      bgGrad.addColorStop(1, "rgba(2, 1, 8, 0.1)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      for (const neb of nebulaeRef.current) {
        ctx.save();
        ctx.translate(neb.cx, neb.cy);
        ctx.rotate(neb.rotation + t * neb.rotSpeed);

        const hue = ((neb.hue + t * neb.hueShift) % 1 + 1) % 1;
        const pulse = 0.8 + 0.3 * Math.sin(t * 0.5 + neb.hue * 10);
        const [r1, g1, b1] = hslToRgb(hue, 0.9, 0.45);
        const [r2, g2, b2] = hslToRgb((hue + 0.15) % 1, 0.85, 0.35);
        const [r3, g3, b3] = hslToRgb((hue + 0.35) % 1, 0.8, 0.25);

        const intensity = neb.intensity * pulse;

        const grad1 = ctx.createRadialGradient(0, 0, 0, 0, 0, neb.rx);
        grad1.addColorStop(0, `rgba(${r1},${g1},${b1},${intensity * 0.6})`);
        grad1.addColorStop(0.3, `rgba(${r2},${g2},${b2},${intensity * 0.35})`);
        grad1.addColorStop(0.6, `rgba(${r3},${g3},${b3},${intensity * 0.15})`);
        grad1.addColorStop(1, `rgba(${r3},${g3},${b3},0)`);

        ctx.scale(1, neb.ry / neb.rx);
        ctx.beginPath();
        ctx.arc(0, 0, neb.rx, 0, Math.PI * 2);
        ctx.fillStyle = grad1;
        ctx.fill();

        ctx.restore();

        ctx.save();
        ctx.translate(neb.cx + Math.sin(t * 0.3 + neb.hue * 5) * 20, neb.cy + Math.cos(t * 0.25 + neb.hue * 3) * 15);
        ctx.rotate(neb.rotation * 1.5 + t * neb.rotSpeed * -0.5);

        const grad2 = ctx.createRadialGradient(0, 0, 0, 0, 0, neb.rx * 0.6);
        const [ra, ga, ba] = hslToRgb((hue + 0.5) % 1, 0.95, 0.5);
        grad2.addColorStop(0, `rgba(${ra},${ga},${ba},${intensity * 0.3})`);
        grad2.addColorStop(0.5, `rgba(${ra},${ga},${ba},${intensity * 0.1})`);
        grad2.addColorStop(1, `rgba(${ra},${ga},${ba},0)`);

        ctx.scale(1, 0.7);
        ctx.beginPath();
        ctx.arc(0, 0, neb.rx * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = grad2;
        ctx.fill();
        ctx.restore();
      }

      for (const star of starsRef.current) {
        star.twinklePhase += star.twinkleSpeed * 0.012;
        const tw = 0.4 + 0.6 * Math.sin(star.twinklePhase);
        const alpha = star.brightness * tw;
        const sz = star.size * (0.8 + 0.2 * tw);

        ctx.beginPath();
        ctx.arc(star.x, star.y, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.r},${star.g},${star.b},${alpha})`;
        ctx.fill();

        if (sz > 1.2 && tw > 0.6) {
          const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, sz * 5);
          glow.addColorStop(0, `rgba(${star.r},${star.g},${star.b},${alpha * 0.25})`);
          glow.addColorStop(0.5, `rgba(${star.r},${star.g},${star.b},${alpha * 0.08})`);
          glow.addColorStop(1, `rgba(${star.r},${star.g},${star.b},0)`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, sz * 5, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          ctx.strokeStyle = `rgba(${star.r},${star.g},${star.b},${alpha * 0.15})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(star.x - sz * 4, star.y);
          ctx.lineTo(star.x + sz * 4, star.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(star.x, star.y - sz * 4);
          ctx.lineTo(star.x, star.y + sz * 4);
          ctx.stroke();
        }
      }

      for (const ring of ringsRef.current) {
        const hue = ((ring.hue + t * 0.02) % 1 + 1) % 1;
        const [rr, rg, rb] = hslToRgb(hue, 0.9, 0.55);
        const pulse = 0.5 + 0.5 * Math.sin(t * ring.speed + ring.hue * 10);

        ctx.save();
        ctx.translate(ring.cx, ring.cy);

        const tiltFactor = 0.3 + 0.3 * Math.sin(t * 0.1 + ring.tiltX);
        ctx.scale(1, tiltFactor);
        ctx.rotate(t * ring.speed * 0.3 + ring.tiltY);

        ctx.beginPath();
        ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${0.15 * pulse})`;
        ctx.lineWidth = ring.thickness;
        ctx.stroke();

        const glowGrad = ctx.createRadialGradient(0, 0, ring.radius - 8, 0, 0, ring.radius + 8);
        glowGrad.addColorStop(0, `rgba(${rr},${rg},${rb},0)`);
        glowGrad.addColorStop(0.4, `rgba(${rr},${rg},${rb},${0.04 * pulse})`);
        glowGrad.addColorStop(0.6, `rgba(${rr},${rg},${rb},${0.04 * pulse})`);
        glowGrad.addColorStop(1, `rgba(${rr},${rg},${rb},0)`);
        ctx.beginPath();
        ctx.arc(0, 0, ring.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        ctx.restore();
      }

      const auroraY = H * 0.15;
      for (let band = 0; band < 3; band++) {
        const bandHue = ((0.45 + band * 0.2 + t * 0.008 * (band + 1)) % 1 + 1) % 1;
        const [ar, ag, ab] = hslToRgb(bandHue, 0.9, 0.5);
        const bandOffset = band * H * 0.06;

        ctx.beginPath();
        ctx.moveTo(0, auroraY + bandOffset);
        for (let x = 0; x <= W; x += 4) {
          const wave = Math.sin(x * 0.008 + t * (0.3 + band * 0.1) + band * 2) * 25
            + Math.sin(x * 0.015 - t * 0.2 + band) * 12;
          ctx.lineTo(x, auroraY + bandOffset + wave);
        }
        ctx.lineTo(W, auroraY + bandOffset + 40);
        ctx.lineTo(0, auroraY + bandOffset + 40);
        ctx.closePath();

        const aGrad = ctx.createLinearGradient(0, auroraY + bandOffset - 30, 0, auroraY + bandOffset + 40);
        const aPulse = 0.5 + 0.5 * Math.sin(t * 0.2 + band * 1.5);
        aGrad.addColorStop(0, `rgba(${ar},${ag},${ab},0)`);
        aGrad.addColorStop(0.3, `rgba(${ar},${ag},${ab},${0.08 * aPulse})`);
        aGrad.addColorStop(0.5, `rgba(${ar},${ag},${ab},${0.12 * aPulse})`);
        aGrad.addColorStop(0.7, `rgba(${ar},${ag},${ab},${0.06 * aPulse})`);
        aGrad.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
        ctx.fillStyle = aGrad;
        ctx.fill();
      }

      const spiralCx = W * 0.6;
      const spiralCy = H * 0.55;
      const arms = 3;
      const spiralPts = lowEnd ? 80 : 150;
      for (let arm = 0; arm < arms; arm++) {
        const armAngle = (arm / arms) * Math.PI * 2 + t * 0.05;
        for (let i = 0; i < spiralPts; i++) {
          const frac = i / spiralPts;
          const r = 10 + frac * Math.min(W, H) * 0.2;
          const angle = armAngle + frac * 5;
          const x = spiralCx + Math.cos(angle) * r;
          const y = spiralCy + Math.sin(angle) * r * 0.5;

          const hue = ((arm / arms + frac * 0.4 + t * 0.01) % 1 + 1) % 1;
          const [sr, sg, sb] = hslToRgb(hue, 0.85, 0.55);
          const alpha = (1 - frac) * 0.5 * (0.5 + 0.5 * Math.sin(t + i * 0.2));
          const sz = 1.5 + (1 - frac) * 3;

          ctx.beginPath();
          ctx.arc(x, y, sz, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${sr},${sg},${sb},${alpha})`;
          ctx.fill();
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisChange);
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

function RickMortyPsychedelicCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const visibleRef = useRef(true);
  const lastFrameRef = useRef(0);
  const targetFpsRef = useRef(20);

  useEffect(() => {
    const lowEnd = isLowEnd();
    if (lowEnd) targetFpsRef.current = 12;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) targetFpsRef.current = 1;

    const onVisChange = () => { visibleRef.current = !document.hidden; };
    document.addEventListener("visibilitychange", onVisChange);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (timestamp: number) => {
      const frameInterval = 1000 / targetFpsRef.current;
      if (timestamp - lastFrameRef.current < frameInterval) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameRef.current = timestamp;
      if (!visibleRef.current) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      const W = canvas.width;
      const H = canvas.height;
      timeRef.current += 0.018;
      const t = timeRef.current;

      ctx.fillStyle = "#04080d";
      ctx.fillRect(0, 0, W, H);

      const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.9);
      const h1 = (t * 0.04) % 1;
      const h2 = (t * 0.04 + 0.33) % 1;
      const h3 = (t * 0.04 + 0.66) % 1;
      const [r1, g1, b1] = hslToRgb(h1, 0.75, 0.14);
      const [r2, g2, b2] = hslToRgb(h2, 0.65, 0.09);
      const [r3, g3, b3] = hslToRgb(h3, 0.55, 0.06);
      bgGrad.addColorStop(0, `rgba(${r1},${g1},${b1},0.9)`);
      bgGrad.addColorStop(0.55, `rgba(${r2},${g2},${b2},0.5)`);
      bgGrad.addColorStop(1, `rgba(${r3},${g3},${b3},0.3)`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      const portalX = W * 0.62;
      const portalY = H * 0.36;
      const scale = W / 400;
      const maxRings = lowEnd ? 4 : 7;

      for (let i = 0; i < maxRings; i++) {
        const frac = i / maxRings;
        const ringR = (55 + i * 42) * scale;
        const angle = t * (0.4 + i * 0.08) + i * 0.25;
        const hue = (0.37 + frac * 0.12 + t * 0.015) % 1;
        const [pr, pg, pb] = hslToRgb(hue, 0.95, 0.55 - frac * 0.15);
        ctx.save();
        ctx.translate(portalX, portalY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, ringR, ringR * 0.38, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${pr},${pg},${pb},${0.75 - frac * 0.55})`;
        ctx.lineWidth = 2.5 - frac * 1.3;
        ctx.stroke();
        ctx.restore();
      }

      const portalGlow = ctx.createRadialGradient(portalX, portalY, 0, portalX, portalY, 90 * scale);
      const portalHue = (0.38 + t * 0.025) % 1;
      const [pgr, pgg, pgb] = hslToRgb(portalHue, 0.9, 0.6);
      portalGlow.addColorStop(0, `rgba(${pgr},${pgg},${pgb},0.45)`);
      portalGlow.addColorStop(0.45, `rgba(${pgr},${pgg},${pgb},0.12)`);
      portalGlow.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = portalGlow;
      ctx.fillRect(0, 0, W, H);

      const particleCount = lowEnd ? 18 : 36;
      for (let i = 0; i < particleCount; i++) {
        const ang = (i / particleCount) * Math.PI * 2 + t * 0.25;
        const pr2 = (32 + Math.sin(t * 0.4 + i * 0.45) * 90) * scale;
        const px = portalX + Math.cos(ang) * pr2;
        const py = portalY + Math.sin(ang) * pr2 * 0.42;
        const hue = (i / particleCount + t * 0.045) % 1;
        const [sr, sg, sb] = hslToRgb(hue, 0.95, 0.62);
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${sr},${sg},${sb},${0.35 + Math.sin(t + i * 0.55) * 0.2})`;
        ctx.fill();
      }

      const rickX = W * 0.18;
      const rickY = H * 0.76;
      const s = Math.min(W, H) * 0.003;

      const auraGrad = ctx.createRadialGradient(rickX, rickY - 20 * s, 0, rickX, rickY - 10 * s, 70 * s);
      const auraHue = (t * 0.07) % 1;
      const [ar, ag, ab] = hslToRgb(auraHue, 0.9, 0.55);
      const auraAlpha = 0.14 + Math.sin(t * 1.4) * 0.06;
      auraGrad.addColorStop(0, `rgba(${ar},${ag},${ab},${auraAlpha * 2.5})`);
      auraGrad.addColorStop(0.5, `rgba(${ar},${ag},${ab},${auraAlpha})`);
      auraGrad.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.ellipse(rickX, rickY - 15 * s, 65 * s, 55 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(215,215,225,0.88)";
      ctx.fillRect(rickX - 17 * s, rickY - 28 * s, 34 * s, 48 * s);
      ctx.fillStyle = "rgba(50,180,100,0.75)";
      ctx.fillRect(rickX - 7 * s, rickY - 28 * s, 14 * s, 12 * s);

      ctx.beginPath();
      ctx.ellipse(rickX, rickY - 44 * s, 15 * s, 17 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(225,205,175,0.92)";
      ctx.fill();

      ctx.fillStyle = "rgba(155,155,165,0.97)";
      ctx.beginPath();
      ctx.ellipse(rickX - 6 * s, rickY - 61 * s, 13 * s, 9 * s, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(rickX + 7 * s, rickY - 57 * s);
      ctx.lineTo(rickX + 23 * s, rickY - 80 * s);
      ctx.lineTo(rickX + 15 * s, rickY - 55 * s);
      ctx.closePath();
      ctx.fillStyle = "rgba(140,140,150,0.95)";
      ctx.fill();

      ctx.strokeStyle = "rgba(20,20,30,0.85)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(rickX - 7 * s, rickY - 44 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(rickX + 7 * s, rickY - 44 * s, 5 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(20,20,30,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rickX - 2 * s, rickY - 44 * s);
      ctx.lineTo(rickX + 2 * s, rickY - 44 * s);
      ctx.stroke();

      ctx.fillStyle = "rgba(50,210,110,0.9)";
      ctx.beginPath();
      ctx.arc(rickX - 7 * s, rickY - 44 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rickX + 7 * s, rickY - 44 * s, 2 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(215,215,225,0.82)";
      ctx.lineWidth = 5 * s;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rickX - 17 * s, rickY - 18 * s);
      ctx.lineTo(rickX - 38 * s, rickY - 38 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rickX + 17 * s, rickY - 18 * s);
      ctx.lineTo(rickX + 28 * s, rickY + 2 * s);
      ctx.stroke();

      ctx.fillStyle = "rgba(0,195,95,0.82)";
      ctx.fillRect(rickX - 55 * s, rickY - 47 * s, 20 * s, 11 * s);
      const gunGlowX = rickX - 38 * s;
      const gunGlowY = rickY - 42 * s;
      const ggPulse = 0.6 + Math.sin(t * 3) * 0.35;
      ctx.fillStyle = `rgba(0,255,130,${ggPulse})`;
      ctx.beginPath();
      ctx.arc(gunGlowX, gunGlowY, 5 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(70,70,90,0.82)";
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.moveTo(rickX - 8 * s, rickY + 20 * s);
      ctx.lineTo(rickX - 11 * s, rickY + 48 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rickX + 8 * s, rickY + 20 * s);
      ctx.lineTo(rickX + 11 * s, rickY + 48 * s);
      ctx.stroke();

      if (Math.floor(t * 0.4) % 6 === 0) {
        const textAlpha = (Math.sin(t * 2.5) * 0.25 + 0.2);
        ctx.fillStyle = `rgba(0,255,100,${textAlpha})`;
        ctx.font = `bold ${Math.max(9, Math.round(10 * s))}px monospace`;
        ctx.fillText("WUBBA LUBBA DUB DUB", rickX - 45 * s, rickY - 92 * s);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

function HyperdimensionalBackground() {
  const [location] = useLocation();
  const [variant, setVariant] = useState<"hyperdimensional" | "rick-morty">(() => {
    try { return (localStorage.getItem("tessera-bg") as "hyperdimensional" | "rick-morty") || "hyperdimensional"; }
    catch { return "hyperdimensional"; }
  });

  const toggleVariant = () => {
    const next = variant === "hyperdimensional" ? "rick-morty" : "hyperdimensional";
    setVariant(next);
    try { localStorage.setItem("tessera-bg", next); } catch {}
  };

  const isUniversePage = location === "/universe" || location === "/universe-model";

  if (isUniversePage) {
    return StaticFallback;
  }

  return (
    <>
      <ErrorBoundary fallback={StaticFallback}>
        {variant === "rick-morty" ? <RickMortyPsychedelicCanvas /> : <HyperdimensionalCanvas />}
      </ErrorBoundary>
      <button
        onClick={toggleVariant}
        title={variant === "rick-morty" ? "Switch to Hyperdimensional" : "Switch to Rick & Morty Psychedelic"}
        style={{
          position: "fixed",
          bottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
          left: "8px",
          zIndex: 49,
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "8px",
          padding: "5px 9px",
          fontSize: "15px",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          lineHeight: 1,
          pointerEvents: "auto",
        }}
      >
        {variant === "rick-morty" ? "🌌" : "🧪"}
      </button>
    </>
  );
}

export default memo(HyperdimensionalBackground);
