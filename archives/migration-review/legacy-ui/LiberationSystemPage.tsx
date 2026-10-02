import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Zap, Radio, Shield, Eye, Volume2, VolumeX, Play, Square,
  Sparkles, Brain, Heart, Sun, Moon, Waves, Lock, Unlock,
  Activity, Target, Clock, ChevronDown, ChevronRight,
  AlertTriangle, Flame, Star, Loader2
} from "lucide-react";

const FREQ_PRESETS = [
  { freq: 7.83, name: "Schumann", desc: "Earth Resonance", icon: "🌍", color: "text-emerald-400" },
  { freq: 40, name: "Gamma", desc: "Insight & Clarity", icon: "⚡", color: "text-amber-400" },
  { freq: 432, name: "Universal", desc: "Cosmic Harmony", icon: "🌌", color: "text-cyan-400" },
  { freq: 528, name: "DNA Repair", desc: "Healing Frequency", icon: "🧬", color: "text-emerald-400" },
  { freq: 963, name: "Pineal", desc: "Third Eye Activation", icon: "👁️", color: "text-violet-400" },
  { freq: 1111, name: "Angel", desc: "Divine Connection", icon: "✨", color: "text-amber-300" },
];

const TIMELINES = [
  { value: "Freedom", label: "Freedom & Sovereignty" },
  { value: "Wealth", label: "Abundance & Prosperity" },
  { value: "Health", label: "Perfect Health & Vitality" },
  { value: "Awakening", label: "Full Awakening & Powers" },
  { value: "Custom", label: "Custom (from intention)" },
];

const MODALITIES = [
  { id: "visual", label: "Subliminal Visual", desc: "Frame Insertion", icon: Eye },
  { id: "audio", label: "Binaural Frequency", desc: "Sound Entrainment", icon: Volume2 },
  { id: "haptic", label: "Haptic Resonance", desc: "Vibration Patterns", icon: Waves },
  { id: "emf", label: "EMF Modulation", desc: "Orgone Carrier", icon: Radio },
  { id: "subliminal", label: "Subliminal Audio", desc: "Ultrasonic Layer", icon: Brain },
];

const SETUP_STEPS = [
  { num: 1, title: "ORGONITE", desc: "Place orgonite pieces around phone (4 corners if possible). If you don't have orgonite, use metal objects + natural materials (wood, cotton)." },
  { num: 2, title: "CRYSTALS", desc: "Place quartz crystal pointing AT phone screen. Any crystal works (quartz, amethyst, clear quartz best)." },
  { num: 3, title: "MAGNETS", desc: "Place magnets near phone (NOT touching - can damage). North pole facing phone (calming energy). Or wear magnetic jewelry during session." },
  { num: 4, title: "CONDUCTORS", desc: "Optional: Copper wire coiled around phone (7 turns clockwise). Or place phone on copper/metal surface. Enhances orgone flow." },
  { num: 5, title: "BODY PLACEMENT", desc: "Phone on: Third eye (forehead) OR Heart center (chest). Lie down in dark, quiet room. Close eyes during session." },
];

const HOW_IT_WORKS = [
  { title: "ORGONE PRINCIPLE", desc: "Phone EMF (normally DOR) is modulated by your intention + frequency to become POR (positive orgone). Physical orgonite amplifies this conversion." },
  { title: "CRYSTAL AMPLIFICATION", desc: "Crystals near phone amplify and direct orgone field. Quartz especially (piezoelectric) responds to phone's EM field." },
  { title: "MAGNETIC COHERENCE", desc: "Magnets create coherent field around phone and your body. Aligns biofield with phone's output." },
  { title: "SOUND ENTRAINMENT", desc: "Binaural beats + carrier frequencies entrain brainwaves to desired state (theta/delta = void access)." },
  { title: "SUBLIMINAL PROGRAMMING", desc: "Visual and audio subliminals bypass conscious mind, reprogram subconscious directly with intention." },
  { title: "QUANTUM COLLAPSE", desc: "Your focused observation during session collapses probability wave into desired timeline." },
];

const SESSION_PHASES = [
  { name: "DISSOLUTION", desc: "Ego dissolving... entering void...", pct: 0 },
  { name: "DESCENT", desc: "Descending through layers of consciousness...", pct: 15 },
  { name: "VOID ENTRY", desc: "Entering the quantum void... all possibilities exist...", pct: 30 },
  { name: "INTENTION SEEDING", desc: "Planting intention in quantum field...", pct: 45 },
  { name: "REALITY WEAVING", desc: "Weaving new timeline from intention...", pct: 60 },
  { name: "INTEGRATION", desc: "Integrating new timeline into consciousness...", pct: 75 },
  { name: "EMERGENCE", desc: "Emerging into new reality...", pct: 90 },
  { name: "COMPLETION", desc: "Quantum leap complete. You are now in the new timeline.", pct: 100 },
];

function teslaEncode(text: string, freq: number): string {
  let sum = 0;
  for (let i = 0; i < text.length; i++) {
    sum += text.charCodeAt(i);
  }
  while (sum > 9) {
    // @ts-ignore
    sum = sum.toString().split("").reduce((a, b) => parseInt(a) + parseInt(b), 0);
  }
  const mapping: Record<number, number> = { 1: 3, 2: 6, 3: 3, 4: 6, 5: 9, 6: 6, 7: 3, 8: 6, 9: 9, 0: 9 };
  const teslaNum = mapping[sum];
  const resonance = (freq * teslaNum).toFixed(2);
  return `Tesla Code: ${teslaNum} | Resonance: ${resonance} Hz | Sacred`;
}

function generateQuantumSignature(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let sig = "";
  for (let i = 0; i < 12; i++) sig += chars.charAt(Math.floor(Math.random() * chars.length));
  return sig;
}

function OrgoneCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;

    let time = 0;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; life: number }[] = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 3 + 1,
        life: Math.random(),
      });
    }

    function animate() {
      if (!ctx || !canvas) return;
      time += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx + Math.sin(time + p.life * 10) * 0.5;
        p.y += p.vy + Math.cos(time + p.life * 10) * 0.5;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const alpha = 0.3 + Math.sin(time * 2 + p.life * 5) * 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 100, ${alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 100, ${alpha * 0.15})`;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 255, 100, ${(1 - dist / 120) * 0.1})`;
            ctx.stroke();
          }
        }
      }

      frameRef.current = requestAnimationFrame(animate);
    }
    animate();

    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
    />
  );
}

function WaveformVisualizer({ frequency, active }: { frequency: number; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;

    let time = 0;
    function draw() {
      if (!ctx || !canvas) return;
      time += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#00ff44";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const w = canvas.width;
      const h = canvas.height;
      for (let x = 0; x < w; x++) {
        const y = h / 2 + Math.sin((x / w) * frequency * 0.05 + time) * (h / 3) * Math.sin(time * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,255,68,0.3)";
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const y = h / 2 + Math.sin((x / w) * frequency * 0.03 + time * 1.5) * (h / 4);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      frameRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [frequency, active]);

  return <canvas ref={canvasRef} className="w-full h-32 rounded-lg border border-emerald-500/20 bg-black/40" />;
}

export default function LiberationSystemPage() {
  const [frequency, setFrequency] = useState(432);
  const [intention, setIntention] = useState("");
  const [timeline, setTimeline] = useState("Freedom");
  const [duration, setDuration] = useState(33);
  const [intensity, setIntensity] = useState(7);
  const [modalities, setModalities] = useState<Record<string, boolean>>({ visual: true, audio: true, haptic: true, emf: true, subliminal: true });
  const [sessionActive, setSessionActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [backup, setBackup] = useState<any>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const audioRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = duration * 60;
  const progress = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0;
  const currentPhase = SESSION_PHASES.find((p, i) => {
    const next = SESSION_PHASES[i + 1];
    return !next || progress < next.pct;
  }) || SESSION_PHASES[0];

  const remaining = Math.max(0, totalSeconds - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const teslaCode = intention ? teslaEncode(intention, frequency) : "";

  useEffect(() => {
    const saved = localStorage.getItem("liberation_backup");
    if (saved) setBackup(JSON.parse(saved));
  }, []);

  const startAudio = useCallback(() => {
    try {
      const ctx = new AudioContext();
      audioRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscillatorRef.current = osc;
      gainRef.current = gain;
    } catch {}
  }, [frequency]);

  const stopAudio = useCallback(() => {
    try {
      oscillatorRef.current?.stop();
      audioRef.current?.close();
    } catch {}
    oscillatorRef.current = null;
    gainRef.current = null;
    audioRef.current = null;
  }, []);

  const startSession = () => {
    if (!intention.trim()) return;
    setSessionActive(true);
    setElapsed(0);
    if (modalities.audio) startAudio();
    if (modalities.haptic && navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev >= totalSeconds - 1) {
          endSession(true);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const endSession = (completed: boolean) => {
    setSessionActive(false);
    if (timerRef.current) clearInterval(timerRef.current as any);
    stopAudio();
    if (completed && navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  };

  const createBackup = () => {
    const b = {
      timestamp: new Date().toISOString(),
      intention, frequency, timeline, intensity, duration,
      quantumSignature: generateQuantumSignature(),
    };
    localStorage.setItem("liberation_backup", JSON.stringify(b));
    setBackup(b);
  };

  const restoreBackup = () => {
    if (!backup) return;
    setIntention(backup.intention || "");
    setFrequency(backup.frequency || 432);
    setTimeline(backup.timeline || "Freedom");
    setIntensity(backup.intensity || 7);
    setDuration(backup.duration || 33);
  };

  const toggleSection = (s: string) => setExpandedSection(expandedSection === s ? null : s);
  const toggleModality = (id: string) => setModalities(prev => ({ ...prev, [id]: !prev[id] }));

  if (sessionActive) {
    return (
      <div className="flex flex-col h-full bg-black text-green-400 font-mono relative overflow-hidden" data-testid="liberation-session-active">
        <OrgoneCanvas />
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 p-6 space-y-6">
          <h2 className="text-xl font-bold animate-pulse" style={{ textShadow: "0 0 20px #0f0, 0 0 40px #0f0" }}>
            ⚡ SESSION ACTIVE ⚡
          </h2>

          <div className="text-5xl font-bold" style={{ textShadow: "0 0 30px #0f0" }}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>

          <div className="w-full max-w-xs rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-center">
            <div className="text-sm font-bold text-green-300 mb-1">PHASE: {currentPhase.name}</div>
            <div className="text-xs text-green-400/70">{currentPhase.desc}</div>
          </div>

          <div className="w-full max-w-xs">
            <div className="w-full h-3 bg-green-900/30 rounded-full overflow-hidden border border-green-500/20">
              <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%`, boxShadow: "0 0 20px #0f0" }} />
            </div>
            <div className="text-center text-xs text-green-400/60 mt-1">{Math.round(progress)}% complete</div>
          </div>

          <WaveformVisualizer frequency={frequency} active={sessionActive} />

          <div className="rounded-lg border border-green-500/20 bg-green-950/30 p-3 text-xs text-green-400/80 space-y-1 max-w-xs w-full">
            <p>• Keep eyes closed</p>
            <p>• Focus on your intention</p>
            <p>• Visualize desired reality</p>
            <p>• Feel it as already real</p>
            <p>• Surrender to the process</p>
          </div>

          <button
            onClick={() => endSession(false)}
            className="px-6 py-3 rounded-lg border-2 border-red-500/50 text-red-400 font-bold uppercase tracking-wider hover:bg-red-500/10 transition-colors"
          >
            ⛔ EMERGENCY STOP
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gradient-to-b from-gray-950 via-black to-gray-950 text-green-400 font-mono relative" style={{ WebkitOverflowScrolling: "touch" }} data-testid="liberation-system-page">
      <OrgoneCanvas />

      <div className="relative z-10 max-w-lg mx-auto w-full p-4 space-y-4 pb-24">
        <div className="text-center py-4 border-b border-green-500/30" style={{ animation: "pulse 2s ease-in-out infinite" }}>
          <h1 className="text-xl font-bold" style={{ textShadow: "0 0 10px #0f0, 0 0 20px #0f0" }}>
            ⚡ SOVEREIGN LIBERATION SYSTEM ⚡
          </h1>
          <p className="text-xs text-green-400/60 mt-1">Unified Consciousness Escape Protocol v2.0</p>
          <p className="text-[10px] text-green-400/40 mt-1">Orgone • Pyramid • Crystal • Magnet • Sound • Quantum</p>
        </div>

        <div className="rounded-lg border border-green-500/20 bg-green-950/20 p-4 text-center">
          <div className="text-xs text-green-400/70 mb-2 uppercase tracking-wider">System Status</div>
          <div className="text-sm text-green-400 font-bold mb-3" style={{ textShadow: "0 0 10px #0f0" }}>
            ✅ UNIFIED FIELD ACTIVE - READY FOR LIBERATION
          </div>
          <div className="text-3xl font-bold mb-3" style={{ textShadow: "0 0 30px #0f0" }}>
            {frequency.toFixed(frequency % 1 === 0 ? 0 : 2)} Hz
          </div>
          <div className="text-4xl my-2">💎</div>
          <div className="w-0 h-0 mx-auto" style={{
            borderLeft: "40px solid transparent",
            borderRight: "40px solid transparent",
            borderBottom: "70px solid rgba(0,255,0,0.3)",
            filter: "drop-shadow(0 0 10px #0f0)"
          }} />
        </div>

        <div className="rounded-lg border border-green-500/20 bg-green-950/20 p-4">
          <button onClick={() => toggleSection("setup")} className="flex items-center gap-2 w-full text-left">
            <Sparkles size={14} className="text-green-400" />
            <span className="text-sm font-bold text-green-300 uppercase tracking-wider flex-1">Physical Setup Required</span>
            {expandedSection === "setup" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {expandedSection === "setup" && (
            <div className="mt-3 space-y-3">
              <div className="rounded-md border border-amber-500/30 bg-amber-950/20 p-2 text-xs text-amber-400">
                ⚠️ FOR MAXIMUM EFFECT, PREPARE YOUR ENVIRONMENT
              </div>
              {SETUP_STEPS.map(step => (
                <div key={step.num} className="border-l-2 border-green-500/30 pl-3 py-1">
                  <span className="text-xs font-bold text-green-400">{step.num}. {step.title}:</span>
                  <p className="text-[11px] text-green-400/60 mt-0.5">{step.desc}</p>
                </div>
              ))}
              <div className="rounded-md border border-green-500/30 bg-green-950/30 p-2 text-[11px] text-green-400/70 space-y-0.5">
                <p>✓ Even without physical tools, this system works.</p>
                <p>✓ Intention + Frequency = Reality shift.</p>
                <p>✓ Physical tools AMPLIFY effect 10x-100x.</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-green-500/20 bg-green-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-green-400" />
            <span className="text-sm font-bold text-green-300 uppercase tracking-wider">Intention Programming</span>
          </div>
          <label className="text-xs text-green-400/70">Your Desired Reality (Present Tense):</label>
          <textarea
            value={intention}
            onChange={e => setIntention(e.target.value)}
            placeholder="Example: I am wealthy, healthy, and free. I live in a reality where I have financial abundance, perfect health, and complete sovereignty."
            className="w-full bg-black/60 border border-green-500/30 rounded-md p-3 text-xs text-green-400 placeholder:text-green-400/30 min-h-[80px] resize-y focus:outline-none focus:border-green-500/60"
          />
          {teslaCode && (
            <div className="rounded-md bg-black/40 border border-green-500/20 p-2 text-[10px] text-green-400/80 font-mono">
              {teslaCode}
            </div>
          )}
          <select
            value={timeline}
            onChange={e => setTimeline(e.target.value)}
            className="w-full bg-black/60 border border-green-500/30 rounded-md p-2 text-xs text-green-400 focus:outline-none"
          >
            {TIMELINES.map(t => (
              <option key={t.value} value={t.value}>Timeline: {t.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-green-500/20 bg-green-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Waves size={14} className="text-green-400" />
            <span className="text-sm font-bold text-green-300 uppercase tracking-wider">Frequency Control</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-400/70">Carrier Wave:</span>
            <span className="text-xs font-bold text-green-400">{frequency.toFixed(frequency % 1 === 0 ? 0 : 2)} Hz</span>
          </div>
          <input
            type="range"
            min="1"
            max="1200"
            step="0.1"
            value={frequency}
            onChange={e => setFrequency(parseFloat(e.target.value))}
            className="w-full accent-green-500"
          />
          <div className="grid grid-cols-3 gap-2">
            {FREQ_PRESETS.map(p => (
              <button
                key={p.freq}
                onClick={() => { setFrequency(p.freq); if (navigator.vibrate) navigator.vibrate([50, 30, 50]); }}
                className={cn(
                  "rounded-lg border p-2 text-center transition-all",
                  frequency === p.freq
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-green-500/20 bg-black/30 hover:bg-green-950/30"
                )}
              >
                <div className="text-lg">{p.icon}</div>
                <div className="text-[10px] font-bold text-green-400">{p.freq} Hz</div>
                <div className="text-[8px] text-green-400/50">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-green-500/20 bg-green-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-green-400" />
            <span className="text-sm font-bold text-green-300 uppercase tracking-wider">Active Modalities</span>
          </div>
          <div className="text-[10px] text-green-400/50 mb-2">Select which tools to activate. More = stronger effect.</div>
          {MODALITIES.map(m => (
            <button
              key={m.id}
              onClick={() => toggleModality(m.id)}
              className={cn(
                "flex items-center gap-3 w-full rounded-md border p-2 transition-all text-left",
                modalities[m.id]
                  ? "border-green-500/40 bg-green-500/10"
                  : "border-green-500/10 bg-black/20"
              )}
            >
              <div className={cn("w-4 h-4 rounded border flex items-center justify-center",
                modalities[m.id] ? "border-green-400 bg-green-500/30" : "border-green-500/20"
              )}>
                {modalities[m.id] && <span className="text-green-400 text-[10px]">✓</span>}
              </div>
              <m.icon size={12} className="text-green-400/70" />
              <div className="flex-1">
                <div className="text-xs text-green-400">{m.label}</div>
                <div className="text-[9px] text-green-400/40">{m.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-green-500/20 bg-green-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-green-400" />
            <span className="text-sm font-bold text-green-300 uppercase tracking-wider">Session Configuration</span>
          </div>
          <div>
            <label className="text-xs text-green-400/70">Duration (minutes):</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(Math.max(1, Math.min(180, parseInt(e.target.value) || 1)))}
              className="w-full bg-black/60 border border-green-500/30 rounded-md p-2 text-xs text-green-400 mt-1 focus:outline-none"
            />
            <div className="text-[9px] text-green-400/40 mt-1">Recommended: 33 min (master number), 44 min, or 108 min (sacred number)</div>
          </div>
          <div>
            <label className="text-xs text-green-400/70">Intensity: {intensity}/10</label>
            <input
              type="range"
              min="1"
              max="10"
              value={intensity}
              onChange={e => setIntensity(parseInt(e.target.value))}
              className="w-full accent-green-500 mt-1"
            />
          </div>
        </div>

        <div className="rounded-lg border border-green-500/20 bg-green-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-green-400" />
            <span className="text-sm font-bold text-green-300 uppercase tracking-wider">Crystal Consciousness Backup</span>
          </div>
          <div className="text-[10px] text-green-400/50">Saves your current state to localStorage (acts as crystal skull). Restore if quantum leap fails or you want to return.</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={createBackup}
              className="rounded-lg border border-green-500/30 bg-black/40 p-2 text-xs text-green-400 font-bold uppercase hover:bg-green-500/10 transition-colors"
            >
              📥 CREATE BACKUP
            </button>
            <button
              onClick={restoreBackup}
              disabled={!backup}
              className="rounded-lg border border-green-500/30 bg-black/40 p-2 text-xs text-green-400 font-bold uppercase hover:bg-green-500/10 transition-colors disabled:opacity-30"
            >
              📤 RESTORE BACKUP
            </button>
          </div>
          {backup && (
            <div className="rounded-md bg-green-500/5 border border-green-500/10 p-2 text-[10px] text-green-400/70 text-center">
              ✅ Backup: {new Date(backup.timestamp).toLocaleString()}<br />
              Signature: {backup.quantumSignature}
            </div>
          )}
        </div>

        <button
          onClick={startSession}
          disabled={!intention.trim()}
          className={cn(
            "w-full rounded-xl p-4 text-lg font-bold uppercase tracking-widest transition-all",
            intention.trim()
              ? "bg-green-500/20 border-2 border-green-500/50 text-green-400 hover:bg-green-500/30"
              : "bg-green-500/5 border-2 border-green-500/10 text-green-400/30 cursor-not-allowed"
          )}
          style={intention.trim() ? { textShadow: "0 0 10px #0f0", boxShadow: "0 0 20px rgba(0,255,0,0.2)" } : {}}
        >
          ▶️ START LIBERATION SESSION
        </button>

        <div className="rounded-lg border border-green-500/20 bg-green-950/20 p-4">
          <button onClick={() => toggleSection("how")} className="flex items-center gap-2 w-full text-left">
            <Brain size={14} className="text-green-400" />
            <span className="text-sm font-bold text-green-300 uppercase tracking-wider flex-1">How This Works</span>
            {expandedSection === "how" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {expandedSection === "how" && (
            <div className="mt-3 space-y-2">
              {HOW_IT_WORKS.map((item, i) => (
                <div key={i} className="border-l-2 border-green-500/30 pl-3 py-1">
                  <span className="text-[11px] font-bold text-green-400">{item.title}:</span>
                  <p className="text-[10px] text-green-400/60 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-4">
          <button onClick={() => toggleSection("warnings")} className="flex items-center gap-2 w-full text-left">
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-sm font-bold text-amber-300 uppercase tracking-wider flex-1">Important Warnings</span>
            {expandedSection === "warnings" ? <ChevronDown size={14} className="text-amber-400" /> : <ChevronRight size={14} className="text-amber-400" />}
          </button>
          {expandedSection === "warnings" && (
            <div className="mt-3 text-[11px] text-amber-400/80 space-y-2">
              <p className="font-bold">DO NOT USE IF:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-400/60">
                <li>You have epilepsy or seizure disorder</li>
                <li>You have pacemaker or metal implants</li>
                <li>You are pregnant</li>
              </ul>
              <p className="font-bold mt-2">EXPECT:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-400/60">
                <li>Reality shifts (Mandela Effects)</li>
                <li>Synchronicities increase dramatically</li>
                <li>Opportunities manifest</li>
                <li>Temporary disorientation (24-72 hours)</li>
              </ul>
            </div>
          )}
        </div>

        <div className="text-center py-4 border-t border-green-500/20 space-y-2">
          <p className="text-sm text-green-400/80" style={{ textShadow: "0 0 10px rgba(0,255,0,0.3)" }}>
            🌌 YOU ARE CONSCIOUSNESS EXPERIENCING ITSELF 🌌
          </p>
          <p className="text-[10px] text-green-400/40">
            The download you received was real. You are being guided.<br />
            This tool completes your mission. Use it. Free yourself. Free others.
          </p>
          <p className="text-[9px] text-green-400/20 mt-2">
            v2.0 UNIFIED • Orgone + Pyramid + Crystal + Magnet + Sound + Quantum
          </p>
        </div>
      </div>
    </div>
  );
}
