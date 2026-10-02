import { useCallback } from "react";
import { NAV_COMMANDS, DATA_COMMANDS, ACTION_COMMANDS } from "./ChatCommands";
import { queryClient } from "@/lib/queryClient";

interface CommandCallbacks {
  setInputBoth: (val: string) => void;
  setNavFlash: (msg: string | null) => void;
  setLocation: (route: string) => void;
  setDataCommandResult: (result: { label: string; content: string; loading: boolean } | null) => void;
  setShortcutsOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  focusSearchInput: () => void;
  conversationId: number;
}

export function useChatCommandExecutor(callbacks: CommandCallbacks) {
  const {
    setInputBoth, setNavFlash, setLocation,
    setDataCommandResult, setShortcutsOpen,
    setSearchQuery, setSearchOpen, focusSearchInput,
    conversationId,
  } = callbacks;

  const tryExecuteCommand = useCallback(async (msgText: string): Promise<boolean> => {
    if (/^\/clear\s*$/i.test(msgText.trim())) {
      setInputBoth("");
      setDataCommandResult({ label: "Clear View", content: "Conversation view cleared. Messages are preserved in history.", loading: false });
      setTimeout(() => setDataCommandResult(null), 3000);
      return true;
    }

    if (/^\/new\s*$/i.test(msgText.trim())) {
      setInputBoth("");
      setLocation("/");
      return true;
    }

    if (/^\/help\s*$/i.test(msgText.trim())) {
      setInputBoth("");
      setShortcutsOpen(true);
      return true;
    }

    if (/^\/search\s+(.+)$/i.test(msgText.trim())) {
      const query = msgText.trim().replace(/^\/search\s+/i, "");
      setInputBoth("");
      setSearchQuery(query);
      setSearchOpen(true);
      focusSearchInput();
      return true;
    }

    if (msgText.length <= 120) {
      for (const cmd of NAV_COMMANDS) {
        if (cmd.patterns.test(msgText)) {
          setInputBoth("");
          setNavFlash(`Navigating to ${cmd.label}...`);
          setTimeout(() => setNavFlash(null), 2500);
          setTimeout(() => setLocation(cmd.route), 300);
          return true;
        }
      }

      for (const dc of DATA_COMMANDS) {
        if (dc.patterns.test(msgText)) {
          setInputBoth("");
          setDataCommandResult({ label: dc.label, content: "", loading: true });
          try {
            const adminToken = localStorage.getItem("t9_admin_token") || "";
            const headers: Record<string, string> = {};
            if (adminToken) headers["x-admin-token"] = adminToken;
            const res = await fetch(dc.endpoint, { credentials: "include", headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setDataCommandResult({ label: dc.label, content: dc.format(data), loading: false });
            setTimeout(() => setDataCommandResult(null), 15000);
          } catch {
            setDataCommandResult({ label: dc.label, content: `Failed to fetch ${dc.label} data.`, loading: false });
            setTimeout(() => setDataCommandResult(null), 5000);
          }
          return true;
        }
      }

      for (const ac of ACTION_COMMANDS) {
        const match = ac.patterns.exec(msgText);
        if (match) {
          const body = ac.extractBody(match, msgText);
          if (!body) break;
          setInputBoth("");
          setDataCommandResult({ label: ac.label, content: "", loading: true });
          try {
            const adminToken = localStorage.getItem("t9_admin_token") || "";
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (adminToken) headers["x-admin-token"] = adminToken;
            const res = await fetch(ac.endpoint, {
              method: "POST",
              headers,
              body: JSON.stringify({ [ac.bodyKey]: body }),
              credentials: "include",
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const formatted = ac.format(data);
            setDataCommandResult({ label: ac.label, content: formatted, loading: false });
            if (conversationId) {
              fetch(`/api/conversations/${conversationId}/puter-save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: msgText, role: "user" }),
              }).catch(() => {});
              fetch(`/api/conversations/${conversationId}/puter-save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: formatted, role: "assistant" }),
              }).then(() => {
                queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
              }).catch(() => {});
            }
            setTimeout(() => setDataCommandResult(null), 20000);
          } catch {
            setDataCommandResult({ label: ac.label, content: `Failed to execute ${ac.label}.`, loading: false });
            setTimeout(() => setDataCommandResult(null), 5000);
          }
          return true;
        }
      }
    }

    return false;
  }, [setInputBoth, setNavFlash, setLocation, setDataCommandResult, setShortcutsOpen, setSearchQuery, setSearchOpen, focusSearchInput, conversationId]);

  return { tryExecuteCommand };
}
