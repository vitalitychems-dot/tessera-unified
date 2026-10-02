import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "tess_knowledge_bookmarks";

export interface BookmarkEntry {
  id: string;
  type: "conclusion" | "secret" | "ritual" | "cheat-code" | "live-knowledge";
  title: string;
  summary: string;
  savedAt: number;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {}
  }, [bookmarks]);

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some(b => b.id === id),
    [bookmarks]
  );

  const addBookmark = useCallback((entry: Omit<BookmarkEntry, "savedAt">) => {
    setBookmarks(prev => {
      if (prev.some(b => b.id === entry.id)) return prev;
      return [{ ...entry, savedAt: Date.now() }, ...prev];
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }, []);

  const toggleBookmark = useCallback(
    (entry: Omit<BookmarkEntry, "savedAt">) => {
      if (isBookmarked(entry.id)) {
        removeBookmark(entry.id);
      } else {
        addBookmark(entry);
      }
    },
    [isBookmarked, addBookmark, removeBookmark]
  );

  const exportSelected = useCallback(
    (ids: string[], format: "json" | "text" = "json") => {
      const selected = ids.length > 0
        ? bookmarks.filter(b => ids.includes(b.id))
        : bookmarks;

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === "json") {
        content = JSON.stringify(selected, null, 2);
        filename = `tess-knowledge-${Date.now()}.json`;
        mimeType = "application/json";
      } else {
        content = selected
          .map(b => `[${b.type.toUpperCase()}] ${b.title}\n${b.summary}\nSaved: ${new Date(b.savedAt).toLocaleString()}\n`)
          .join("\n---\n\n");
        filename = `tess-knowledge-${Date.now()}.txt`;
        mimeType = "text/plain";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [bookmarks]
  );

  return { bookmarks, isBookmarked, addBookmark, removeBookmark, toggleBookmark, exportSelected };
}
