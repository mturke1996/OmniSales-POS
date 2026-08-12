import { describe, expect, it } from "vitest";
import { hiddenTabLockDelayMs, idleLockDue, idleLockRemainingMs } from "./idle-lock";

describe("idleLockDue", () => {
  it("does not lock when minutes is 0", () => {
    expect(idleLockDue(0, 0, 60_000)).toBe(false);
  });

  it("locks after the idle window", () => {
    const start = Date.parse("2026-08-12T12:00:00.000Z");
    expect(idleLockDue(start, 5, start + 4 * 60_000)).toBe(false);
    expect(idleLockDue(start, 5, start + 5 * 60_000)).toBe(true);
  });
});

describe("idleLockRemainingMs", () => {
  it("counts down to zero", () => {
    const start = 1_000;
    expect(idleLockRemainingMs(start, 1, start + 40_000)).toBe(20_000);
    expect(idleLockRemainingMs(start, 1, start + 80_000)).toBe(0);
  });
});

describe("hiddenTabLockDelayMs", () => {
  it("caps a long idle window at two minutes", () => {
    expect(hiddenTabLockDelayMs(0)).toBe(0);
    expect(hiddenTabLockDelayMs(1)).toBe(60_000);
    expect(hiddenTabLockDelayMs(15)).toBe(120_000);
  });
});
