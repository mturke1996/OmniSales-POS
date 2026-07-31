/** Resolve CSS RGB token "r g b" → hex-ish rgb() for Recharts. */
export function cssRgb(varName: string, alpha = 1): string {
  if (typeof window === "undefined") {
    return alpha < 1 ? `rgba(99,102,241,${alpha})` : "rgb(99,102,241)";
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) {
    return alpha < 1 ? `rgba(99,102,241,${alpha})` : "rgb(99,102,241)";
  }
  const [r, g, b] = raw.split(/\s+/).map(Number);
  if (alpha < 1) return `rgba(${r},${g},${b},${alpha})`;
  return `rgb(${r},${g},${b})`;
}

export function chartPalette() {
  return {
    highlight: cssRgb("--highlight"),
    success: cssRgb("--success"),
    danger: cssRgb("--danger"),
    warning: cssRgb("--warning"),
    info: cssRgb("--info"),
    ink: cssRgb("--ink"),
    mute: cssRgb("--ink-mute"),
    line: cssRgb("--paper-line"),
    paper: cssRgb("--paper-raised"),
    softFill: cssRgb("--highlight", 0.18),
  };
}
