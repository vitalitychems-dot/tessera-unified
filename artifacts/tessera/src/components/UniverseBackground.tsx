import { useRef, useMemo, memo, useEffect, useState, Component, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useLocation } from "wouter";
import * as THREE from "three";
import { STAR_CATALOG, type CatalogStar } from "@/data/star-catalog";

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
      c.width = 0;
      c.height = 0;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
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
      background: "radial-gradient(ellipse at center, #0a0520 0%, #030108 70%, #010005 100%)",
    }}
  />
);

function raDecToXYZ(ra: number, dec: number, r: number): [number, number, number] {
  const raRad = (ra / 24) * Math.PI * 2;
  const decRad = (dec / 180) * Math.PI;
  const x = r * Math.cos(decRad) * Math.cos(raRad);
  const y = r * Math.sin(decRad);
  const z = r * Math.cos(decRad) * Math.sin(raRad);
  return [x, y, z];
}

function spectralToColor(sp: string): THREE.Color {
  switch (sp.charAt(0)) {
    case "O": return new THREE.Color(0.6, 0.7, 1.0);
    case "B": return new THREE.Color(0.7, 0.8, 1.0);
    case "A": return new THREE.Color(0.9, 0.92, 1.0);
    case "F": return new THREE.Color(1.0, 1.0, 0.9);
    case "G": return new THREE.Color(1.0, 0.95, 0.7);
    case "K": return new THREE.Color(1.0, 0.8, 0.5);
    case "M": return new THREE.Color(1.0, 0.6, 0.4);
    default: return new THREE.Color(1.0, 1.0, 1.0);
  }
}

function magToSize(mag: number): number {
  return Math.max(0.3, 3.5 - mag * 0.4);
}

function findCatalogStar(ra: number, dec: number): CatalogStar | undefined {
  return STAR_CATALOG.find(s =>
    Math.abs(s.ra - ra) < 0.15 && Math.abs(s.dec - dec) < 1.0
  );
}

interface ConstellationDef {
  starCoords: { ra: number; dec: number }[];
  lines: [number, number][];
}

const ZODIAC_CONSTELLATIONS: Record<string, ConstellationDef> = {
  Aries: {
    starCoords: [
      { ra: 1.907, dec: 20.81 },
      { ra: 1.911, dec: 23.46 },
      { ra: 1.885, dec: 19.29 },
      { ra: 2.833, dec: 21.14 },
    ],
    lines: [[0, 1], [0, 2], [2, 3]],
  },
  Taurus: {
    starCoords: [
      { ra: 4.599, dec: 16.51 },
      { ra: 5.438, dec: 28.61 },
      { ra: 4.477, dec: 15.96 },
      { ra: 4.382, dec: 17.54 },
      { ra: 4.330, dec: 15.63 },
      { ra: 5.627, dec: 21.14 },
    ],
    lines: [[0, 2], [2, 3], [3, 4], [0, 5], [5, 1]],
  },
  Gemini: {
    starCoords: [
      { ra: 7.577, dec: 28.03 },
      { ra: 7.576, dec: 31.89 },
      { ra: 6.629, dec: 25.13 },
      { ra: 6.383, dec: 22.51 },
      { ra: 7.068, dec: 20.57 },
      { ra: 6.732, dec: 12.90 },
    ],
    lines: [[1, 2], [2, 3], [0, 4], [4, 5], [2, 4]],
  },
  Cancer: {
    starCoords: [
      { ra: 8.745, dec: 18.15 },
      { ra: 8.275, dec: 9.19 },
      { ra: 8.722, dec: 21.47 },
      { ra: 9.133, dec: 18.15 },
      { ra: 8.778, dec: 28.76 },
    ],
    lines: [[0, 1], [0, 2], [0, 3], [2, 4]],
  },
  Leo: {
    starCoords: [
      { ra: 10.14, dec: 11.97 },
      { ra: 11.24, dec: 20.52 },
      { ra: 11.82, dec: 14.57 },
      { ra: 10.33, dec: 19.84 },
      { ra: 10.12, dec: 16.76 },
      { ra: 9.764, dec: 23.77 },
      { ra: 11.35, dec: 10.53 },
    ],
    lines: [[0, 4], [4, 3], [3, 5], [3, 1], [1, 2], [2, 6]],
  },
  Virgo: {
    starCoords: [
      { ra: 13.40, dec: -11.16 },
      { ra: 13.04, dec: 10.96 },
      { ra: 12.69, dec: -1.45 },
      { ra: 12.33, dec: -0.67 },
      { ra: 11.85, dec: 1.77 },
      { ra: 13.58, dec: -0.60 },
    ],
    lines: [[0, 2], [2, 3], [3, 4], [2, 5], [1, 3]],
  },
  Libra: {
    starCoords: [
      { ra: 14.85, dec: -16.04 },
      { ra: 15.28, dec: -9.38 },
      { ra: 15.59, dec: -14.79 },
      { ra: 15.07, dec: -25.28 },
    ],
    lines: [[0, 1], [1, 2], [0, 3], [2, 3]],
  },
  Scorpio: {
    starCoords: [
      { ra: 16.49, dec: -26.43 },
      { ra: 16.01, dec: -22.62 },
      { ra: 16.35, dec: -25.59 },
      { ra: 16.84, dec: -34.29 },
      { ra: 17.17, dec: -43.24 },
      { ra: 17.56, dec: -37.10 },
      { ra: 17.79, dec: -40.13 },
      { ra: 17.62, dec: -43.00 },
    ],
    lines: [[1, 2], [2, 0], [0, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
  },
  Sagittarius: {
    starCoords: [
      { ra: 18.10, dec: -30.42 },
      { ra: 18.35, dec: -29.83 },
      { ra: 18.40, dec: -34.38 },
      { ra: 18.92, dec: -26.30 },
      { ra: 19.04, dec: -29.88 },
      { ra: 19.16, dec: -21.02 },
      { ra: 18.23, dec: -36.76 },
    ],
    lines: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [2, 6]],
  },
  Capricorn: {
    starCoords: [
      { ra: 20.29, dec: -12.51 },
      { ra: 20.19, dec: -12.51 },
      { ra: 20.77, dec: -25.27 },
      { ra: 21.10, dec: -17.23 },
      { ra: 21.37, dec: -16.84 },
      { ra: 21.62, dec: -16.66 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
  Aquarius: {
    starCoords: [
      { ra: 21.53, dec: -5.57 },
      { ra: 22.10, dec: -0.32 },
      { ra: 22.36, dec: -1.39 },
      { ra: 22.48, dec: -0.02 },
      { ra: 22.88, dec: -7.58 },
      { ra: 22.59, dec: -13.87 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5]],
  },
  Pisces: {
    starCoords: [
      { ra: 23.66, dec: -6.05 },
      { ra: 23.29, dec: 3.28 },
      { ra: 23.99, dec: 6.86 },
      { ra: 0.220, dec: 15.18 },
      { ra: 1.049, dec: 7.89 },
      { ra: 1.525, dec: 15.35 },
      { ra: 2.034, dec: 2.76 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
  },
};

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: "\u2648", Taurus: "\u2649", Gemini: "\u264A", Cancer: "\u264B",
  Leo: "\u264C", Virgo: "\u264D", Libra: "\u264E", Scorpio: "\u264F",
  Sagittarius: "\u2650", Capricorn: "\u2651", Aquarius: "\u2652", Pisces: "\u2653",
};

const SPHERE_RADIUS = 80;

function resolveConstellationPositions(constellation: ConstellationDef): THREE.Vector3[] {
  return constellation.starCoords.map(coord => {
    const cat = findCatalogStar(coord.ra, coord.dec);
    const ra = cat ? cat.ra : coord.ra;
    const dec = cat ? cat.dec : coord.dec;
    const [x, y, z] = raDecToXYZ(ra, dec, SPHERE_RADIUS);
    return new THREE.Vector3(x, y, z);
  });
}

function Starfield({ isMobile }: { isMobile: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const { positions, colors, sizes, phases, baseOpacities } = useMemo(() => {
    const catalogSlice = isMobile
      ? STAR_CATALOG.filter(s => s.mag <= 3.5)
      : STAR_CATALOG;

    const totalCount = catalogSlice.length;
    const pos = new Float32Array(totalCount * 3);
    const col = new Float32Array(totalCount * 3);
    const siz = new Float32Array(totalCount);
    const pha = new Float32Array(totalCount);
    const opa = new Float32Array(totalCount);

    catalogSlice.forEach((s, i) => {
      const [x, y, z] = raDecToXYZ(s.ra, s.dec, SPHERE_RADIUS);
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      const c = spectralToColor(s.sp);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      siz[i] = magToSize(s.mag);
      pha[i] = Math.random() * Math.PI * 2;
      opa[i] = 0.7 + Math.random() * 0.3;
    });

    return { positions: pos, colors: col, sizes: siz, phases: pha, baseOpacities: opa };
  }, [isMobile]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    timeRef.current += delta;
    const geo = pointsRef.current.geometry;
    const sizeAttr = geo.getAttribute("size");
    const arr = sizeAttr.array as Float32Array;
    const len = arr.length;
    const t = timeRef.current;

    for (let i = 0; i < len; i++) {
      const twinkle = 0.7 + 0.3 * Math.sin(t * (1.5 + (i % 7) * 0.3) + phases[i]);
      arr[i] = sizes[i] * twinkle * baseOpacities[i];
    }
    sizeAttr.needsUpdate = true;
  });

  const vertexShader = `
    attribute float size;
    attribute vec3 starColor;
    varying vec3 vColor;
    void main() {
      vColor = starColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (200.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.1, d);
      float core = smoothstep(0.3, 0.0, d);
      vec3 col = mix(vColor, vec3(1.0), core * 0.5);
      gl_FragColor = vec4(col, alpha);
    }
  `;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-starColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes.slice(), 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function ConstellationLines() {
  const linesGeo = useMemo(() => {
    const verts: number[] = [];
    const cols: number[] = [];

    Object.values(ZODIAC_CONSTELLATIONS).forEach(constellation => {
      const resolved = resolveConstellationPositions(constellation);
      constellation.lines.forEach(([a, b]) => {
        const pA = resolved[a];
        const pB = resolved[b];
        if (!pA || !pB) return;
        verts.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z);
        cols.push(0.2, 0.7, 0.85, 0.2, 0.7, 0.85);
      });
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    return geo;
  }, []);

  return (
    <lineSegments geometry={linesGeo}>
      <lineBasicMaterial vertexColors transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

function createLabelCanvas(symbol: string, name: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 80;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 80);
  ctx.fillStyle = "rgba(6, 182, 212, 0.85)";
  ctx.font = "bold 32px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${symbol} ${name}`, 128, 40);
  return c;
}

function ConstellationLabels() {
  const labelData = useMemo(() =>
    Object.entries(ZODIAC_CONSTELLATIONS).map(([name, constellation]) => {
      let avgDec = 0;
      let sinSum = 0, cosSum = 0;
      constellation.starCoords.forEach(s => {
        const raRad = (s.ra / 24) * Math.PI * 2;
        sinSum += Math.sin(raRad);
        cosSum += Math.cos(raRad);
        avgDec += s.dec;
      });
      const avgRaRad = Math.atan2(sinSum, cosSum);
      const avgRa = ((avgRaRad / (Math.PI * 2)) * 24 + 24) % 24;
      avgDec /= constellation.starCoords.length;
      const pos = raDecToXYZ(avgRa, avgDec + 4, SPHERE_RADIUS * 0.97);
      const canvas = createLabelCanvas(ZODIAC_SYMBOLS[name] || "", name);
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return { name, pos, texture };
    }), []);

  return (
    <group>
      {labelData.map(({ name, pos, texture }) => (
        <sprite key={name} position={pos} scale={[8, 2.5, 1]}>
          <spriteMaterial
            map={texture}
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

function NebulaClouds() {
  const cloudsRef = useRef<THREE.Group>(null);

  const clouds = useMemo(() => {
    const list: { pos: THREE.Vector3; color: THREE.Color; scale: number; opacity: number }[] = [];
    const nebColors = [
      new THREE.Color(0.1, 0.3, 0.6),
      new THREE.Color(0.3, 0.1, 0.5),
      new THREE.Color(0.05, 0.4, 0.45),
      new THREE.Color(0.4, 0.15, 0.35),
      new THREE.Color(0.08, 0.25, 0.5),
      new THREE.Color(0.2, 0.05, 0.4),
    ];
    for (let i = 0; i < 8; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = SPHERE_RADIUS * 0.85;
      list.push({
        pos: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ),
        color: nebColors[i % nebColors.length],
        scale: 12 + Math.random() * 18,
        opacity: 0.04 + Math.random() * 0.04,
      });
    }
    return list;
  }, []);

  useFrame(({ clock }) => {
    if (!cloudsRef.current) return;
    const t = clock.getElapsedTime();
    cloudsRef.current.children.forEach((child, i) => {
      const s = clouds[i].scale * (1 + 0.08 * Math.sin(t * 0.15 + i * 1.2));
      child.scale.setScalar(s);
    });
  });

  return (
    <group ref={cloudsRef}>
      {clouds.map((cloud, i) => (
        <mesh key={i} position={cloud.pos}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color={cloud.color}
            transparent
            opacity={cloud.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function GalacticPlane() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.025 + 0.01 * Math.sin(clock.getElapsedTime() * 0.1);
    }
  });

  return (
    <mesh ref={ref} rotation={[0, 0, Math.PI * 0.1]}>
      <torusGeometry args={[SPHERE_RADIUS * 0.95, 6, 8, 64]} />
      <meshBasicMaterial
        color={new THREE.Color(0.15, 0.2, 0.4)}
        transparent
        opacity={0.03}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SceneContent({ isMobile }: { isMobile: boolean }) {
  return (
    <group>
      <Starfield isMobile={isMobile} />
      <ConstellationLines />
      <ConstellationLabels />
      <NebulaClouds />
      <GalacticPlane />
    </group>
  );
}

function FrameLimiter({ fps }: { fps: number }) {
  const { invalidate } = useThree();
  useEffect(() => {
    let animId: number;
    let last = 0;
    const interval = 1000 / fps;
    const tick = (now: number) => {
      animId = requestAnimationFrame(tick);
      if (now - last >= interval) {
        last = now;
        invalidate();
      }
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [fps, invalidate]);
  return null;
}

const EVENT_OVERLAY_ID = "universe-event-overlay";

function getOrCreateEventOverlay(): HTMLDivElement {
  let el = document.getElementById(EVENT_OVERLAY_ID) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = EVENT_OVERLAY_ID;
    Object.assign(el.style, {
      position: "fixed",
      inset: "0",
      zIndex: "1",
      pointerEvents: "auto",
    });
    document.body.appendChild(el);
  }
  return el;
}

function UniverseBackground() {
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hasWebGL, setHasWebGL] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null!);
  const [location] = useLocation();

  const isUniversePage = location === "/universe" || location === "/universe-model";

  useEffect(() => {
    overlayRef.current = getOrCreateEventOverlay();
    return () => {
      const el = document.getElementById(EVENT_OVERLAY_ID);
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    setHasWebGL(detectWebGL());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    const onMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    window.addEventListener("resize", onResize);
    mq.addEventListener("change", onMotion);
    return () => {
      window.removeEventListener("resize", onResize);
      mq.removeEventListener("change", onMotion);
    };
  }, []);

  if (isUniversePage || reducedMotion || !hasWebGL) {
    return StaticFallback;
  }

  return (
    <WebGLErrorBoundary fallback={StaticFallback}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <Canvas
          camera={{ position: [0, 0, 0.1], fov: 75, near: 0.1, far: 200 }}
          gl={{
            antialias: !isMobile,
            powerPreference: "low-power",
            alpha: false,
          }}
          frameloop="demand"
          style={{ background: "#030108" }}
          dpr={isMobile ? [1, 1.5] : [1, 2]}
          eventSource={overlayRef}
          eventPrefix="client"
        >
          <FrameLimiter fps={isMobile ? 20 : 30} />
          <color attach="background" args={["#030108"]} />
          <ambientLight intensity={0.05} />
          <SceneContent isMobile={isMobile} />
          <OrbitControls
            enableZoom
            enablePan={false}
            enableRotate
            autoRotate
            autoRotateSpeed={0.15}
            minDistance={0.1}
            maxDistance={60}
            zoomSpeed={0.5}
            rotateSpeed={0.3}
            enableDamping
            dampingFactor={0.05}
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
          />
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}

export default memo(UniverseBackground);
