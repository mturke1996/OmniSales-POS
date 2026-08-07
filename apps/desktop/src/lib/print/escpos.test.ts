import { describe, expect, it } from "vitest";
import {
  canUseWebSerial,
  concatBytes,
  escAlign,
  escCut,
  escInit,
  serialSupportMessage,
} from "./escpos";

describe("escpos primitives", () => {
  it("emits ESC @ init", () => {
    expect([...escInit()]).toEqual([0x1b, 0x40]);
  });

  it("aligns center", () => {
    expect([...escAlign("center")]).toEqual([0x1b, 0x61, 1]);
  });

  it("concatenates buffers", () => {
    const out = concatBytes(escInit(), escCut());
    expect(out[0]).toBe(0x1b);
    expect(out.length).toBe(escInit().length + escCut().length);
  });

  it("exposes serial support helpers", () => {
    expect(typeof canUseWebSerial()).toBe("boolean");
    expect(serialSupportMessage().length).toBeGreaterThan(0);
  });
});
