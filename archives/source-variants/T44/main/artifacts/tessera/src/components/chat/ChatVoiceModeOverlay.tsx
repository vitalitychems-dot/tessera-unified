import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Pause, Play, PhoneOff, Volume2, MessageSquare, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ReplyMode, type VoiceState,
  VoiceVisualization, VoiceStateLabel, VoiceActivityIndicator, VoiceSettingsPanel,
} from "./ChatVoice";

interface ChatVoiceModeOverlayProps {
  voiceState: VoiceState;
  isRecording: boolean;
  input: string;
  interimText: string;
  streamingContent: string;
  lastAssistantMessage: string;
  voicePaused: boolean;
  replyMode: ReplyMode;
  voiceSettingsOpen: boolean;
  onMicPressStart: () => void;
  onMicPressEnd: () => void;
  onToggleVoicePause: () => void;
  onExitVoiceMode: () => void;
  onToggleReplyMode: () => void;
  onToggleVoiceSettings: () => void;
}

export const ChatVoiceModeOverlay = memo(function ChatVoiceModeOverlay({
  voiceState, isRecording, input, interimText, streamingContent, lastAssistantMessage,
  voicePaused, replyMode, voiceSettingsOpen,
  onMicPressStart, onMicPressEnd, onToggleVoicePause, onExitVoiceMode, onToggleReplyMode, onToggleVoiceSettings,
}: ChatVoiceModeOverlayProps) {
  const showResponse = streamingContent || (lastAssistantMessage && (voiceState === "speaking" || voiceState === "thinking"));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center thinking-overlay-bg backdrop-blur-md"
      data-testid="voice-mode-overlay"
    >
      <div className="flex flex-col items-center gap-8">
        <VoiceVisualization state={voiceState} />

        {voiceState === "listening" && (
          <VoiceActivityIndicator isActive={isRecording} />
        )}

        <VoiceStateLabel state={voiceState} />

        {voiceState === "listening" && (input.trim() || interimText) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-center"
            data-testid="text-voice-transcript"
          >
            {interimText ? (
              <>
                {input.endsWith(interimText) && input.length > interimText.length && (
                  <span className="text-gray-300">{input.slice(0, input.length - interimText.length).trim()} </span>
                )}
                <span className="text-cyan-400/60 italic" data-testid="text-voice-interim">{interimText}</span>
              </>
            ) : (
              <span className="text-gray-300">{input}</span>
            )}
          </motion.div>
        )}

        {showResponse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl max-h-64 overflow-y-auto px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-300 text-sm leading-relaxed custom-scrollbar"
            data-testid="text-voice-response-preview"
          >
            {streamingContent || lastAssistantMessage || ""}
          </motion.div>
        )}

        {(voiceState === "idle" || voiceState === "listening") && (
          <button
            onMouseDown={onMicPressStart}
            onMouseUp={onMicPressEnd}
            onMouseLeave={onMicPressEnd}
            onTouchStart={onMicPressStart}
            onTouchEnd={onMicPressEnd}
            onTouchCancel={onMicPressEnd}
            className={cn(
              "h-20 w-20 rounded-full flex items-center justify-center transition-all select-none border-2",
              isRecording
                ? "bg-red-500/30 border-red-400 text-red-300 shadow-lg shadow-red-500/30"
                : "bg-white/[0.06] border-white/20 text-gray-400 hover:border-white/40 hover:text-white"
            )}
            title={isRecording ? "Release to send" : "Hold to speak"}
            data-testid="button-voice-overlay-ptt"
          >
            {isRecording ? (
              <div className="relative">
                <MicOff size={28} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping" />
              </div>
            ) : <Mic size={28} />}
          </button>
        )}

        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={onToggleVoicePause}
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center transition-all",
              voicePaused
                ? "bg-cyan-500/20 border-2 border-cyan-400/60 text-cyan-400"
                : "bg-amber-500/20 border-2 border-amber-400/60 text-amber-400"
            )}
            title={voicePaused ? "Resume conversation" : "Pause conversation"}
            data-testid="button-voice-pause"
          >
            {voicePaused ? <Play size={20} /> : <Pause size={20} />}
          </button>

          <button
            onClick={onExitVoiceMode}
            className="h-14 w-14 rounded-full bg-red-500/20 border-2 border-red-400/60 text-red-400 flex items-center justify-center transition-all"
            title="End voice mode"
            data-testid="button-voice-end"
          >
            <PhoneOff size={24} />
          </button>

          <button
            onClick={onToggleReplyMode}
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center transition-all",
              replyMode === "voice"
                ? "bg-emerald-500/20 border-2 border-emerald-400/60 text-emerald-400"
                : "bg-blue-500/20 border-2 border-blue-400/60 text-blue-400"
            )}
            title={replyMode === "voice" ? "Switch to text replies" : "Switch to voice replies"}
            data-testid="button-reply-mode"
          >
            {replyMode === "voice" ? <Volume2 size={20} /> : <MessageSquare size={20} />}
          </button>
        </div>

        <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-gray-500">
          <span data-testid="text-reply-mode-label">Reply: {replyMode === "voice" ? "Voice" : "Text"}</span>
          <span className="text-gray-700">|</span>
          <span>{voicePaused ? "Paused" : "Active"}</span>
          <span className="text-gray-700">|</span>
          <button
            onClick={onToggleVoiceSettings}
            className="text-gray-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
            data-testid="button-voice-settings"
          >
            <Settings2 size={11} />
            <span>Settings</span>
          </button>
        </div>

        <AnimatePresence>
          {voiceSettingsOpen && (
            <VoiceSettingsPanel onClose={onToggleVoiceSettings} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
