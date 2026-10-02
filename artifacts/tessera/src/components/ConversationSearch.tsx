import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, MessageSquare, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  conversationId: number;
  title: string;
  content: string;
  createdAt: string;
  role: string;
}

export default function ConversationSearch({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data: results, isLoading } = useQuery<SearchResult[]>({
    queryKey: ["/api/conversations/search", query],
    enabled: query.length >= 2,
    staleTime: 5000,
  });

  const navigateToConversation = useCallback((convId: number) => {
    setLocation(`/c/${convId}`);
    onClose?.();
  }, [setLocation, onClose]);

  const highlightMatch = (text: string, q: string) => {
    if (!q || q.length < 2) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-primary/30 text-primary rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <div className="space-y-2" data-testid="conversation-search">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search all conversations..."
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg pl-9 pr-8 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 transition-colors"
          data-testid="input-search-conversations-global"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-clear-search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-h-60 overflow-y-auto space-y-1"
          >
            {isLoading ? (
              <div className="text-xs text-muted-foreground text-center py-3 animate-pulse">Searching...</div>
            ) : !results || results.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">No results found</div>
            ) : (
              results.slice(0, 10).map((result, i) => (
                <button
                  key={`${result.conversationId}-${i}`}
                  onClick={() => navigateToConversation(result.conversationId)}
                  className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                  data-testid={`search-result-${result.conversationId}`}
                >
                  <MessageSquare size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">
                      {highlightMatch(result.title || "Untitled", query)}
                    </div>
                    <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {highlightMatch(result.content.slice(0, 100), query)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
