import { describe, expect, it } from "vitest";
import { buildReturnReceiptTextLines } from "./return-thermal";
import type { Order, ReturnRecord } from "../types";

describe("buildReturnReceiptTextLines", () => {
  it("includes return number and refund total", () => {
    const order: Order = {
      id: "o1",
      order_number: "ORD-1",
      type: "pos_walk_in",
      status: "completed",
      items: [{ product_id: "p1", name: "منتج", unit_price: 10, quantity: 2, unit_type: "pc" }],
      subtotal: 20,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 20,
      payment_method: "cash",
      created_at: "2026-01-01T12:00:00.000Z",
    };
    const record: ReturnRecord = {
      id: "r1",
      return_number: "RET-1",
      order_id: "o1",
      order_number: "ORD-1",
      refund_method: "cash",
      total_refund: 10,
      created_at: "2026-01-02T12:00:00.000Z",
      items: [
        {
          product_id: "p1",
          name: "منتج",
          quantity: 1,
          unit_refund: 10,
          restock: true,
          line_index: 0,
        },
      ],
    };
    const lines = buildReturnReceiptTextLines(record, order, {
      ...({} as import("../types").BranchSettings),
      name: "محل",
      currency_symbol: "د.ل",
      thermal_width_mm: 80,
    });
    expect(lines.some((l) => l.includes("RET-1"))).toBe(true);
    expect(lines.some((l) => l.includes("10.00"))).toBe(true);
  });
});
