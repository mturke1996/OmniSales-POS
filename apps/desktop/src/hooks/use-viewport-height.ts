import { useEffect } from "react";

/**
 * iOS Safari / standalone PWA: `100dvh` and `-webkit-fill-available` alone
 * still leave gaps when the URL bar or home indicator shifts. Sync a stable
 * `--app-height` on the document root from `visualViewport` when available.
 */
export function initViewportHeight() {
  if (typeof window === "undefined") return () => {};

  const set = () => {
    const h = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty("--app-height", `${Math.round(h)}px`);
  };

  set();
  window.addEventListener("resize", set);
  window.addEventListener("orientationchange", set);
  window.visualViewport?.addEventListener("resize", set);
  window.visualViewport?.addEventListener("scroll", set);

  return () => {
    window.removeEventListener("resize", set);
    window.removeEventListener("orientationchange", set);
    window.visualViewport?.removeEventListener("resize", set);
    window.visualViewport?.removeEventListener("scroll", set);
  };
}

export function useViewportHeight() {
  useEffect(() => initViewportHeight(), []);
}
