export type ReplyMode = "voice" | "text" | "both";
export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

let currentAudioElement: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;

export async function playAudioResponse(base64Audio: string, onEnd?: () => void): Promise<void> {
  stopSpeaking();

  if (!base64Audio || typeof base64Audio !== "string" || base64Audio.length < 100) {
    if (onEnd) onEnd();
    return;
  }

  try {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    currentAudioUrl = url;

    const audio = new Audio(url);
    currentAudioElement = audio;
    audio.volume = 0.85;

    audio.onended = () => {
      cleanupAudio();
      if (onEnd) onEnd();
    };
    audio.onerror = (e) => {
      console.warn("[VoicePlayback] Audio playback error:", e);
      cleanupAudio();
      if (onEnd) onEnd();
    };

    await audio.play();
  } catch (err) {
    console.warn("[VoicePlayback] Failed to play audio response:", err);
    cleanupAudio();
    if (onEnd) onEnd();
  }
}

function cleanupAudio() {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.src = "";
    currentAudioElement = null;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
}

export function stopSpeaking() {
  cleanupAudio();
}

export function isSpeakingNow(): boolean {
  return currentAudioElement !== null && !currentAudioElement.paused;
}

export async function sendVoiceMessage(
  audioBlob: Blob,
  conversationContext?: { role: string; content: string }[]
): Promise<{ userTranscript: string; transcript: string; audio: string | null; error?: string }> {
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  const response = await fetch("/api/voice/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audio: base64,
      conversationContext: conversationContext?.slice(-6),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Voice request failed" }));
    console.warn("[VoiceMessage] Server error:", response.status, err);
    return { userTranscript: "", transcript: err.transcript || "", audio: null, error: err.error };
  }

  const result = await response.json();
  if (!result.audio && result.userTranscript) {
    console.info("[VoiceMessage] Transcribed but no audio returned (text mode):", result.userTranscript);
  }
  return result;
}

export function copyToClipboard(text: string, setCopiedId: (id: string) => void, id: string) {
  navigator.clipboard.writeText(text).then(() => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  });
}

export function downloadConversation(messages: any[]) {
  const text = messages.map(m => `[${m.role}]: ${m.content}`).join("\n\n---\n\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `tessera-conversation-${Date.now()}.txt`;
  a.click(); URL.revokeObjectURL(url);
}

const WAVE_HEIGHTS = [10, 18, 14, 20, 12, 16, 10, 18, 14, 12];

export function VoiceVisualization({ state }: { state: VoiceState }) {
  if (state === "idle") return null;
  const colors: Record<VoiceState, string> = { idle: "", listening: "bg-red-400", thinking: "bg-yellow-400", speaking: "bg-cyan-400" };
  const barCount = state === "listening" ? 7 : 5;
  return (
    <div className="flex items-end gap-0.5 h-6">
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full ${colors[state]}`}
          style={{
            height: `${WAVE_HEIGHTS[i % WAVE_HEIGHTS.length]}px`,
            animation: `voiceBar 0.8s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

export function VoiceStateLabel({ state }: { state: VoiceState }) {
  const labels: Record<VoiceState, string> = { idle: "", listening: "Listening...", thinking: "Processing voice...", speaking: "Tess is speaking..." };
  if (!labels[state]) return null;
  return <span className="text-xs text-gray-400">{labels[state]}</span>;
}

export function VoiceActivityIndicator({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;
  return <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />;
}

export function VoiceSettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute bottom-full mb-2 right-0 p-3 rounded-lg bg-gray-900 border border-white/10 shadow-xl z-50 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-300">Voice Settings</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs" data-testid="button-close-voice-settings">×</button>
      </div>
      <div className="text-xs text-gray-400">Sovereign AI voice — natural speech</div>
      <div className="mt-1 text-[10px] text-gray-600 font-mono">gpt-audio • secured channel</div>
    </div>
  );
}
