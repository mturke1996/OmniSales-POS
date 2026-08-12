import { describe, expect, it } from "vitest";
import { formatShiftElapsed, nextNavNudge, type NavSignals } from "./nav-nudge";

const clear: NavSignals = {
  heldCarts: 0,
  deliveryOpen: 0,
  lowStock: 0,
  pendingSync: 0,
  shiftOpen: true,
};

describe("nextNavNudge", () => {
  it("asks to open a shift first", () => {
    const nudge = nextNavNudge({ ...clear, shiftOpen: false, lowStock: 3 }, "dashboard");
    expect(nudge?.tab).toBe("shifts");
  });

  it("skips the screen the cashier is already on", () => {
    const nudge = nextNavNudge({ ...clear, heldCarts: 2, deliveryOpen: 1 }, "pos");
    expect(nudge?.tab).toBe("orders");
  });

  it("returns null when nothing needs attention", () => {
    expect(nextNavNudge(clear, "dashboard")).toBeNull();
  });
});

describe("formatShiftElapsed", () => {
  it("formats minutes, hours, and days", () => {
    const t = Date.parse("2026-08-12T10:00:00.000Z");
    expect(formatShiftElapsed("2026-08-12T09:47:00.000Z", t)).toBe("13د");
    expect(formatShiftElapsed("2026-08-12T07:10:00.000Z", t)).toBe("2س 50د");
    expect(formatShiftElapsed("2026-08-10T10:00:00.000Z", t)).toBe("2ي 0س");
  });
});
