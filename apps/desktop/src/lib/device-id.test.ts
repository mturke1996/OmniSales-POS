import { describe, expect, it, beforeEach } from "vitest";
import { getDeviceId } from "./device-id";

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
      removeItem: (k: string) => {
        memory.delete(k);
      },
      clear: () => memory.clear(),
    },
  });
});

describe("getDeviceId", () => {
  it("creates a stable id", () => {
    const first = getDeviceId();
    const second = getDeviceId();
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(8);
  });
});
