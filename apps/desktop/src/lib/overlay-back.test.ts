import { describe, expect, it, beforeEach } from "vitest";
import {
  closeTopOverlay,
  overlayStackSize,
  pushOverlayCloser,
  resetOverlayStack,
} from "./overlay-back";

describe("overlay-back", () => {
  beforeEach(() => resetOverlayStack());

  it("closes the most recently registered overlay first", () => {
    const order: string[] = [];
    const unsubA = pushOverlayCloser(() => {
      order.push("a");
      return true;
    });
    pushOverlayCloser(() => {
      order.push("b");
      return true;
    });
    expect(closeTopOverlay()).toBe(true);
    expect(order).toEqual(["b"]);
    expect(overlayStackSize()).toBe(2);
    unsubA();
    expect(overlayStackSize()).toBe(1);
  });

  it("skips closers that return false", () => {
    pushOverlayCloser(() => false);
    const unsub = pushOverlayCloser(() => true);
    expect(closeTopOverlay()).toBe(true);
    unsub();
    expect(closeTopOverlay()).toBe(false);
  });
});
