import { useState } from "react";
import { FileText, Image, File, Volume2, Loader2, Eye } from "lucide-react";

export interface UploadedFile {
  id: number;
  filename: string;
  mimeType: string;
  size: number;
  path?: string;
}

export const FileIcon = ({ mimeType }: { mimeType: string }) => {
  if (mimeType.startsWith("image/")) return <Image size={14} className="text-purple-400" />;
  if (mimeType.startsWith("audio/")) return <Volume2 size={14} className="text-blue-400" />;
  if (mimeType.startsWith("text/") || mimeType.includes("json") || mimeType.includes("javascript")) return <FileText size={14} className="text-green-400" />;
  return <File size={14} className="text-amber-400" />;
};

export const ImageThumbnail = ({ file, conversationId, onAnalysis }: { file: UploadedFile; conversationId?: number; onAnalysis?: (analysis: string) => void }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const diskFilename = file.path ? file.path.split("/").pop() : file.filename;
  const imgSrc = `/uploads/${diskFilename}`;

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!file.id || !conversationId || analyzing || analyzed) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/multimodal/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId: file.id, conversationId }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAnalyzed(true);
        onAnalysis?.(data.analysis);
      }
    } catch {}
    setAnalyzing(false);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/40" style={{ width: 80, height: 80 }}>
      <img
        src={imgSrc}
        alt={file.filename}
        className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
        <span className="text-[8px] text-white/70 font-mono text-center px-1 truncate w-full text-center">{file.filename}</span>
        {conversationId && !analyzed && (
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-[9px] text-cyan-300 font-mono transition-colors disabled:opacity-50"
          >
            {analyzing ? <Loader2 size={8} className="animate-spin" /> : <Eye size={8} />}
            {analyzing ? "..." : "Analyze"}
          </button>
        )}
        {analyzed && <span className="text-[8px] text-emerald-400 font-mono">✓ Analyzed</span>}
      </div>
    </div>
  );
};

export const AudioFilePlayer = ({ file, conversationId }: { file: UploadedFile; conversationId: number }) => {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const diskFilename = file.path ? file.path.split("/").pop() : file.filename;
  const audioPath = `/uploads/${diskFilename}`;

  const handleTranscribe = async () => {
    setTranscribing(true);
    try {
      const res = await fetch("/api/multimodal/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId: file.id, conversationId }),
      });
      const data = await res.json();
      if (data.transcript) setTranscript(data.transcript);
      else setTranscript(data.error || "Transcription failed");
    } catch {
      setTranscript("Transcription unavailable");
    }
    setTranscribing(false);
  };

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 rounded-xl border border-blue-500/20 bg-blue-950/20 max-w-xs">
      <div className="flex items-center gap-2">
        <Volume2 size={12} className="text-blue-400 shrink-0" />
        <span className="text-[11px] text-blue-300 font-mono truncate max-w-[150px]">{file.filename}</span>
      </div>
      <audio controls src={audioPath} className="w-full h-8" style={{ maxWidth: 280 }} preload="metadata" />
      {!transcript && (
        <button
          type="button"
          onClick={handleTranscribe}
          disabled={transcribing}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-[10px] text-blue-400 font-mono transition-colors disabled:opacity-50"
        >
          {transcribing ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />}
          {transcribing ? "Transcribing..." : "Transcribe"}
        </button>
      )}
      {transcript && (
        <div className="text-[11px] text-gray-300 bg-black/30 rounded-lg px-2 py-1.5 max-h-20 overflow-y-auto">
          {transcript}
        </div>
      )}
    </div>
  );
};
