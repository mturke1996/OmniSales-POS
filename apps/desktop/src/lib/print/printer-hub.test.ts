import { describe, expect, it, vi, beforeEach } from "vitest";

function mockStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
    configurable: true,
  });
}

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));

describe("printer-hub", () => {
  beforeEach(() => {
    mockStorage();
    vi.resetModules();
  });

  it("reports disconnected unified state on web", async () => {
    const { getUnifiedPrinterState } = await import("./printer-hub");
    const state = getUnifiedPrinterState();
    expect(state.connected).toBe(false);
    expect(state.transport).toBeNull();
  });
});
