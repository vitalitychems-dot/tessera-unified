import { useEffect, useRef } from "react";

export function useModal(open: boolean, onClose: () => void, containerId?: string) {
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    prevFocusRef.current = document.activeElement as HTMLElement;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === "Tab" && containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const focusable = Array.from(container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ));
        
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          } else if (!container.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    let focusTimer: number | undefined;
    if (containerId) {
      focusTimer = window.setTimeout(() => {
        const container = document.getElementById(containerId);
        if (container && !container.contains(document.activeElement)) {
            const focusable = Array.from(container.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            ));
            if (focusable.length > 0) {
                focusable[0].focus();
            } else {
                container.focus();
            }
        }
      }, 50);
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (focusTimer) window.clearTimeout(focusTimer);
      window.setTimeout(() => {
        if (prevFocusRef.current && document.body.contains(prevFocusRef.current)) {
          prevFocusRef.current.focus();
        }
      }, 50);
    };
  }, [open, containerId]);
}