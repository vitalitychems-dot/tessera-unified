import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { RUO_SHORT } from "@/lib/legal";

export const GATE_KEY = "vs-age-accepted";

let acceptedThisTab = false;

function markAccepted() {
  acceptedThisTab = true;
  try {
    sessionStorage.setItem(GATE_KEY, "1");
  } catch {
    /* ignore */
  }
  document.documentElement.setAttribute("data-gate", "ok");
  document.body.style.overflow = "";
}

/** Runs in <head> before paint so the entry screen is instant and clickable. */
export const GATE_BOOT = `(function(){
  var storageKey=${JSON.stringify(GATE_KEY)};
  function setOk(){
    try { sessionStorage.setItem(storageKey,"1"); } catch(e) {}
    document.documentElement.setAttribute("data-gate","ok");
    document.body.style.overflow = "";
    window.dispatchEvent(new Event("vs:age-accepted"));
    setTimeout(function(){ window.dispatchEvent(new Event("vs:open-welcome")); }, 700);
  }
  function reject(){ window.location.href = "https://www.google.com"; }
  try {
    var p=location.pathname||"";
    var isAuth = p.indexOf("/login")===0||p.indexOf("/admin")===0||p.indexOf("/account")===0;
    var accepted = sessionStorage.getItem(storageKey)==="1";
    if (accepted) document.documentElement.setAttribute("data-gate","ok");
    else if (isAuth) document.documentElement.setAttribute("data-gate","exempt");
  } catch(e) {}
  function node(ev){
    var t=ev.target;
    if(t && t.nodeType===3) t=t.parentNode;
    return t && t.closest ? t : null;
  }
  function go(ev){
    var t=node(ev);
    if(!t) return;
    if(t.closest("#ruo-decline")) { ev.preventDefault(); ev.stopPropagation(); reject(); return; }
    if(!t.closest("#ruo-enter")) return;
    ev.preventDefault();
    ev.stopPropagation();
    setOk();
    document.removeEventListener("click", go, true);
  }
  document.addEventListener("click", go, true);
})();`;

function enterCatalog() {
  markAccepted();
  window.dispatchEvent(new Event("vs:age-accepted"));
  window.setTimeout(() => window.dispatchEvent(new Event("vs:open-welcome")), 700);
}

function declineCatalog() {
  window.location.href = "https://www.google.com";
}

export function AgeGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isOpen, setIsOpen] = useState(true);
  const accepted = useRef(false);

  useEffect(() => {
    const onAccepted = () => {
      acceptedThisTab = true;
      accepted.current = true;
      document.documentElement.setAttribute("data-gate", "ok");
      document.body.style.overflow = "";
      setIsOpen(false);
    };
    window.addEventListener("vs:age-accepted", onAccepted);
    let stored = acceptedThisTab;
    try {
      stored = stored || sessionStorage.getItem(GATE_KEY) === "1";
    } catch {
      /* ignore */
    }
    const isAuth =
      pathname.startsWith("/login") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/account");
    if (
      accepted.current ||
      acceptedThisTab ||
      stored ||
      document.documentElement.getAttribute("data-gate") === "ok"
    ) {
      accepted.current = true;
      acceptedThisTab = true;
      document.documentElement.setAttribute("data-gate", "ok");
      document.body.style.overflow = "";
      setIsOpen(false);
    } else if (isAuth) {
      document.documentElement.setAttribute("data-gate", "exempt");
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
    return () => window.removeEventListener("vs:age-accepted", onAccepted);
  }, [pathname]);

  return (
    <>
      {children}
      {isOpen ? (
        <div
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
            <h1
              id="ruo-title"
              className="font-display mt-2 text-center text-3xl font-semibold tracking-wide uppercase sm:text-4xl"
            >
              Research use only
            </h1>
            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
              <button type="button" id="ruo-decline" className="ruo-decline" onClick={declineCatalog}>
                I am under 21
              </button>
              <button type="button" id="ruo-enter" className="ruo-enter" onClick={enterCatalog}>
                I am 21+ · Enter
              </button>
            </div>
            <p className="mt-8 max-w-sm text-center text-sm leading-relaxed text-muted">{RUO_SHORT}</p>
            <p className="mt-4 max-w-sm text-center text-xs leading-relaxed text-faint">
              You must be 21 or older. Entering confirms you are a qualified researcher buying solely
              for laboratory work — not for human or animal use.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
