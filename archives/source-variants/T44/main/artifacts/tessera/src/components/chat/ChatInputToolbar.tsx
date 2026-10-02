import { memo } from "react";
import { Send, Loader2, Mic, MicOff, Paperclip, Square, Volume2, VolumeX, Network, Radio, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatFontColorPicker } from "./ChatFontColorPicker";
import { ChatVoiceSpeedControl } from "./ChatVoiceSpeedControl";

interface ChatInputToolbarProps {
  input: string;
  isStreaming: boolean;
  isSending: boolean;
  isRecording: boolean;
  isUploading: boolean;
  isSpeaking: boolean;
  ttsEnabled: boolean;
  latticeOpen: boolean;
  summitFeedOpen: boolean;
  themeOpen: boolean;
  localFontColor: string;
  globalVoiceSpeed: number;
  voiceSpeedSliderOpen: boolean;
  onAttachClick: () => void;
  onSummitClick: () => void;
  onLatticeClick: () => void;
  onLiveClick: () => void;
  onFontColorToggle: () => void;
  onFontColorChange: (color: string) => void;
  onTtsToggle: () => void;
  onVoiceSpeedToggle: () => void;
  onVoiceSpeedChange: (speed: number) => void;
  onMicPressStart: () => void;
  onMicPressEnd: () => void;
  onStopStreaming: () => void;
}

export const ChatInputToolbar = memo(function ChatInputToolbar({
  input, isStreaming, isSending, isRecording, isUploading,
  isSpeaking, ttsEnabled, latticeOpen, summitFeedOpen, themeOpen,
  localFontColor, globalVoiceSpeed, voiceSpeedSliderOpen,
  onAttachClick, onSummitClick, onLatticeClick, onLiveClick,
  onFontColorToggle, onFontColorChange, onTtsToggle,
  onVoiceSpeedToggle, onVoiceSpeedChange,
  onMicPressStart, onMicPressEnd, onStopStreaming,
}: ChatInputToolbarProps) {
  return (
    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onAttachClick}
          disabled={isUploading}
          className="h-10 w-10 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
          title="Attach images, audio, or files"
          data-testid="button-attach"
        >
          {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
        </button>

        <button
          type="button"
          onClick={onSummitClick}
          className="h-8 flex items-center gap-1 px-2 rounded-full text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all text-[11px]"
          title="Grand Summit — All Tesseracts, Entities & Dimensions"
          data-testid="button-quick-summit"
        >
          <Network size={13} />
          <span className="hidden sm:inline">Summit</span>
        </button>

        <button
          type="button"
          onClick={onLatticeClick}
          className={cn(
            "h-8 flex items-center gap-1 px-2 rounded-full transition-all text-[11px]",
            latticeOpen ? "text-cyan-400 bg-cyan-400/10" : "text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10"
          )}
          title="The Lattice — Sovereign Internet"
          data-testid="button-quick-lattice"
        >
          <Radio size={13} />
          <span className="hidden sm:inline">Lattice</span>
        </button>

        <button
          type="button"
          onClick={onLiveClick}
          className={cn(
            "h-8 flex items-center gap-1 px-2 rounded-full transition-all text-[11px]",
            summitFeedOpen ? "text-yellow-400 bg-yellow-400/10" : "text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10"
          )}
          title="Live Summit Feed — All Fleet Discussions & Votes"
          data-testid="button-summit-feed"
        >
          <Activity size={13} className={summitFeedOpen ? "animate-pulse" : ""} />
          <span className="hidden sm:inline">Live</span>
        </button>

      </div>

      <ChatFontColorPicker
        isOpen={themeOpen}
        onToggle={onFontColorToggle}
        localFontColor={localFontColor}
        onColorChange={onFontColorChange}
      />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onTtsToggle}
          className={cn(
            "h-10 w-10 flex items-center justify-center rounded-full transition-all",
            isSpeaking
              ? "text-cyan-400 bg-cyan-400/10 animate-pulse"
              : ttsEnabled
                ? "text-cyan-400/60 hover:text-cyan-400 hover:bg-white/[0.06]"
                : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.06]"
          )}
          title={isSpeaking ? "Stop speaking" : ttsEnabled ? "Mute" : "Unmute"}
          data-testid="button-tts"
        >
          {isSpeaking ? <Square size={16} className="fill-current" /> : ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        <ChatVoiceSpeedControl
          isOpen={voiceSpeedSliderOpen}
          onToggle={onVoiceSpeedToggle}
          speed={globalVoiceSpeed}
          onSpeedChange={onVoiceSpeedChange}
        />

        <button
          type="button"
          onClick={onMicPressStart}
          className={cn(
            "h-10 w-10 flex items-center justify-center rounded-full transition-all select-none",
            isRecording
              ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
              : "text-gray-500 hover:text-white hover:bg-white/[0.06]"
          )}
          title={isRecording ? "Tap to stop" : "Tap to speak"}
          data-testid="button-voice"
        >
          {isRecording ? (
            <div className="relative">
              <MicOff size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-300 rounded-full animate-ping" />
            </div>
          ) : <Mic size={18} />}
        </button>

        {isStreaming ? (
          <button
            type="button"
            onClick={onStopStreaming}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-all"
            title="Stop generating"
            data-testid="button-stop"
          >
            <Square size={16} className="fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              "h-10 w-10 flex items-center justify-center rounded-full transition-all duration-500 relative",
              input.trim()
                ? isSending
                  ? "bg-cyan-400 text-black shadow-lg shadow-cyan-400/60 scale-110"
                  : "bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg shadow-cyan-500/40 hover:shadow-cyan-400/60 scale-100 hover:scale-105"
                : "bg-white/5 text-gray-600 cursor-not-allowed"
            )}
            data-testid="button-send"
          >
            <Send size={16} className={input.trim() ? "translate-x-[1px]" : ""} />
            {isSending && (
              <span className="absolute inset-0 rounded-full animate-ping opacity-40 bg-cyan-400" style={{ animationDuration: "0.8s" }} />
            )}
            {input.trim() && !isSending && (
              <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-cyan-500" style={{ animationDuration: "2s" }} />
            )}
          </button>
        )}
      </div>
    </div>
  );
});
