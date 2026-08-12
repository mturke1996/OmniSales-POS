import { describe, expect, it, afterEach } from "vitest";
import { notifyOutboxQueued, setOutboxFlushHandler } from "./sync-bus";

afterEach(() => {
  setOutboxFlushHandler(null);
});

describe("sync-bus", () => {
  it("notifies the registered flush handler", () => {
    let calls = 0;
    setOutboxFlushHandler(() => {
      calls += 1;
    });
    notifyOutboxQueued();
    notifyOutboxQueued();
    expect(calls).toBe(2);
  });

  it("is a no-op without a handler", () => {
    expect(() => notifyOutboxQueued()).not.toThrow();
  });
});
