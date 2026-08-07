import { afterEach, describe, expect, it, vi } from "vitest";
import { acceptScan, resetScanGuard } from "./scan-feedback";

describe("acceptScan", () => {
  afterEach(() => {
    resetScanGuard();
    vi.useRealTimers();
  });

  it("accepts first scan", () => {
    expect(acceptScan("6291001001")).toBe(true);
  });

  it("rejects duplicate burst within gap", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    expect(acceptScan("6291001001")).toBe(true);
    vi.setSystemTime(1_200);
    expect(acceptScan("6291001001")).toBe(false);
  });

  it("accepts same code after gap", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    expect(acceptScan("6291001001")).toBe(true);
    vi.setSystemTime(1_600);
    expect(acceptScan("6291001001")).toBe(true);
  });

  it("accepts different code immediately", () => {
    expect(acceptScan("AAA")).toBe(true);
    expect(acceptScan("BBB")).toBe(true);
  });

  it("rejects blank", () => {
    expect(acceptScan("   ")).toBe(false);
  });
});
