/** Hardware-scanner debounce + audio/haptic feedback for POS scans. */

let lastScanAt = 0;
let lastScanCode = "";

const DEFAULT_GAP_MS = 450;

/** Returns false if this scan should be ignored as a duplicate burst. */
export function acceptScan(
  code: string,
  gapMs = DEFAULT_GAP_MS
): boolean {
  const now = Date.now();
  const normalized = code.trim();
  if (!normalized) return false;
  if (
    normalized === lastScanCode &&
    now - lastScanAt < gapMs
  ) {
    return false;
  }
  lastScanCode = normalized;
  lastScanAt = now;
  return true;
}

export function resetScanGuard() {
  lastScanAt = 0;
  lastScanCode = "";
}

export function playScanBeep(ok = true) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.stop(ctx.currentTime + 0.13);
    window.setTimeout(() => void ctx.close(), 200);
  } catch {
    /* ignore audio failures */
  }
}

export function vibrateScan(ok = true) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(ok ? [18] : [40, 30, 40]);
    }
  } catch {
    /* ignore */
  }
}

export function feedbackScan(ok = true) {
  playScanBeep(ok);
  vibrateScan(ok);
}
