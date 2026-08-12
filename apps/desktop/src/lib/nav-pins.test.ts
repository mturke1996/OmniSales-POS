import { describe, expect, it, beforeEach } from "vitest";
import {
  DEFAULT_PINS,
  isPinned,
  pushRecentTab,
  readCollapsedGroups,
  readPinnedTabs,
  readRecentTabs,
  toggleCollapsedGroup,
  togglePinnedTab,
} from "./nav-pins";

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

describe("nav pins", () => {
  it("defaults to POS, invoices, inventory", () => {
    expect(readPinnedTabs()).toEqual(DEFAULT_PINS);
  });

  it("toggles a pin on and off", () => {
    const added = togglePinnedTab("customers");
    expect(added).toContain("customers");
    expect(isPinned("customers", added)).toBe(true);
    const removed = togglePinnedTab("customers");
    expect(removed).not.toContain("customers");
  });

  it("caps pins at 5 and keeps the newest", () => {
    togglePinnedTab("customers");
    togglePinnedTab("returns");
    togglePinnedTab("expenses");
    const pins = readPinnedTabs();
    expect(pins).toHaveLength(5);
    expect(pins).toEqual(["invoices", "inventory", "customers", "returns", "expenses"]);
  });
});

describe("recent tabs", () => {
  it("records visits and excludes current", () => {
    pushRecentTab("pos");
    pushRecentTab("invoices");
    pushRecentTab("inventory");
    const recent = readRecentTabs("inventory");
    expect(recent[0]).toBe("invoices");
    expect(recent).not.toContain("inventory");
  });
});

describe("collapsed groups", () => {
  it("toggles group collapse", () => {
    expect(readCollapsedGroups()).toEqual([]);
    expect(toggleCollapsedGroup("المبيعات")).toEqual(["المبيعات"]);
    expect(toggleCollapsedGroup("المبيعات")).toEqual([]);
  });
});
