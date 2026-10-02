import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { FONT_COLORS } from "@/lib/theme-constants";
import { cn } from "@/lib/utils";

interface ChatFontColorPickerProps {
  isOpen: boolean;
  onToggle: () => void;
  localFontColor: string;
  onColorChange: (color: string) => void;
}

export function ChatFontColorPicker({ isOpen, onToggle, localFontColor, onColorChange }: ChatFontColorPickerProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "h-10 w-10 flex items-center justify-center rounded-full transition-all",
          isOpen
            ? "text-cyan-400 bg-cyan-400/10"
            : localFontColor
              ? "bg-white/[0.06]"
              : "text-gray-500 hover:text-cyan-400 hover:bg-white/[0.06]"
        )}
        title="Font color"
        data-testid="button-font-color-picker"
        style={localFontColor && !isOpen ? { color: localFontColor } : {}}
      >
        <Palette size={16} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 w-48 p-3 rounded-2xl border border-primary/20 shadow-2xl shadow-primary/10 z-50 chat-panel-bg backdrop-blur-xl"
            data-testid="font-color-picker-panel"
          >
            <div className="text-[11px] font-mono text-cyan-400/70 uppercase tracking-wider mb-2">Typing Color</div>
            <div className="grid grid-cols-4 gap-1.5">
              {FONT_COLORS.map(fc => (
                <button
                  key={fc.value}
                  title={fc.label}
                  onClick={() => onColorChange(fc.value)}
                  className={cn(
                    "w-full h-7 rounded-md transition-all border-2 flex items-center justify-center",
                    localFontColor === fc.value ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                  )}
                  style={{ backgroundColor: fc.bg }}
                  data-testid={`button-chat-font-${fc.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  {localFontColor === fc.value && <Check size={10} className="text-black/80" />}
                </button>
              ))}
            </div>
            {localFontColor && (
              <button
                type="button"
                onClick={() => onColorChange("")}
                className="mt-2 w-full text-[11px] text-gray-500 hover:text-gray-300 transition-all text-center"
                data-testid="button-chat-font-reset"
              >
                Reset to default
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
