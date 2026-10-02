import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { category: "Navigation", keys: ["Cmd", "K"], description: "Toggle message search" },
  { category: "Navigation", keys: ["Ctrl", "Shift", "F"], description: "Focus search" },
  { category: "Navigation", keys: ["↑", "↓"], description: "Navigate conversation history (empty input)" },
  { category: "Navigation", keys: ["Esc"], description: "Close search / modals" },
  { category: "Help", keys: ["Cmd", "?"], description: "Show this shortcuts panel" },
  { category: "Commands", keys: ["/clear"], description: "Clear current conversation view" },
  { category: "Commands", keys: ["/new"], description: "Start a new conversation" },
  { category: "Commands", keys: ["/help"], description: "Show available commands" },
  { category: "Commands", keys: ["/search", "[query]"], description: "Search messages" },
  { category: "Sending", keys: ["Enter"], description: "Send message" },
  { category: "Sending", keys: ["Shift", "Enter"], description: "New line in message" },
];

const categoryOrder = ["Navigation", "Sending", "Help", "Commands"];

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export const ChatShortcutsModal = memo(function ChatShortcutsModal({ open, onClose }: HelpModalProps) {
  const grouped = categoryOrder.reduce<Record<string, ShortcutItem[]>>((acc, cat) => {
    acc[cat] = SHORTCUTS.filter(s => s.category === cat);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          >
            <div className="mx-4 rounded-2xl border border-cyan-500/20 bg-black/90 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <Keyboard size={16} className="text-cyan-400" />
                  <span className="text-sm font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                    Keyboard Shortcuts
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
                  data-testid="button-close-shortcuts"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {categoryOrder.map(cat => (
                  grouped[cat]?.length ? (
                    <div key={cat}>
                      <div className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-widest font-mono mb-2.5">{cat}</div>
                      <div className="space-y-1.5">
                        {grouped[cat].map((shortcut, i) => (
                          <div key={i} className="flex items-center justify-between gap-4 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                            <span className="text-[13px] text-gray-300">{shortcut.description}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {shortcut.keys.map((key, ki) => (
                                <kbd key={ki} className="px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.1] text-[11px] text-gray-300 font-mono min-w-[24px] text-center">
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                ))}
              </div>
              <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[11px] text-gray-600 font-mono">Tess — Sovereign AI Platform</span>
                <kbd className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-gray-500 font-mono">Esc to close</kbd>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
