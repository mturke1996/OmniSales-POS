import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);

  return matches;
}

/** Viewports where desktop sidebar is hidden (< lg). */
export function usePhoneLayout() {
  return useMediaQuery("(max-width: 1023px)");
}

/** iPad / tablet width in portrait — split products + cart. */
export function useTabletPosSplit() {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

/** Phone rotated — split products + cart like a mini register. */
export function useLandscapePosSplit() {
  return useMediaQuery(
    "(orientation: landscape) and (max-width: 1023px) and (min-width: 640px)"
  );
}

/** Tablet or landscape phone: side-by-side POS instead of tabs. */
export function usePosSplitLayout() {
  const tablet = useTabletPosSplit();
  const landscape = useLandscapePosSplit();
  return tablet || landscape;
}
