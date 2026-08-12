import { describe, expect, it } from "vitest";
import {
  extractRecordId,
  isOwnEcho,
  liveEventLabel,
  liveStatusLabel,
  liveTableLabel,
  payloadId,
  pruneStalePeers,
  rememberOwnId,
} from "./live-sync-core";

describe("liveTableLabel", () => {
  it("maps POS tables to Arabic", () => {
    expect(liveTableLabel("orders")).toBe("فاتورة");
    expect(liveTableLabel("stock_movements")).toBe("حركة مخزون");
  });
});

describe("liveEventLabel", () => {
  it("includes document number when present", () => {
    expect(
      liveEventLabel("orders", "INSERT", { id: "1", order_number: "INV-9" })
    ).toContain("INV-9");
    expect(liveEventLabel("products", "UPDATE", { name: "زيت" })).toContain("زيت");
  });
});

describe("echo suppression", () => {
  it("remembers flushed ids and skips own echoes", () => {
    const ids = new Set<string>();
    rememberOwnId(ids, "abc");
    expect(isOwnEcho("abc", ids)).toBe(true);
    expect(isOwnEcho("zzz", ids)).toBe(false);
    expect(isOwnEcho(null, ids)).toBe(false);
  });

  it("caps remembered ids", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 90; i++) rememberOwnId(ids, `id-${i}`, 80);
    expect(ids.size).toBeLessThanOrEqual(80);
  });
});

describe("payload helpers", () => {
  it("extracts ids", () => {
    expect(extractRecordId({ id: "x" })).toBe("x");
    expect(payloadId({ id: "y" })).toBe("y");
    expect(payloadId({})).toBeNull();
  });
});

describe("pruneStalePeers", () => {
  it("drops peers older than max age", () => {
    const now = Date.parse("2026-08-12T12:00:00Z");
    const peers = pruneStalePeers(
      [
        { lastSeen: "2026-08-12T11:59:30Z" },
        { lastSeen: "2026-08-12T11:50:00Z" },
      ],
      now,
      60_000
    );
    expect(peers).toHaveLength(1);
  });
});

describe("liveStatusLabel", () => {
  it("labels live", () => {
    expect(liveStatusLabel("live")).toBe("مباشر");
    expect(liveStatusLabel("disabled")).toBe("محلي");
  });
});
