import { describe, expect, it } from "vitest";
import { bytesToBase64 } from "./network-printer";

describe("network-printer", () => {
  it("encodes bytes to base64 for TCP send", () => {
    const bytes = new Uint8Array([0x1b, 0x40, 0x0a]);
    expect(bytesToBase64(bytes)).toBe("G0AK");
  });
});
