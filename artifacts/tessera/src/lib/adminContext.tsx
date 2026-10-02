import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface AdminState {
  isAdmin: boolean;
  configured: boolean;
  loading: boolean;
  authenticate: (key: string) => Promise<boolean>;
  logout: () => void;
  token: string;
  stealthMode: boolean;
  toggleStealth: () => void;
  adminMode: boolean;
  savedAdminKey: string;
  saveAdminKey: (key: string) => void;
  removeAdminKey: () => void;
}

const AdminContext = createContext<AdminState>({
  isAdmin: false,
  configured: false,
  loading: true,
  authenticate: async () => false,
  logout: () => {},
  token: "",
  stealthMode: false,
  toggleStealth: () => {},
  adminMode: false,
  savedAdminKey: "",
  saveAdminKey: () => {},
  removeAdminKey: () => {},
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => !!localStorage.getItem("t9_admin_token"));
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("t9_admin_token") || "");
  const [stealthMode, setStealthMode] = useState(false);
  const [adminMode, setAdminMode] = useState(() => localStorage.getItem("t9_admin_mode") === "true" && !!localStorage.getItem("t9_admin_token"));
  const [savedAdminKey, setSavedAdminKey] = useState(() => {
    localStorage.removeItem("t9_saved_admin_key");
    return "";
  });

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/status", {
        headers: token ? { "x-admin-token": token } : {},
      });
      const data = await res.json();
      if (data.isAdmin) {
        setIsAdmin(true);
        setAdminMode(true);
        if (!token) {
          const sessionToken = `sovereign-${Date.now()}`;
          localStorage.setItem("t9_admin_token", sessionToken);
          setToken(sessionToken);
        }
        applyAdminTheme(true);
        return true;
      }
      const storedKey = localStorage.getItem("t9_sovereign_key");
      if (storedKey) {
        const reauth = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: storedKey }),
        });
        if (reauth.ok) {
          const rd = await reauth.json();
          if (rd.authenticated && rd.token) {
            localStorage.setItem("t9_admin_token", rd.token);
            setToken(rd.token);
            setIsAdmin(true);
            setAdminMode(true);
            applyAdminTheme(true);
            return true;
          }
        }
      }
      setIsAdmin(false);
      setConfigured(data.configured);
      return false;
    } catch {
      setIsAdmin(false);
      return false;
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let launchToken: string | null = null;
      const hash = window.location.hash;
      if (hash && hash.startsWith("#t=")) {
        launchToken = hash.slice(3);
      }
      if (!launchToken) {
        const params = new URLSearchParams(window.location.search);
        launchToken = params.get("t");
      }
      if (launchToken) {
        try {
          const decoded = atob(decodeURIComponent(launchToken));
          if (decoded) {
            const ok = await authenticate(decoded);
            if (ok) {
              window.history.replaceState({}, "", window.location.pathname);
              setLoading(false);
              return;
            }
          }
        } catch {}
        window.history.replaceState({}, "", window.location.pathname);
      }
      await checkStatus();
      setLoading(false);
    })();
  }, []);

  const authenticate = async (key: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      if (!res.ok) {
        return false;
      }
      const data = await res.json();
      if (data.authenticated && data.token) {
        localStorage.setItem("t9_admin_token", data.token);
        localStorage.setItem("t9_sovereign_key", key.trim());
        setToken(data.token);
        setIsAdmin(true);
        setAdminMode(true);
        localStorage.setItem("t9_admin_mode", "true");
        applyAdminTheme(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const applyAdminTheme = (active: boolean) => {
    let style = document.getElementById("tessera-admin-theme") as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = "tessera-admin-theme";
      document.head.appendChild(style);
    }
    if (active) {
      style.textContent = `:root { --admin-active: 1; }
      .admin-mode-indicator { 
        color: #7c3aed !important;
        text-shadow: 0 0 12px rgba(124, 58, 237, 0.6);
      }
      .admin-mode-font {
        font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace !important;
        color: #8b5cf6 !important;
        text-shadow: 0 0 8px rgba(139, 92, 246, 0.35);
      }
      .admin-mode-caret {
        caret-color: #8b5cf6 !important;
      }
      .admin-mode-sidebar-title {
        background: linear-gradient(135deg, #a78bfa, #8b5cf6) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
      }
      [data-testid="mobile-nav"], [data-testid="mobile-bottom-nav"] {
        border-top-color: rgba(139, 92, 246, 0.25) !important;
        box-shadow: 0 -4px 20px rgba(139, 92, 246, 0.08);
      }
      [data-testid="sidebar"] {
        border-right-color: rgba(139, 92, 246, 0.15) !important;
      }
      [data-testid="admin-key-section"] {
        border-color: rgba(139, 92, 246, 0.4) !important;
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.1);
      }`;
    } else {
      style.textContent = "";
    }
  };

  useEffect(() => {
    applyAdminTheme(isAdmin);
  }, [isAdmin]);

  const logout = () => {
    setToken("");
    setIsAdmin(false);
    setStealthMode(false);
    setAdminMode(false);
    localStorage.removeItem("t9_admin_token");
    localStorage.removeItem("t9_admin_mode");
    localStorage.removeItem("t9_sovereign_key");
    applyAdminTheme(false);
  };

  const toggleStealth = () => {
    if (isAdmin) {
      setStealthMode(prev => !prev);
    }
  };

  const saveAdminKey = (key: string) => {
    setSavedAdminKey(key);
    localStorage.setItem("t9_sovereign_key", key);
  };

  const removeAdminKey = () => {
    setSavedAdminKey("");
    localStorage.removeItem("t9_sovereign_key");
  };

  return (
    <AdminContext.Provider value={{ isAdmin, configured, loading, authenticate, logout, token, stealthMode, toggleStealth, adminMode, savedAdminKey, saveAdminKey, removeAdminKey }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
