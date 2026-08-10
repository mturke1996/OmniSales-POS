import { useEffect } from "react";

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

/**
 * iOS standalone PWA: prefer `window.innerHeight` + fixed inset layout.
 * In browser, sync `--app-height` from visualViewport when the URL bar shifts.
 */
export function initViewportHeight() {
  if (typeof window === "undefined") return () => {};

  const set = () => {
    const standalone = isStandalonePwa();
    const root = document.documentElement;

    root.classList.toggle("pwa-standalone", standalone);

    const height = standalone
      ? window.innerHeight
      : Math.round(window.visualViewport?.height ?? window.innerHeight);

    root.style.setProperty("--app-height", `${height}px`);
    root.style.setProperty(
      "--safe-top",
      getComputedStyle(root).getPropertyValue("env(safe-area-inset-top)") || "0px"
    );
    root.style.setProperty(
      "--safe-bottom",
      getComputedStyle(root).getPropertyValue("env(safe-area-inset-bottom)") || "0px"
    );
  };

  set();

  window.addEventListener("resize", set);
  window.addEventListener("orientationchange", () => {
    set();
    window.setTimeout(set, 120);
    window.setTimeout(set, 400);
  });
  window.addEventListener("pageshow", set);

  const vv = window.visualViewport;
  if (vv && !isStandalonePwa()) {
    vv.addEventListener("resize", set);
  }

  return () => {
    window.removeEventListener("resize", set);
    window.removeEventListener("orientationchange", set);
    window.removeEventListener("pageshow", set);
    vv?.removeEventListener("resize", set);
  };
}

export function useViewportHeight() {
  useEffect(() => initViewportHeight(), []);
}
