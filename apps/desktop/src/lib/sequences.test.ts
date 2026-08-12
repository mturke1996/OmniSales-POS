import { describe, expect, it } from "vitest";
import { highestDocSequence } from "./sequences";

describe("highestDocSequence", () => {
  it("reads the trailing number across prefixes", () => {
    expect(highestDocSequence(["ORD-1001", "ORD-1007", "INV-3"])).toBe(1007);
    expect(highestDocSequence(["RET-12", null, "bad"])).toBe(12);
    expect(highestDocSequence([])).toBe(0);
  });
});
