import { describe, expect, it } from "vitest";
import { unitNetRefundFromParts } from "./returns-math";
import type { CartLine } from "./types";

describe("unitNetRefundFromParts", () => {
  it("distributes discount and tax across lines", () => {
    const lines: CartLine[] = [
      {
        product_id: "a",
        name: "A",
        unit_price: 100,
        quantity: 1,
        unit_type: "piece",
      },
      {
        product_id: "b",
        name: "B",
        unit_price: 100,
        quantity: 1,
        unit_type: "piece",
      },
    ];
    // 10% discount on 200 = 20; tax 10 on taxable 180 → tax 18 → total 198
    const a = unitNetRefundFromParts(lines[0], lines, 20, 18, 0, 198);
    const b = unitNetRefundFromParts(lines[1], lines, 20, 18, 0, 198);
    expect(a).toBeCloseTo(99, 5);
    expect(b).toBeCloseTo(99, 5);
    expect(a + b).toBeCloseTo(198, 5);
  });

  it("does not refund more than list when no discount/tax", () => {
    const line: CartLine = {
      product_id: "a",
      name: "A",
      unit_price: 75,
      quantity: 2,
      unit_type: "piece",
    };
    expect(unitNetRefundFromParts(line, [line], 0, 0, 5, 155)).toBe(75);
  });
});
