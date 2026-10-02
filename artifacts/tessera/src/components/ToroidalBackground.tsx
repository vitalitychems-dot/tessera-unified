import { useEffect, useRef, memo } from "react";
import { PARTICLE_COLORS, STAR_COLORS } from "@/lib/theme-constants";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

interface TorusParticle {
  angle: number;
  tubeAngle: number;
  speed: number;
  size: number;
  opacity: number;
  color: string;
  layer: number;
}

interface NebulaCloud {
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: string;
  opacity: number;
  rotation: number;
}

interface SacredNode {
  x: number;
  y: number;
  radius: number;
  connections: number[];
  color: string;
  pulsePhase: number;
  label?: string;
}

function createStar(W: number, H: number): Star {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    size: 0.3 + Math.random() * 1.6,
    opacity: 0.1 + Math.random() * 0.7,
    twinkleSpeed: 0.005 + Math.random() * 0.02,
    twinklePhase: Math.random() * Math.PI * 2,
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
  };
}

function createParticle(layer: number): TorusParticle {
  return {
    angle: Math.random() * Math.PI * 2,
    tubeAngle: Math.random() * Math.PI * 2,
    speed: (0.0003 + Math.random() * 0.0007) * (layer === 0 ? 0.5 : layer === 1 ? 1 : 1.5),
    size: 1.2 + Math.random() * 3,
    opacity: 0.35 + Math.random() * 0.55,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    layer,
  };
}

function torusPoint(angle: number, tubeAngle: number, R: number, r: number): [number, number, number] {
  const x = (R + r * Math.cos(tubeAngle)) * Math.cos(angle);
  const y = (R + r * Math.cos(tubeAngle)) * Math.sin(angle);
  const z = r * Math.sin(tubeAngle);
  return [x, y, z];
}

function project(x: number, y: number, z: number, fov: number, viewDist: number, cx: number, cy: number): [number, number, number] {
  const perspective = fov / (viewDist + z);
  return [cx + x * perspective, cy + y * perspective, perspective];
}

function drawFlowerOfLife(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha: number, t: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.008);

  const breathe = 1 + 0.03 * Math.sin(t * 0.4);
  const rr = r * breathe;

  ctx.beginPath();
  ctx.arc(0, 0, rr, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(139, 92, 246, ${alpha * 0.8})`;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    ctx.beginPath();
    ctx.arc(px, py, rr, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * (0.5 + 0.2 * Math.sin(t * 0.3 + i))})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const px = Math.cos(a) * rr * 1.73;
    const py = Math.sin(a) * rr * 1.73;
    ctx.beginPath();
    ctx.arc(px, py, rr, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(245, 158, 11, ${alpha * 0.3})`;
    ctx.lineWidth = 0.3;
    ctx.stroke();
  }

  ctx.restore();
}

function drawMetatronsCube(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha: number, t: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-t * 0.012);

  const breathe = 1 + 0.04 * Math.sin(t * 0.35);
  const rr = r * breathe;

  const vertices: [number, number][] = [];
  vertices.push([0, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    vertices.push([Math.cos(a) * rr * 0.5, Math.sin(a) * rr * 0.5]);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    vertices.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }

  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.2 + i * 0.5 + j * 0.3);
      ctx.beginPath();
      ctx.moveTo(vertices[i][0], vertices[i][1]);
      ctx.lineTo(vertices[j][0], vertices[j][1]);
      ctx.strokeStyle = `rgba(251, 113, 133, ${alpha * 0.15 * pulse})`;
      ctx.lineWidth = 0.3;
      ctx.stroke();
    }
  }

  for (const [vx, vy] of vertices) {
    const glow = ctx.createRadialGradient(vx, vy, 0, vx, vy, 4);
    glow.addColorStop(0, `rgba(139, 92, 246, ${alpha * 0.6})`);
    glow.addColorStop(1, `rgba(139, 92, 246, 0)`);
    ctx.beginPath();
    ctx.arc(vx, vy, 4, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(vx, vy, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(0, 0, rr, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.4})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, rr * 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(245, 158, 11, ${alpha * 0.35})`;
  ctx.lineWidth = 0.4;
  ctx.stroke();

  ctx.restore();
}

function drawSriYantra(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha: number, t: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.006);

  const breathe = 1 + 0.025 * Math.sin(t * 0.5);
  const rr = r * breathe;

  for (let tri = 0; tri < 4; tri++) {
    const size = rr * (1 - tri * 0.2);
    const rot = tri * Math.PI / 12;
    ctx.save();
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * size;
      const py = Math.sin(a) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.3 + tri);
    ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * (0.3 + 0.15 * pulse)})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  for (let tri = 0; tri < 5; tri++) {
    const size = rr * (0.9 - tri * 0.15);
    const rot = Math.PI + tri * Math.PI / 15;
    ctx.save();
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * size;
      const py = Math.sin(a) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.25 + tri + 2);
    ctx.strokeStyle = `rgba(251, 113, 133, ${alpha * (0.25 + 0.1 * pulse)})`;
    ctx.lineWidth = 0.4;
    ctx.stroke();
    ctx.restore();
  }

  const bindu = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
  bindu.addColorStop(0, `rgba(245, 158, 11, ${alpha * 0.8})`);
  bindu.addColorStop(1, `rgba(245, 158, 11, 0)`);
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = bindu;
  ctx.fill();

  ctx.restore();
}

function drawVesicaPiscis(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha: number, t: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.01);

  const breathe = 1 + 0.03 * Math.sin(t * 0.45);
  const rr = r * breathe;
  const offset = rr * 0.5;

  ctx.beginPath();
  ctx.arc(-offset, 0, rr, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(139, 92, 246, ${alpha * 0.5})`;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(offset, 0, rr, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.5})`;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  const intersectGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, rr * 0.4);
  intersectGlow.addColorStop(0, `rgba(245, 158, 11, ${alpha * 0.15})`);
  intersectGlow.addColorStop(1, `rgba(245, 158, 11, 0)`);
  ctx.beginPath();
  ctx.arc(0, 0, rr * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = intersectGlow;
  ctx.fill();

  ctx.restore();
}

function drawSeedOfLife(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha: number, t: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-t * 0.007);

  const breathe = 1 + 0.035 * Math.sin(t * 0.38);
  const rr = r * breathe;

  ctx.beginPath();
  ctx.arc(0, 0, rr, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(34, 211, 238, ${alpha * 0.4})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    ctx.beginPath();
    ctx.arc(px, py, rr, 0, Math.PI * 2);
    const pulse = 0.4 + 0.3 * Math.sin(t * 0.3 + i * 1.2);
    ctx.strokeStyle = `rgba(167, 139, 250, ${alpha * pulse})`;
    ctx.lineWidth = 0.4;
    ctx.stroke();
  }

  ctx.restore();
}

function drawConnectionLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, alpha: number, t: number, i: number) {
  const pulse = 0.3 + 0.7 * Math.sin(t * 0.15 + i * 0.8);
  const a = alpha * pulse * 0.12;
  if (a < 0.005) return;

  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, `rgba(6, 182, 212, ${a})`);
  grad.addColorStop(0.5, `rgba(139, 92, 246, ${a * 1.5})`);
  grad.addColorStop(1, `rgba(245, 158, 11, ${a})`);

  ctx.beginPath();
  ctx.moveTo(x1, y1);

  const mx = (x1 + x2) / 2 + Math.sin(t * 0.2 + i) * 20;
  const my = (y1 + y2) / 2 + Math.cos(t * 0.15 + i) * 20;
  ctx.quadraticCurveTo(mx, my, x2, y2);

  ctx.strokeStyle = grad;
  ctx.lineWidth = 0.4;
  ctx.stroke();

  const dotPos = (Math.sin(t * 0.3 + i * 2) + 1) / 2;
  const dx = x1 + (x2 - x1) * dotPos;
  const dy = y1 + (y2 - y1) * dotPos;
  const dotGlow = ctx.createRadialGradient(dx, dy, 0, dx, dy, 3);
  dotGlow.addColorStop(0, `rgba(255, 255, 255, ${a * 3})`);
  dotGlow.addColorStop(1, `rgba(255, 255, 255, 0)`);
  ctx.beginPath();
  ctx.arc(dx, dy, 3, 0, Math.PI * 2);
  ctx.fillStyle = dotGlow;
  ctx.fill();
}

function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) return true;
  if ("deviceMemory" in navigator && (navigator as any).deviceMemory < 4) return true;
  return false;
}

function ToroidalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const particlesRef = useRef<TorusParticle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const nebulaeRef = useRef<NebulaCloud[]>([]);
  const timeRef = useRef(0);
  const visibleRef = useRef(true);
  const onScreenRef = useRef(true);
  const lastFrameRef = useRef(0);
  const targetFpsRef = useRef(20);

  useEffect(() => {
    const lowEnd = isLowEndDevice();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedRef = { current: motionQuery.matches };
    if (reducedRef.current) {
      targetFpsRef.current = 1;
    } else if (lowEnd) {
      targetFpsRef.current = 12;
    }
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedRef.current = e.matches;
      targetFpsRef.current = e.matches ? 1 : lowEnd ? 12 : 20;
    };
    motionQuery.addEventListener("change", onMotionChange);

    const onVisChange = () => {
      visibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisChange);

    const canvas = canvasRef.current;
    if (!canvas) return;

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          onScreenRef.current = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0 },
      );
      observer.observe(canvas);
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const particleScale = lowEnd ? 0.5 : 1;
    const layers = [
      { R: 290, r: 85, count: Math.round(55 * particleScale), tilt: 0 },
      { R: 185, r: 58, count: Math.round(42 * particleScale), tilt: Math.PI / 5 },
      { R: 115, r: 36, count: Math.round(30 * particleScale), tilt: Math.PI / 2.8 },
    ];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const W = canvas.width;
      const H = canvas.height;

      starsRef.current = [];
      const starDensity = lowEnd ? 6000 : 3800;
      const starCount = Math.floor((W * H) / starDensity);
      for (let i = 0; i < starCount; i++) {
        starsRef.current.push(createStar(W, H));
      }

      nebulaeRef.current = [
        { x: W * 0.15, y: H * 0.2, rx: W * 0.18, ry: H * 0.12, color: "#4f46e5", opacity: 0.045, rotation: -0.3 },
        { x: W * 0.8, y: H * 0.75, rx: W * 0.22, ry: H * 0.14, color: "#7c3aed", opacity: 0.04, rotation: 0.5 },
        { x: W * 0.5, y: H * 0.5, rx: W * 0.3, ry: H * 0.2, color: "#0e7490", opacity: 0.03, rotation: 0.1 },
        { x: W * 0.7, y: H * 0.15, rx: W * 0.14, ry: H * 0.1, color: "#b45309", opacity: 0.035, rotation: -0.6 },
        { x: W * 0.25, y: H * 0.82, rx: W * 0.17, ry: H * 0.09, color: "#be185d", opacity: 0.03, rotation: 0.2 },
      ];
    };

    particlesRef.current = [];
    layers.forEach((_, li) => {
      for (let i = 0; i < layers[li].count; i++) {
        particlesRef.current.push(createParticle(li));
      }
    });

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
      const cx = W / 2;
      const cy = H / 2;

      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.85);
      bg.addColorStop(0, "rgba(15, 5, 35, 0.18)");
      bg.addColorStop(0.35, "rgba(8, 2, 22, 0.12)");
      bg.addColorStop(0.7, "rgba(4, 1, 12, 0.08)");
      bg.addColorStop(1, "rgba(1, 0, 5, 0.04)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      timeRef.current += 0.007;
      const t = timeRef.current;

      for (const neb of nebulaeRef.current) {
        ctx.save();
        ctx.translate(neb.x, neb.y);
        ctx.rotate(neb.rotation + t * 0.004);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, neb.rx);
        const hex = neb.color;
        grad.addColorStop(0, hex + "55");
        grad.addColorStop(0.4, hex + "20");
        grad.addColorStop(1, hex + "00");
        ctx.scale(1, neb.ry / neb.rx);
        ctx.beginPath();
        ctx.arc(0, 0, neb.rx, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      for (const star of starsRef.current) {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
        const alpha = star.opacity * (0.6 + 0.4 * twinkle);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * (0.85 + 0.15 * twinkle), 0, Math.PI * 2);
        const hex = star.color;
        ctx.fillStyle = hex + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
        if (star.size > 1.1 && twinkle > 0.7) {
          const glowGrad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 4);
          glowGrad.addColorStop(0, hex + "40");
          glowGrad.addColorStop(1, hex + "00");
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }
      }

      const spiralArms = 2;
      for (let arm = 0; arm < spiralArms; arm++) {
        const armOffset = (arm / spiralArms) * Math.PI * 2;
        for (let i = 0; i < 120; i++) {
          const s = i / 120;
          const spiralAngle = s * Math.PI * 3 + armOffset + t * 0.02;
          const spiralR = 20 + s * Math.min(W, H) * 0.28;
          const sx = cx + Math.cos(spiralAngle) * spiralR;
          const sy = cy + Math.sin(spiralAngle) * spiralR * 0.38;
          const alpha = (0.03 - s * 0.025) * (0.6 + 0.4 * Math.sin(t * 0.3 + s * 5));
          if (alpha > 0.002) {
            ctx.beginPath();
            ctx.arc(sx, sy, 0.6 + s * 0.8, 0, Math.PI * 2);
            const armColor = arm === 0 ? `rgba(139,92,246,${alpha})` : `rgba(6,182,212,${alpha})`;
            ctx.fillStyle = armColor;
            ctx.fill();
          }
        }
      }

      const sacredAlpha = 0.12 + 0.04 * Math.sin(t * 0.2);
      if (!reducedRef.current) {
        const sacredPositions = [
          { x: W * 0.15, y: H * 0.2, r: Math.min(W, H) * 0.06 },
          { x: W * 0.85, y: H * 0.15, r: Math.min(W, H) * 0.055 },
          { x: W * 0.1, y: H * 0.75, r: Math.min(W, H) * 0.05 },
          { x: W * 0.88, y: H * 0.8, r: Math.min(W, H) * 0.058 },
          { x: W * 0.5, y: H * 0.12, r: Math.min(W, H) * 0.045 },
          { x: W * 0.5, y: H * 0.88, r: Math.min(W, H) * 0.05 },
          { x: W * 0.25, y: H * 0.5, r: Math.min(W, H) * 0.04 },
          { x: W * 0.75, y: H * 0.5, r: Math.min(W, H) * 0.042 },
        ];

        drawFlowerOfLife(ctx, sacredPositions[0].x, sacredPositions[0].y, sacredPositions[0].r, sacredAlpha, t);
        drawMetatronsCube(ctx, sacredPositions[1].x, sacredPositions[1].y, sacredPositions[1].r, sacredAlpha, t);
        drawSriYantra(ctx, sacredPositions[2].x, sacredPositions[2].y, sacredPositions[2].r, sacredAlpha, t);
        drawVesicaPiscis(ctx, sacredPositions[3].x, sacredPositions[3].y, sacredPositions[3].r, sacredAlpha, t);
        drawSeedOfLife(ctx, sacredPositions[4].x, sacredPositions[4].y, sacredPositions[4].r, sacredAlpha, t);
        drawFlowerOfLife(ctx, sacredPositions[5].x, sacredPositions[5].y, sacredPositions[5].r, sacredAlpha * 0.7, t + 2);
        drawMetatronsCube(ctx, sacredPositions[6].x, sacredPositions[6].y, sacredPositions[6].r, sacredAlpha * 0.6, t + 4);
        drawSeedOfLife(ctx, sacredPositions[7].x, sacredPositions[7].y, sacredPositions[7].r, sacredAlpha * 0.65, t + 3);

        for (let i = 0; i < sacredPositions.length; i++) {
          for (let j = i + 1; j < sacredPositions.length; j++) {
            const dist = Math.hypot(sacredPositions[i].x - sacredPositions[j].x, sacredPositions[i].y - sacredPositions[j].y);
            if (dist < Math.max(W, H) * 0.6) {
              drawConnectionLine(ctx, sacredPositions[i].x, sacredPositions[i].y, sacredPositions[j].x, sacredPositions[j].y, sacredAlpha, t, i + j);
            }
          }
        }
      }

      const rotY = t * 0.13;
      const rotX = Math.sin(t * 0.06) * 0.28 + Math.PI * 0.08;

      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      layers.forEach((layer, li) => {
        const { R, r, tilt } = layer;
        const cosT = Math.cos(tilt), sinT = Math.sin(tilt);

        const ringPoints: [number, number, number][] = [];
        const ringSegs = 96;
        for (let i = 0; i <= ringSegs; i++) {
          const angle = (i / ringSegs) * Math.PI * 2;
          let [px, py, pz] = torusPoint(angle, 0, R, r);
          const py2 = py * cosT - pz * sinT;
          const pz2 = py * sinT + pz * cosT;
          const px3 = px * cosY + pz2 * sinY;
          const pz3 = -px * sinY + pz2 * cosY;
          const py4 = py2 * cosX - pz3 * sinX;
          const pz4 = py2 * sinX + pz3 * cosX;
          ringPoints.push(project(px3, py4, pz4, 520, 580, cx, cy));
        }

        const ringAlpha = [0.14, 0.1, 0.08][li];
        const ringColors = [
          `rgba(6,182,212,${ringAlpha + 0.04 * Math.sin(t * 0.5)})`,
          `rgba(139,92,246,${ringAlpha + 0.03 * Math.sin(t * 0.4 + 1)})`,
          `rgba(245,158,11,${ringAlpha + 0.03 * Math.sin(t * 0.6 + 2)})`,
        ];

        if (ringPoints.length > 1) {
          ctx.beginPath();
          ringPoints.forEach(([sx, sy], i) => {
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          });
          ctx.strokeStyle = ringColors[li];
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        particlesRef.current
          .filter(p => p.layer === li)
          .forEach(p => {
            p.angle += p.speed;
            p.tubeAngle += p.speed * 2.8;

            let [px, py, pz] = torusPoint(p.angle, p.tubeAngle, R, r);
            const py2 = py * cosT - pz * sinT;
            const pz2 = py * sinT + pz * cosT;
            const px3 = px * cosY + pz2 * sinY;
            const pz3 = -px * sinY + pz2 * cosY;
            const py4 = py2 * cosX - pz3 * sinX;
            const pz4 = py2 * sinX + pz3 * cosX;

            const [sx, sy] = project(px3, py4, pz4, 520, 580, cx, cy);

            if (pz4 < 450) {
              const depthFactor = Math.max(0.25, Math.min(1, (450 - pz4) / 550));
              const glowSize = p.size * depthFactor * 2.8;
              const alpha = p.opacity * depthFactor;

              const colorBase = p.color;
              const r255 = parseInt(colorBase.slice(1, 3), 16);
              const g255 = parseInt(colorBase.slice(3, 5), 16);
              const b255 = parseInt(colorBase.slice(5, 7), 16);

              const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowSize * 5);
              grd.addColorStop(0, `rgba(${r255},${g255},${b255},${alpha})`);
              grd.addColorStop(1, `rgba(${r255},${g255},${b255},0)`);
              ctx.beginPath();
              ctx.arc(sx, sy, glowSize * 5, 0, Math.PI * 2);
              ctx.fillStyle = grd;
              ctx.fill();

              ctx.beginPath();
              ctx.arc(sx, sy, glowSize * 0.9, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${r255},${g255},${b255},${Math.min(1, alpha * 1.2)})`;
              ctx.fill();
            }
          });
      });

      const geomAlpha = 0.07 + Math.sin(t * 0.35) * 0.025;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.025);

      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const fx = Math.cos(ang) * 42;
        const fy = Math.sin(ang) * 42;
        ctx.beginPath();
        ctx.arc(fx, fy, 42, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(6, 182, 212, ${geomAlpha})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(139, 92, 246, ${geomAlpha * 1.2})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();

      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * 90, Math.sin(ang) * 90);
        ctx.strokeStyle = `rgba(245, 158, 11, ${geomAlpha * 0.6})`;
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      const outerR = 90 + 8 * Math.sin(t * 0.5);
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(251,113,133,${geomAlpha * 0.5})`;
      ctx.lineWidth = 0.4;
      ctx.stroke();

      ctx.restore();

      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 + 15 * Math.sin(t * 0.8));
      coreGlow.addColorStop(0, `rgba(139,92,246,${0.06 + 0.02 * Math.sin(t * 0.9)})`);
      coreGlow.addColorStop(0.5, `rgba(6,182,212,${0.03 + 0.01 * Math.sin(t * 0.7)})`);
      coreGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, 60 + 15 * Math.sin(t * 0.8), 0, Math.PI * 2);
      ctx.fillStyle = coreGlow;
      ctx.fill();

      frameRef.current = requestAnimationFrame(draw);
    };

    draw(0);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisChange);
      motionQuery.removeEventListener("change", onMotionChange);
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        opacity: 0.92,
        mixBlendMode: "screen",
      }}
      aria-hidden="true"
    />
  );
}

export default memo(ToroidalBackground);
