import { describe, expect, it } from "vitest";
import { applyBestPromotion, calcTotals } from "./offline-store";
import type { CartLine, Promotion } from "./types";

const lines: CartLine[] = [
  {
    product_id: "p1",
    name: "اختبار",
    unit_price: 10,
    quantity: 3,
    unit_type: "piece",
  },
];

describe("calcTotals", () => {
  it("computes subtotal discount tax total", () => {
    const t = calcTotals(lines, 5, 0.1);
    expect(t.subtotal).toBe(30);
    expect(t.discount).toBe(5);
    expect(t.tax).toBeCloseTo(2.5, 5);
    expect(t.total).toBeCloseTo(27.5, 5);
  });

  it("clamps discount to subtotal", () => {
    const t = calcTotals(lines, 999, 0);
    expect(t.discount).toBe(30);
    expect(t.total).toBe(0);
  });
});

describe("applyBestPromotion", () => {
  const promos: Promotion[] = [
    {
      id: "a",
      name: "10%",
      kind: "percent",
      value: 10,
      active: true,
      created_at: "2026-01-01",
    },
    {
      id: "b",
      name: "fixed 8",
      kind: "fixed",
      value: 8,
      active: true,
      created_at: "2026-01-01",
    },
  ];

  it("picks highest absolute discount", () => {
    const best = applyBestPromotion(100, promos);
    expect(best?.promotion.id).toBe("a");
    expect(best?.amount).toBe(10);
  });

  it("respects min_subtotal", () => {
    const gated: Promotion[] = [
      {
        id: "c",
        name: "big",
        kind: "fixed",
        value: 50,
        active: true,
        min_subtotal: 200,
        created_at: "2026-01-01",
      },
    ];
    expect(applyBestPromotion(100, gated)).toBeNull();
  });
});
