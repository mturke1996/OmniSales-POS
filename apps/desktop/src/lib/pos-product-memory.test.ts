import { describe, expect, it, beforeEach } from "vitest";
import {
  getPinnedProductIds,
  getRecentProductIds,
  getDisplayPinnedProductIds,
  togglePinnedProductId,
  recordRecentProductId,
  resolveProductsByIds,
} from "./pos-product-memory";

function mockStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
}

describe("pos-product-memory", () => {
  beforeEach(() => {
    mockStorage();
    localStorage.clear();
  });

  it("pins and unpins products manually", () => {
    expect(getPinnedProductIds()).toEqual([]);
    togglePinnedProductId("p1");
    expect(getPinnedProductIds()).toEqual(["p1"]);
    expect(getDisplayPinnedProductIds()).toEqual(["p1"]);
    togglePinnedProductId("p1");
    expect(getPinnedProductIds()).toEqual([]);
  });

  it("records recents with newest first", () => {
    recordRecentProductId("a");
    recordRecentProductId("b");
    recordRecentProductId("a");
    expect(getRecentProductIds()).toEqual(["a", "b"]);
  });

  it("resolves products by id order", () => {
    const all = [{ id: "x" }, { id: "y" }];
    expect(resolveProductsByIds(all, ["y", "missing", "x"])).toEqual([{ id: "y" }, { id: "x" }]);
  });
});
