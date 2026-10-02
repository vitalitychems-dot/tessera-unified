import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatVoiceSpeedControlProps {
  isOpen: boolean;
  onToggle: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const SPEED_PRESETS = [0.75, 1.0, 1.5, 2.0];

export const ChatVoiceSpeedControl = memo(function ChatVoiceSpeedControl({
  isOpen, onToggle, speed, onSpeedChange,
}: ChatVoiceSpeedControlProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="h-10 px-2 flex items-center justify-center rounded-full text-gray-500 hover:text-indigo-400 hover:bg-white/[0.06] transition-all text-[11px] font-mono font-bold"
        title="Voice speed"
        data-testid="button-voice-speed-toggle"
      >
        {speed.toFixed(1)}x
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 w-48 p-3 rounded-2xl border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 z-50 chat-panel-bg backdrop-blur-xl"
            data-testid="voice-speed-slider-popup"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Speed</span>
              <span className="text-[11px] font-mono text-indigo-400 font-bold" data-testid="text-speed-display">{speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.1}
              value={speed}
              onChange={e => onSpeedChange(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-400"
              style={{
                background: `linear-gradient(to right, rgba(99,102,241,0.6) 0%, rgba(99,102,241,0.9) ${((speed - 0.5) / 2.0) * 100}%, rgba(255,255,255,0.06) ${((speed - 0.5) / 2.0) * 100}%, rgba(255,255,255,0.06) 100%)`,
              }}
              data-testid="input-speed-slider"
            />
            <div className="flex justify-between mt-1.5 gap-1">
              {SPEED_PRESETS.map(s => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`flex-1 py-1 rounded text-[11px] font-mono transition-all ${Math.abs(speed - s) < 0.05 ? "bg-indigo-500/30 text-indigo-300" : "bg-white/[0.04] text-gray-500 hover:bg-white/[0.08]"}`}
                  data-testid={`button-speed-preset-${s}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
