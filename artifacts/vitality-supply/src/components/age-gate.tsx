import { useEffect, useState, useRef, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { RUO_SHORT } from "@/lib/legal";

/** Runs in <head> before paint so the age gate appears on every fresh page load. */
export const GATE_BOOT = `(function(){
  var storageKey="vs-age-accepted";
  function setOk(){
    try { sessionStorage.setItem(storageKey,"1"); } catch(e) {}
    document.documentElement.setAttribute("data-gate","ok");
    var w=document.getElementById("ruo-wrapper");
    if(w) w.removeAttribute("inert");
    window.dispatchEvent(new Event("vs:age-accepted"));
  }
  function reject(){
    window.location.href = "https://www.google.com";
  }
  try {
    var p=location.pathname||"";
    var isAuth = p.indexOf("/login")===0||p.indexOf("/admin")===0||p.indexOf("/account")===0;
    var accepted = sessionStorage.getItem(storageKey)==="1";
    if (accepted) {
      document.documentElement.setAttribute("data-gate","ok");
    } else if (isAuth) {
      document.documentElement.setAttribute("data-gate","exempt");
    }
  } catch(e) {}
  function node(ev){
    var t=ev.target;
    if(t && t.nodeType===3) t=t.parentNode;
    return t && t.closest ? t : null;
  }
  function go(ev){
    var t=node(ev);
    if(!t) return;
    
    if(t.closest("#ruo-decline") || t.closest("#ruo-gate .ruo-decline")) {
      ev.preventDefault();
      ev.stopPropagation();
      reject();
      return;
    }
    
    if(!t.closest("#ruo-enter") && !t.closest("#ruo-gate .ruo-enter")) return;
    ev.preventDefault();
    ev.stopPropagation();
    setOk();
    document.removeEventListener("click", go, true);
  }
  document.addEventListener("click", go, true);
})();`;

function enterCatalog() {
  try {
    sessionStorage.setItem("vs-age-accepted", "1");
  } catch {
    // The in-memory/data-attribute path still keeps navigation unblocked when
    // storage is unavailable (for example, restrictive private browsing).
  }
  document.documentElement.setAttribute("data-gate", "ok");
  const w = document.getElementById("ruo-wrapper");
  if (w) w.removeAttribute("inert");
  window.dispatchEvent(new Event("vs:age-accepted"));
}

function declineCatalog() {
  window.location.href = "https://www.google.com";
}

export function AgeGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The initial state must be identical on the server and the client, so it
  // is derived from the route alone. Reading `data-gate` here made hydration
  // render `inert={false}` against server HTML that had `inert=""`; React does
  // not patch attribute mismatches, so a reloaded, already-accepted page kept
  // the whole storefront inert. Acceptance is applied in the mount effect
  // below instead, where React owns the re-render; the boot script's
  // `data-gate="ok"` keeps the dialog hidden via CSS in the meantime.
  const [isOpen, setIsOpen] = useState(() => {
    const isAuth = pathname.startsWith("/login") || pathname.startsWith("/admin") || pathname.startsWith("/account");
    return !isAuth;
  });
  const accepted = useRef(false);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    const onAccepted = () => {
      accepted.current = true;
      setIsOpen(false);
    };
    window.addEventListener("vs:age-accepted", onAccepted);
    const checkGate = () => {
        let acceptedThisVisit = false;
        try {
          acceptedThisVisit = sessionStorage.getItem("vs-age-accepted") === "1";
        } catch {
          // Fall through to the synchronized in-memory/data-attribute state.
        }
        if (
          accepted.current ||
          acceptedThisVisit ||
          document.documentElement.getAttribute("data-gate") === "ok"
        ) {
          accepted.current = true;
          if (acceptedThisVisit) {
            try {
              sessionStorage.setItem("vs-age-accepted", "1");
            } catch {
              // No-op: acceptance is retained in memory for this mounted visit.
            }
          }
          document.documentElement.setAttribute("data-gate", "ok");
          setIsOpen(false);
          return;
        }

        const isAuth =
          pathname.startsWith("/login") ||
          pathname.startsWith("/admin") ||
          pathname.startsWith("/account");

        if (isAuth) {
          document.documentElement.setAttribute("data-gate", "exempt");
          setIsOpen(false);
        } else {
          document.documentElement.removeAttribute("data-gate");
          setIsOpen(true);

          if (!prevFocusRef.current && document.activeElement !== document.body) {
            prevFocusRef.current = document.activeElement as HTMLElement;
          }
          
          const enterBtn = document.getElementById("ruo-enter");
          if (enterBtn) {
            focusTimer = setTimeout(() => {
              enterBtn.focus();
            }, 100);
          }
        }
    };
    checkGate();
    return () => {
      window.removeEventListener("vs:age-accepted", onAccepted);
      if (focusTimer) clearTimeout(focusTimer);
      document.getElementById("ruo-wrapper")?.removeAttribute("inert");
    };
  }, [pathname]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const gate = document.getElementById("ruo-gate");
        if (!gate) return;
        
        const focusable = gate.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus restore and scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (prevFocusRef.current) {
        const timer = setTimeout(() => {
          if (prevFocusRef.current && document.body.contains(prevFocusRef.current)) {
            prevFocusRef.current.focus();
          }
          prevFocusRef.current = null;
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  return (
    <>
      <div id="ruo-wrapper" className="min-w-0 max-w-full overflow-x-clip" inert={isOpen}>
        {children}
      </div>
      {isOpen ? <div
        id="ruo-gate"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ruo-title"
        className="ruo-gate"
      >
        <div className="ruo-gate-inner">
          <img
            src="/brand/logo-64.png"
            alt=""
            className="h-14 w-14 object-contain"
            width={56}
            height={56}
          />
          <p className="mt-5 font-mono text-xs tracking-widest text-primary uppercase">
            Restricted catalog
          </p>
          <h2
            id="ruo-title"
            className="font-display mt-2 text-center text-3xl font-semibold tracking-wide uppercase sm:text-4xl"
          >
            Research use only
          </h2>
          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <button type="button" id="ruo-decline" className="ruo-decline btn-secondary flex-1" onClick={declineCatalog}>
              I am under 18
            </button>
            <button type="button" id="ruo-enter" className="ruo-enter btn-primary flex-1" onClick={enterCatalog}>
              I am 18+ · Enter
            </button>
          </div>
          <p className="mt-8 max-w-sm text-center text-sm leading-relaxed text-muted">{RUO_SHORT}</p>
          <p className="mt-4 max-w-sm text-center text-xs leading-relaxed text-faint">
            You must be 18 or older. Entering confirms you are a qualified researcher buying solely
            for laboratory work — not for human or animal use.
          </p>
        </div>
      </div> : null}
    </>
  );
}
