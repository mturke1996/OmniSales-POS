/** Idle auto-lock — pure helpers so cashiers cannot leave a register unlocked. */

export function idleLockDue(
  lastActivityMs: number,
  minutes: number,
  now = Date.now(),
): boolean {
  if (!Number.isFinite(minutes) || minutes <= 0) return false;
  return now - lastActivityMs >= minutes * 60_000;
}

export function idleLockRemainingMs(
  lastActivityMs: number,
  minutes: number,
  now = Date.now(),
): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, minutes * 60_000 - (now - lastActivityMs));
}

/** Lock sooner when the register tab is hidden — cap at 2 minutes. */
export function hiddenTabLockDelayMs(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.min(minutes, 2) * 60_000;
}
