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

describe("analytics tax and profit", () => {
  it("computes taxCollected and netProfit", async () => {
    const { computeAnalytics } = await import("./analytics");
    const snap = computeAnalytics({
      period: "30d",
      products: [
        {
          id: "p1",
          branch_id: "b1",
          category_id: "c1",
          sku: "S1",
          barcode: "B1",
          name: "منتج",
          cost_price: 40,
          retail_price: 100,
          wholesale_price: 80,
          unit_type: "piece",
          track_stock: true,
          stock_quantity: 10,
          min_stock: 2,
          is_active: true,
        },
      ],
      customers: [],
      expenses: [
        {
          id: "e1",
          category: "إيجار",
          amount: 20,
          note: "اختبار",
          created_at: new Date().toISOString(),
        },
      ],
      returns: [],
      orders: [
        {
          id: "o1",
          order_number: "ORD-1",
          type: "pos_walk_in",
          status: "completed",
          items: [
            {
              product_id: "p1",
              name: "منتج",
              unit_price: 100,
              quantity: 1,
              unit_type: "piece",
            },
          ],
          subtotal: 100,
          discount_amount: 0,
          tax_amount: 14,
          total_amount: 114,
          payment_method: "cash",
          created_at: new Date().toISOString(),
        },
      ],
    });
    expect(snap.taxCollected).toBe(14);
    // margin ≈ 114 - 40 = 74; net profit 74 - 20 = 54
    expect(snap.estimatedMargin).toBeCloseTo(74, 5);
    expect(snap.netProfit).toBeCloseTo(54, 5);
  });
});
