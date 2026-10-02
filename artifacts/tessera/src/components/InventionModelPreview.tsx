import { Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CustomGLTFModel } from "./chat/ChatObject3D";
import { Box, Upload } from "lucide-react";

class PreviewBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.warn("[InventionModelPreview] failed", err.message, info.componentStack?.split("\n")[1]);
  }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

function EmptyPlaceholder({ message = "No 3D model uploaded yet" }: { message?: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground/70">
      <div className="relative">
        <Box size={32} className="opacity-40" />
        <Upload size={14} className="absolute -bottom-1 -right-1 opacity-60" />
      </div>
      <div className="text-[10px] font-mono text-center px-3">{message}</div>
    </div>
  );
}

interface Props {
  src?: string | null;
  label?: string;
  color?: string;
  height?: number;
}

export function InventionModelPreview({ src, label, color = "#a78bfa", height = 180 }: Props) {
  if (!src) {
    return (
      <div
        className="rounded-lg border border-white/5 bg-white/[0.02]"
        style={{ height }}
      >
        <EmptyPlaceholder />
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-violet-500/20 bg-gradient-to-b from-violet-950/20 to-black/40 overflow-hidden relative" style={{ height }}>
      {label && (
        <div className="absolute top-1.5 left-2 z-10 text-[9px] font-mono text-violet-300/80 truncate max-w-[90%]">
          {label}
        </div>
      )}
      <div className="absolute top-1.5 right-2 z-10 text-[8px] font-mono text-emerald-400/70">
        ◉ inventor model
      </div>
      <PreviewBoundary fallback={<EmptyPlaceholder message="Could not load this 3D model" />}>
        <Canvas
          camera={{ position: [0, 1.2, 4], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: "default" }}
          dpr={[1, 1.5]}
          fallback={<EmptyPlaceholder message="3D rendering not supported" />}
        >
          <ambientLight intensity={0.6} />
          <pointLight position={[4, 4, 4]} intensity={1.2} />
          <pointLight position={[-4, -2, -3]} intensity={0.4} color={color} />
          <Suspense fallback={
            <mesh>
              <sphereGeometry args={[0.6, 16, 16]} />
              <meshStandardMaterial color={color} wireframe transparent opacity={0.4} />
            </mesh>
          }>
            <CustomGLTFModel src={src} color={color} />
          </Suspense>
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            autoRotate={false}
            minDistance={2}
            maxDistance={10}
          />
        </Canvas>
      </PreviewBoundary>
      <div className="absolute bottom-1.5 right-2 z-10 text-[8px] font-mono text-muted-foreground/60">
        drag · scroll
      </div>
    </div>
  );
}
