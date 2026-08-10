import { useEffect } from "react";

/**
 * iOS Safari / standalone PWA: `100dvh` alone still leaves gaps when the
 * URL bar or home indicator shifts. Sync `--app-height` from visualViewport.
 */
export function initViewportHeight() {
  if (typeof window === "undefined") return () => {};

  const set = () => {
    const h = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty("--app-height", `${Math.round(h)}px`);
  };

  set();
  window.addEventListener("resize", set);
  window.addEventListener("orientationchange", () => {
    set();
    window.setTimeout(set, 120);
    window.setTimeout(set, 400);
  });
  window.addEventListener("pageshow", set);
  window.visualViewport?.addEventListener("resize", set);
  window.visualViewport?.addEventListener("scroll", set);

  return () => {
    window.removeEventListener("resize", set);
    window.removeEventListener("orientationchange", set);
    window.removeEventListener("pageshow", set);
    window.visualViewport?.removeEventListener("resize", set);
    window.visualViewport?.removeEventListener("scroll", set);
  };
}

export function useViewportHeight() {
  useEffect(() => initViewportHeight(), []);
}
