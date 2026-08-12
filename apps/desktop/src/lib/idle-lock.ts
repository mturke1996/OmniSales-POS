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
