import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, MessageSquare, Brain, Globe, DollarSign, Radio, Coins, Key, GitBranch, Activity, Zap, ArrowRight, Satellite } from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  action: () => void;
  category: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const commands: CommandItem[] = [
    { id: "chat", label: "Chat", description: "Open sovereign chat", icon: MessageSquare, action: () => setLocation("/"), category: "Navigate" },
    { id: "command", label: "Command", description: "Intelligence & System Health", icon: Brain, action: () => setLocation("/command"), category: "Navigate" },
    { id: "swarm", label: "Swarm", description: "Life World, Swarm Viz & Forum", icon: Satellite, action: () => setLocation("/swarm"), category: "Navigate" },
    { id: "coin", label: "$TSRT Coin", description: "Token economy & live chart", icon: Coins, action: () => setLocation("/coin"), category: "Navigate" },
    { id: "revenue", label: "Revenue", description: "Income & financial engines", icon: DollarSign, action: () => setLocation("/revenue-hub"), category: "Navigate" },
    { id: "config", label: "Config", description: "API Keys, Rules & Marketplace", icon: Key, action: () => setLocation("/config"), category: "Navigate" },
    { id: "new-chat", label: "New Conversation", description: "Start a new chat thread", icon: MessageSquare, action: () => { setLocation("/"); setTimeout(() => { const btn = document.querySelector<HTMLButtonElement>("[data-testid='button-new-chat']"); btn?.click(); }, 100); }, category: "Actions" },
    { id: "focus-search", label: "Focus Chat Input", description: "Jump to chat input", icon: Search, action: () => { setLocation("/"); setTimeout(() => { const input = document.querySelector<HTMLTextAreaElement>("[data-testid='input-message']"); input?.focus(); }, 100); }, category: "Actions" },
  ];

  const filtered = query
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase()))
    : commands;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback((item: CommandItem) => {
    setOpen(false);
    setQuery("");
    item.action();
  }, []);

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    }
  };

  if (!open) return null;

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" data-testid="command-palette">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg rounded-xl border border-border/60 bg-card shadow-2xl shadow-black/50 overflow-hidden" data-testid="command-palette-dialog">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyNavigation}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            data-testid="input-command-search"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="text-[10px] font-mono font-semibold text-muted-foreground/60 uppercase tracking-wider px-2 py-1.5">{category}</div>
              {items.map(item => {
                const currentIdx = flatIndex++;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${currentIdx === selectedIndex ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"}`}
                    data-testid={`command-${item.id}`}
                  >
                    <Icon size={15} className={currentIdx === selectedIndex ? "text-primary" : ""} />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground/70">{item.description}</div>
                    </div>
                    {currentIdx === selectedIndex && <ArrowRight size={12} className="text-primary" />}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No results found</p>}
        </div>
      </div>
    </div>
  );
}
