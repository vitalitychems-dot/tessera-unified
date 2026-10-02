import { useRef, useState, useEffect, Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Maximize2, X, RotateCcw, Pin, Check as CheckIcon } from "lucide-react";

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

export interface Object3DSpec {
  type: string;
  label?: string;
  color?: string;
  secondaryColor?: string;
  size?: number;
  detail?: string;
  src?: string;
}

export function parse3DObjectBlocks(text: string): { text: string; objects: Object3DSpec[] } {
  const objects: Object3DSpec[] = [];
  const regex = /\[3DOBJ:([^\]]+)\]/g;
  const cleaned = text.replace(regex, (_match, attrs) => {
    const spec: Record<string, string> = {};
    attrs.replace(/(\w+)="([^"]*)"/g, (_: string, k: string, v: string) => {
      spec[k] = v;
      return "";
    });
    if (spec.type || spec.label) {
      objects.push({
        type: spec.type || "abstract",
        label: spec.label,
        color: spec.color,
        secondaryColor: spec.secondary || spec.secondaryColor,
        size: spec.size ? parseFloat(spec.size) : undefined,
        detail: spec.detail,
        src: spec.src,
      });
    }
    return "";
  });
  return { text: cleaned.trim(), objects };
}

function inferObjectSpec(messageText: string): Object3DSpec | null {
  const lower = messageText.toLowerCase();
  const inventionPatterns: Array<{ re: RegExp; type: string; label: string; color: string }> = [
    { re: /\b(car|vehicle|automobile|truck|bus)\b/, type: "car", label: "Vehicle", color: "#3b82f6" },
    { re: /\b(rocket|spacecraft|missile|satellite)\b/, type: "rocket", label: "Rocket", color: "#6366f1" },
    { re: /\b(house|building|home|structure|architecture)\b/, type: "building", label: "Building", color: "#10b981" },
    { re: /\b(molecule|atom|chemical|compound|dna)\b/, type: "molecule", label: "Molecule", color: "#f59e0b" },
    { re: /\b(crystal|gem|diamond|prism|mineral)\b/, type: "crystal", label: "Crystal", color: "#06b6d4" },
    { re: /\b(gear|engine|mechanism|machine|motor)\b/, type: "machine", label: "Machine", color: "#8b5cf6" },
    { re: /\b(tower|pyramid|monument|obelisk)\b/, type: "tower", label: "Tower", color: "#f97316" },
    { re: /\b(robot|android|automaton|cyborg)\b/, type: "robot", label: "Robot", color: "#a78bfa" },
    { re: /\b(sphere|ball|globe|orb|planet)\b/, type: "sphere", label: "Orb", color: "#ec4899" },
    { re: /\b(cube|box|block)\b/, type: "cube", label: "Cube", color: "#14b8a6" },
    { re: /\b(torus|donut|ring)\b/, type: "torus", label: "Torus", color: "#d946ef" },
    { re: /\b(telescope|microscope|instrument|device)\b/, type: "device", label: "Device", color: "#64748b" },
  ];
  for (const p of inventionPatterns) {
    if (p.re.test(lower)) return { type: p.type, label: p.label, color: p.color };
  }
  return null;
}

function CarModel({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.1;
    }
  });
  const bodyColor = color || "#3b82f6";
  const wheelColor = "#1e293b";
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.2, 0.7, 1.5]} />
        <meshStandardMaterial color={bodyColor} metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 0.1]}>
        <boxGeometry args={[1.8, 0.6, 1.3]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0.7, 0.55, 0.5]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.1, 0.5, 0.05]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.7} metalness={0.1} roughness={0.1} />
      </mesh>
      {[[-1.1, -0.45, 0.85], [1.1, -0.45, 0.85], [-1.1, -0.45, -0.85], [1.1, -0.45, -0.85]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          <meshStandardMaterial color={wheelColor} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function RocketModel({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.5;
    }
  });
  const bodyColor = color || "#6366f1";
  return (
    <group ref={groupRef} rotation={[0, 0, 0]}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 3, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <coneGeometry args={[0.5, 1.2, 16]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.3} roughness={0.4} />
      </mesh>
      {[0, 1, 2].map(i => {
        const angle = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.65, -1, Math.sin(angle) * 0.65]} rotation={[0, -angle, 0.4]}>
            <boxGeometry args={[0.15, 1.0, 0.5]} />
            <meshStandardMaterial color="#ef4444" metalness={0.3} roughness={0.4} />
          </mesh>
        );
      })}
      <mesh position={[0, -1.8, 0]}>
        <coneGeometry args={[0.4, 0.6, 8]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function BuildingModel({ color }: { color: string }) {
  const bodyColor = color || "#10b981";
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.5, 3.5, 2.5]} />
        <meshStandardMaterial color={bodyColor} metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <coneGeometry args={[1.6, 1.2, 4]} />
        <meshStandardMaterial color="#92400e" roughness={0.8} />
      </mesh>
      {[[-0.6, 0.3, 1.26], [0.6, 0.3, 1.26], [0, -0.5, 1.26]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={i === 2 ? [0.5, 0.9, 0.05] : [0.55, 0.55, 0.05]} />
          <meshStandardMaterial color="#bfdbfe" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function MoleculeModel({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.8;
      groupRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.5) * 0.3;
    }
  });
  const atomColor = color || "#f59e0b";
  const atoms = [
    [0, 0, 0], [1.5, 0.8, 0], [-1.5, 0.8, 0], [0, -1.5, 0.8], [0, 1.2, 1.5],
  ] as [number, number, number][];
  const bonds = [[0, 1], [0, 2], [0, 3], [0, 4]];
  return (
    <group ref={groupRef}>
      {atoms.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[i === 0 ? 0.55 : 0.38, 16, 16]} />
          <meshStandardMaterial
            color={i === 0 ? atomColor : "#60a5fa"}
            emissive={i === 0 ? atomColor : "#60a5fa"}
            emissiveIntensity={0.2}
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
      ))}
      {bonds.map(([a, b], i) => {
        const start = new THREE.Vector3(...atoms[a]);
        const end = new THREE.Vector3(...atoms[b]);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const dir = end.clone().sub(start);
        const len = dir.length();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        return (
          <mesh key={i} position={[mid.x, mid.y, mid.z]} quaternion={quaternion}>
            <cylinderGeometry args={[0.08, 0.08, len, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

function CrystalModel({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.6;
    }
  });
  const crystalColor = color || "#06b6d4";
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.3, 0]}>
        <octahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial color={crystalColor} transparent opacity={0.8} metalness={0.1} roughness={0.05} wireframe={false} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <octahedronGeometry args={[1.52, 0]} />
        <meshBasicMaterial color={crystalColor} transparent opacity={0.3} wireframe />
      </mesh>
      <mesh position={[-1.2, -0.5, 0.5]} rotation={[0.3, 0.2, 0.1]}>
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial color={crystalColor} transparent opacity={0.6} metalness={0.1} roughness={0.05} />
      </mesh>
      <mesh position={[1.0, -0.3, -0.8]} rotation={[0.5, 0.3, -0.2]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#a78bfa" transparent opacity={0.5} metalness={0.1} roughness={0.05} />
      </mesh>
    </group>
  );
}

function MachineModel({ color }: { color: string }) {
  const gearRef = useRef<THREE.Mesh>(null);
  const gear2Ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (gearRef.current) gearRef.current.rotation.z = t * 0.8;
    if (gear2Ref.current) gear2Ref.current.rotation.z = -t * 1.2;
  });
  const gearColor = color || "#8b5cf6";
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.5, 2, 1]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh ref={gearRef} position={[0, 0, 0.6]}>
        <torusGeometry args={[0.8, 0.25, 6, 8]} />
        <meshStandardMaterial color={gearColor} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh ref={gear2Ref} position={[1.4, 0.4, 0.6]}>
        <torusGeometry args={[0.5, 0.18, 6, 8]} />
        <meshStandardMaterial color="#f97316" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.6]}>
        <cylinderGeometry args={[0.15, 0.15, 0.6, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

function RobotModel({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.3;
    }
  });
  const robotColor = color || "#a78bfa";
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.2, 1.5, 0.8]} />
        <meshStandardMaterial color={robotColor} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[0.9, 0.8, 0.7]} />
        <meshStandardMaterial color={robotColor} metalness={0.5} roughness={0.3} />
      </mesh>
      {[[-0.2, 1.15, 0.38], [0.2, 1.15, 0.38]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {[[-0.75, 0.2, 0], [0.75, 0.2, 0]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.3, 1.2, 0.3]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {[[-0.3, -1.0, 0], [0.3, -1.0, 0]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.35, 1.0, 0.4]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function TowerModel({ color }: { color: string }) {
  const towerColor = color || "#f97316";
  return (
    <group>
      <mesh position={[0, -0.8, 0]}>
        <boxGeometry args={[2.0, 1.0, 2.0]} />
        <meshStandardMaterial color={towerColor} metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.4, 1.6, 1.4]} />
        <meshStandardMaterial color={towerColor} metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[1.0, 1.2, 1.0]} />
        <meshStandardMaterial color={towerColor} metalness={0.2} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.7, 0]}>
        <coneGeometry args={[0.7, 1.4, 4]} />
        <meshStandardMaterial color="#b45309" roughness={0.7} />
      </mesh>
    </group>
  );
}

function DeviceModel({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.4;
    }
  });
  const deviceColor = color || "#64748b";
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 3.0, 0.3]} />
        <meshStandardMaterial color={deviceColor} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.2, 0.16]}>
        <boxGeometry args={[1.9, 2.2, 0.05]} />
        <meshStandardMaterial color="#0f172a" emissive="#3b82f6" emissiveIntensity={0.2} />
      </mesh>
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={i} position={[(i - 1) * 0.5, -1.0, 0.16]}>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
    </group>
  );
}

function AbstractModel({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.y = t * 0.6;
      groupRef.current.rotation.x = Math.sin(t * 0.4) * 0.3;
    }
  });
  const c = color || "#a78bfa";
  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial color={c} wireframe={false} metalness={0.3} roughness={0.4} transparent opacity={0.9} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.22, 0]} />
        <meshBasicMaterial color={c} wireframe transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function SphereModel({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.5;
    }
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.3, 32, 32]} />
      <meshStandardMaterial color={color || "#ec4899"} metalness={0.3} roughness={0.3} />
    </mesh>
  );
}

function CubeModel({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.rotation.y = t * 0.5;
      meshRef.current.rotation.x = t * 0.3;
    }
  });
  return (
    <group>
      <mesh ref={meshRef}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color={color || "#14b8a6"} metalness={0.4} roughness={0.3} />
      </mesh>
    </group>
  );
}

function TorusModel({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.6;
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.3;
    }
  });
  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[1.0, 0.4, 16, 32]} />
      <meshStandardMaterial color={color || "#d946ef"} metalness={0.3} roughness={0.3} />
    </mesh>
  );
}

function BatteryCellModel({ color, secondary }: { color: string; secondary: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.4; });
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[0.55, 0.55, 2.2, 24]} />
        <meshStandardMaterial color={color || "#f59e0b"} metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.1, 16]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, -1.11, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 0.08, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.2, 0.56]}>
        <boxGeometry args={[0.9, 0.35, 0.02]} />
        <meshStandardMaterial color={secondary || "#10b981"} emissive={secondary || "#10b981"} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function BatteryPackModel({ color, secondary }: { color: string; secondary: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.3; });
  const cellColor = color || "#f59e0b";
  const accent = secondary || "#10b981";
  const cols = 6, rows = 3;
  const spacing = 0.4;
  const offX = -((cols - 1) * spacing) / 2;
  const offZ = -((rows - 1) * spacing) / 2;
  return (
    <group ref={groupRef}>
      <mesh position={[0, -1.0, 0]}>
        <boxGeometry args={[cols * spacing + 0.4, 0.08, rows * spacing + 0.4]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
      </mesh>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <group key={`${r}-${c}`} position={[offX + c * spacing, 0, offZ + r * spacing]}>
            <mesh>
              <cylinderGeometry args={[0.17, 0.17, 1.6, 16]} />
              <meshStandardMaterial color={cellColor} metalness={0.7} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.82, 0]}>
              <cylinderGeometry args={[0.09, 0.09, 0.06, 12]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        ))
      )}
      <mesh position={[0, 0.88, 0]}>
        <boxGeometry args={[cols * spacing + 0.1, 0.04, rows * spacing + 0.1]} />
        <meshStandardMaterial color={accent} metalness={0.8} roughness={0.2} emissive={accent} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

function ToroidModel({ color, secondary }: { color: string; secondary: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.4;
      groupRef.current.rotation.x = 0.3 + Math.sin(clock.getElapsedTime() * 0.3) * 0.15;
    }
  });
  const coreColor = color || "#06b6d4";
  const wireColor = secondary || "#a78bfa";
  const windings = 24;
  return (
    <group ref={groupRef}>
      <mesh>
        <torusGeometry args={[1.0, 0.28, 16, 48]} />
        <meshStandardMaterial color={coreColor} metalness={0.4} roughness={0.5} />
      </mesh>
      {Array.from({ length: windings }).map((_, i) => {
        const a = (i / windings) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0]} rotation={[0, -a, Math.PI / 2]}>
            <torusGeometry args={[0.3, 0.035, 8, 20]} />
            <meshStandardMaterial color={wireColor} metalness={0.85} roughness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

function PCBModel({ color, secondary }: { color: string; secondary: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.35;
      groupRef.current.rotation.x = 0.4;
    }
  });
  const boardColor = color || "#10b981";
  const chipColor = secondary || "#f59e0b";
  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[3, 0.12, 2]} />
        <meshStandardMaterial color={boardColor} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[-0.6, 0.18, 0.2]}>
        <boxGeometry args={[0.8, 0.2, 0.8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0.9, 0.15, -0.3]}>
        <boxGeometry args={[0.4, 0.14, 0.3]} />
        <meshStandardMaterial color={chipColor} metalness={0.5} roughness={0.3} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[-1.3 + i * 0.3, 0.16, 0.8]}>
          <cylinderGeometry args={[0.06, 0.06, 0.2, 8]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`pin-${i}`} position={[-1.35 + i * 0.38, -0.1, -0.9]}>
          <boxGeometry args={[0.05, 0.1, 0.05]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
      <mesh position={[1.2, 0.14, 0.6]}>
        <cylinderGeometry args={[0.18, 0.18, 0.24, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}

function EnclosureModel({ color, secondary }: { color: string; secondary: string }) {
  const body = color || "#64748b";
  const slot = secondary || "#10b981";
  return (
    <group>
      <mesh>
        <boxGeometry args={[2.4, 1.8, 1.6]} />
        <meshStandardMaterial color={body} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.81]}>
        <boxGeometry args={[2.42, 1.82, 0.02]} />
        <meshBasicMaterial color={body} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-0.9 + i * 0.36, 0.3, 0.82]}>
          <boxGeometry args={[0.12, 0.05, 0.02]} />
          <meshStandardMaterial color={slot} emissive={slot} emissiveIntensity={0.4} />
        </mesh>
      ))}
      {[[-1.1, -0.8, 0.75], [1.1, -0.8, 0.75], [-1.1, -0.8, -0.75], [1.1, -0.8, -0.75]].map(([x, y, z], i) => (
        <mesh key={`screw-${i}`} position={[x, y, z]}>
          <cylinderGeometry args={[0.05, 0.05, 0.08, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function AntennaModel({ color, secondary }: { color: string; secondary: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.2;
  });
  const mastColor = color || "#8b5cf6";
  const tipColor = secondary || "#06b6d4";
  return (
    <group ref={groupRef}>
      <mesh position={[0, -1.3, 0]}>
        <boxGeometry args={[1.4, 0.1, 1.4]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 2.6, 12]} />
        <meshStandardMaterial color={mastColor} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.8, 8]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color={tipColor} emissive={tipColor} emissiveIntensity={0.8} />
      </mesh>
      {[0, 1, 2].map(i => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.5, 0.6, Math.sin(a) * 0.5]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.02, 0.6, 0.02]} />
            <meshStandardMaterial color={mastColor} metalness={0.7} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

function SolarPanelModel({ color, secondary }: { color: string; secondary: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.3;
  });
  const cellColor = color || "#3b82f6";
  const frame = secondary || "#f59e0b";
  return (
    <group ref={groupRef} rotation={[-0.4, 0, 0]}>
      <mesh>
        <boxGeometry args={[3, 0.06, 2]} />
        <meshStandardMaterial color={frame} metalness={0.6} roughness={0.3} />
      </mesh>
      {Array.from({ length: 6 }).map((_, r) =>
        Array.from({ length: 4 }).map((_, c) => (
          <mesh key={`${r}-${c}`} position={[-1.25 + r * 0.5, 0.04, -0.75 + c * 0.5]}>
            <boxGeometry args={[0.4, 0.02, 0.4]} />
            <meshStandardMaterial color={cellColor} metalness={0.6} roughness={0.3} emissive={cellColor} emissiveIntensity={0.15} />
          </mesh>
        ))
      )}
      <mesh position={[0, -0.5, 0]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function resolveCustomModelUrl(src: string): string {
  // objectPaths from /api/inventions/:id/model are returned as "/objects/<id>".
  // Map them to the gated storage serving route.
  if (src.startsWith("/objects/")) {
    const base = import.meta.env.BASE_URL || "/";
    return `${base.replace(/\/$/, "")}/api/storage${src}`.replace(/\/{2,}/g, "/");
  }
  return src;
}

export function CustomGLTFModel({ src, color }: { src: string; color: string }) {
  const url = resolveCustomModelUrl(src);
  const gltf = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.3;
  });
  // Auto-fit: center and scale the loaded scene so it lives roughly within ±1.5.
  const scene = gltf.scene;
  const fitted = (() => {
    const box = new THREE.Box3().setFromObject(scene);
    const sizeVec = new THREE.Vector3();
    box.getSize(sizeVec);
    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z) || 1;
    const target = 2.4;
    const fitScale = target / maxDim;
    const center = new THREE.Vector3();
    box.getCenter(center);
    return { fitScale, offset: center.multiplyScalar(-fitScale) };
  })();
  return (
    <group ref={groupRef}>
      <group position={[fitted.offset.x, fitted.offset.y, fitted.offset.z]} scale={[fitted.fitScale, fitted.fitScale, fitted.fitScale]}>
        <primitive object={scene} />
      </group>
      {/* Subtle accent halo so the user knows the model is the inventor's upload. */}
      <mesh>
        <sphereGeometry args={[2.0, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.04} />
      </mesh>
    </group>
  );
}

function getObjectModel(type: string, color: string, secondary: string, spec?: Object3DSpec) {
  if ((type === "custom" || spec?.src) && spec?.src) {
    return <CustomGLTFModel src={spec.src} color={color} />;
  }
  switch (type.toLowerCase()) {
    case "car": case "vehicle": case "automobile": case "truck": return <CarModel color={color} />;
    case "rocket": case "spacecraft": case "satellite": return <RocketModel color={color} />;
    case "building": case "house": case "home": return <BuildingModel color={color} />;
    case "molecule": case "atom": case "chemical": return <MoleculeModel color={color} />;
    case "crystal": case "gem": case "diamond": return <CrystalModel color={color} />;
    case "machine": case "gear": case "engine": return <MachineModel color={color} />;
    case "robot": case "android": return <RobotModel color={color} />;
    case "tower": case "pyramid": return <TowerModel color={color} />;
    case "device": case "instrument": return <DeviceModel color={color} />;
    case "sphere": case "ball": case "orb": case "planet": return <SphereModel color={color} />;
    case "cube": case "box": return <CubeModel color={color} />;
    case "torus": case "donut": case "ring": return <TorusModel color={color} />;
    case "battery-cell": case "cell": case "18650": return <BatteryCellModel color={color} secondary={secondary} />;
    case "battery-pack": case "battery": case "pack": return <BatteryPackModel color={color} secondary={secondary} />;
    case "toroid": case "bifilar": case "coil": return <ToroidModel color={color} secondary={secondary} />;
    case "pcb": case "circuit": case "board": return <PCBModel color={color} secondary={secondary} />;
    case "enclosure": case "case": case "cage": case "faraday": return <EnclosureModel color={color} secondary={secondary} />;
    case "antenna": case "mast": case "whip": case "repeater": return <AntennaModel color={color} secondary={secondary} />;
    case "solar-panel": case "solar": case "photovoltaic": case "pv": return <SolarPanelModel color={color} secondary={secondary} />;
    default: return <AbstractModel color={color} />;
  }
}

function SceneContent({ spec }: { spec: Object3DSpec }) {
  const color = spec.color || "#a78bfa";
  const accent = spec.secondaryColor || color;
  const rawSize = spec.size ?? 1;
  const scale = Number.isFinite(rawSize) ? Math.max(0.2, Math.min(rawSize, 5)) : 1;
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-5, -3, -5]} intensity={0.4} color={accent} />
      <group scale={[scale, scale, scale]}>
        {getObjectModel(spec.type, color, accent, spec)}
      </group>
      {spec.label && (
        <Text
          position={[0, -2.2, 0]}
          fontSize={0.35}
          color={color}
          anchorX="center"
          anchorY="top"
          font="https://fonts.gstatic.com/s/spacemono/v13/i7dPIFZifjKcF5UAWdDRYEF8RQ.woff2"
        >
          {spec.label}
        </Text>
      )}
      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate
        minDistance={3}
        maxDistance={12}
        dampingFactor={0.08}
        enableDamping
        autoRotate={false}
      />
    </>
  );
}

interface InlineObject3DProps {
  spec: Object3DSpec;
}

function FullscreenView({ spec, onClose }: { spec: Object3DSpec; onClose: () => void }) {
  const color = spec.color || "#a78bfa";
  const isMobile = useIsMobile();
  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className={`flex items-center justify-between border-b border-white/10 ${isMobile ? "px-3 py-2" : "px-4 py-3"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: color }} />
          <span className={`font-mono font-bold truncate ${isMobile ? "text-xs" : "text-sm"}`} style={{ color }}>{spec.label || spec.type}</span>
          {spec.detail && !isMobile && <span className="text-xs text-muted-foreground font-mono ml-2">{spec.detail}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isMobile && <span className="text-[10px] font-mono text-muted-foreground">Drag to rotate · Scroll to zoom</span>}
          <button
            onClick={onClose}
            className={`rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors ${isMobile ? "p-2.5" : "p-1.5"}`}
          >
            <X size={isMobile ? 20 : 16} />
          </button>
        </div>
      </div>
      {isMobile && (
        <div className="px-3 py-1 bg-white/[0.02] border-b border-white/5">
          <span className="text-[10px] font-mono text-muted-foreground/60">Pinch to zoom · Drag to rotate</span>
        </div>
      )}
      <div className="flex-1">
        <Object3DErrorBoundary fallback={<Object2DFallback spec={spec} />}>
          <Canvas
            camera={{ position: [0, 1.5, isMobile ? 7 : 6], fov: isMobile ? 55 : 50 }}
            gl={{ antialias: !isMobile, alpha: false, powerPreference: isMobile ? "default" : "high-performance" }}
            dpr={isMobile ? [1, 1.5] : [1, 2]}
            fallback={<Object2DFallback spec={spec} />}
          >
            <color attach="background" args={["#030108"]} />
            <fog attach="fog" args={["#030108", 20, 50]} />
            <SceneContent spec={spec} />
          </Canvas>
        </Object3DErrorBoundary>
      </div>
    </div>
  );
}

const TYPE_ICONS: Record<string, string> = {
  car: "🚗", rocket: "🚀", building: "🏛️", molecule: "🧬", crystal: "💎",
  machine: "⚙️", tower: "🗼", robot: "🤖", sphere: "🔮", cube: "📦",
  torus: "🍩", device: "🔬", abstract: "✦",
  "battery-cell": "🔋", "battery-pack": "🔋", toroid: "🌀", pcb: "🟩",
  enclosure: "📦", antenna: "📡", "solar-panel": "☀️",
  custom: "🧊",
};

class Object3DErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.warn("[3D] render failed, falling back to 2D", err.message, info.componentStack?.split("\n")[1]);
  }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

function Object2DFallback({ spec }: { spec: Object3DSpec }) {
  const color = spec.color || "#a78bfa";
  const icon = TYPE_ICONS[spec.type] || "✦";
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2" style={{ background: "linear-gradient(180deg, rgba(10,5,25,0.9) 0%, rgba(3,1,8,0.95) 100%)" }}>
      <div className="text-4xl animate-pulse">{icon}</div>
      <div className="text-xs font-mono font-bold" style={{ color }}>{spec.label || spec.type}</div>
      {spec.detail && <div className="text-[9px] text-muted-foreground text-center px-4 max-w-[200px]">{spec.detail}</div>}
      <div className="flex items-center gap-3 mt-1">
        <div className="w-8 h-0.5 rounded-full" style={{ background: color, opacity: 0.3 }} />
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
        <div className="w-8 h-0.5 rounded-full" style={{ background: color, opacity: 0.3 }} />
      </div>
    </div>
  );
}

function detectWebGLAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_lose_context");
      ext?.loseContext();
    }
    return !!gl;
  } catch {
    return false;
  }
}

export function InlineObject3D({ spec }: InlineObject3DProps) {
  const [expanded, setExpanded] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [webglFailed, setWebglFailed] = useState(false);
  const [pinState, setPinState] = useState<"idle" | "pinning" | "pinned">("idle");
  const color = spec.color || "#a78bfa";
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!detectWebGLAvailable()) setWebglFailed(true);
  }, []);

  const handlePin = async () => {
    if (pinState !== "idle") return;
    setPinState("pinning");
    try {
      const res = await fetch("/api/pinned-diagrams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: spec.type,
          label: spec.label || "",
          color: spec.color,
          secondaryColor: spec.secondaryColor,
          size: spec.size,
          detail: spec.detail,
        }),
      });
      if (!res.ok) throw new Error("Failed to pin");
      setPinState("pinned");
      setTimeout(() => setPinState("idle"), 2500);
    } catch {
      setPinState("idle");
    }
  };

  return (
    <>
      {expanded && !webglFailed && <FullscreenView spec={spec} onClose={() => setExpanded(false)} />}
      <div className={`rounded-xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm ${isMobile ? "my-2" : "my-3"}`}>
        <div className={`flex items-center justify-between border-b border-white/5 ${isMobile ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: color }} />
            <span className={`font-mono font-bold truncate ${isMobile ? "text-[10px]" : "text-[11px]"}`} style={{ color }}>{spec.label || spec.type}</span>
            {spec.detail && !isMobile && <span className="text-[10px] text-muted-foreground">{spec.detail}</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handlePin}
              disabled={pinState !== "idle"}
              className={`rounded transition-colors ${isMobile ? "p-1.5" : "p-1"} ${
                pinState === "pinned" ? "text-emerald-400" : "text-muted-foreground/50 hover:text-amber-300"
              }`}
              title={pinState === "pinned" ? "Pinned to gallery" : "Pin to gallery"}
              data-testid="button-pin-3d"
            >
              {pinState === "pinned" ? <CheckIcon size={isMobile ? 14 : 11} /> : <Pin size={isMobile ? 14 : 11} />}
            </button>
            {!webglFailed && (
              <>
                <button
                  onClick={() => setResetKey(k => k + 1)}
                  className={`rounded text-muted-foreground/50 hover:text-white transition-colors ${isMobile ? "p-1.5" : "p-1"}`}
                  title="Reset view"
                >
                  <RotateCcw size={isMobile ? 14 : 11} />
                </button>
                <button
                  onClick={() => setExpanded(true)}
                  className={`rounded text-muted-foreground/50 hover:text-white transition-colors ${isMobile ? "p-1.5" : "p-1"}`}
                  title="Expand to fullscreen"
                >
                  <Maximize2 size={isMobile ? 14 : 11} />
                </button>
              </>
            )}
          </div>
        </div>
        <div style={{ height: isMobile ? 160 : 220 }}>
          {webglFailed ? (
            <Object2DFallback spec={spec} />
          ) : (
            <Object3DErrorBoundary fallback={<Object2DFallback spec={spec} />}>
              <Canvas
                key={resetKey}
                camera={{ position: [0, 1.5, isMobile ? 6 : 5], fov: isMobile ? 55 : 50 }}
                gl={{ antialias: !isMobile, alpha: true, powerPreference: "default" }}
                dpr={isMobile ? [1, 1] : [1, 1.5]}
                onCreated={() => {}}
                fallback={<Object2DFallback spec={spec} />}
                onError={() => setWebglFailed(true)}
              >
                <Suspense fallback={null}>
                  <SceneContent spec={spec} />
                </Suspense>
              </Canvas>
            </Object3DErrorBoundary>
          )}
        </div>
        <div className={`border-t border-white/5 flex items-center ${isMobile ? "px-2.5 py-1" : "px-3 py-1.5"}`}>
          <span className={`font-mono text-muted-foreground/50 ${isMobile ? "text-[8px]" : "text-[9px]"}`}>
            {webglFailed
              ? `${spec.label || spec.type} · 2D Preview`
              : isMobile ? "3D · Pinch & drag · Tap ⤢ fullscreen" : "3D · Drag to rotate · Scroll to zoom · Click ⤢ for fullscreen"
            }
          </span>
        </div>
      </div>
    </>
  );
}

export { inferObjectSpec };
