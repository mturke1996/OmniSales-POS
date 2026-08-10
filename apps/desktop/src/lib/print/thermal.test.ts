import { describe, expect, it } from "vitest";
import { resolveOrderChangeDue } from "./thermal";
import type { Order } from "../types";

const baseOrder = {
  id: "1",
  order_number: "ORD-1",
  type: "pos_walk_in" as const,
  status: "completed" as const,
  items: [],
  subtotal: 100,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 100,
  payment_method: "cash" as const,
  created_at: new Date().toISOString(),
};

describe("resolveOrderChangeDue", () => {
  it("prefers explicit override", () => {
    const order: Order = { ...baseOrder, change_due: 5 };
    expect(resolveOrderChangeDue(order, 12)).toBe(12);
  });

  it("falls back to persisted order.change_due", () => {
    const order: Order = { ...baseOrder, change_due: 7.5 };
    expect(resolveOrderChangeDue(order)).toBe(7.5);
  });

  it("returns zero when neither is set", () => {
    expect(resolveOrderChangeDue(baseOrder)).toBe(0);
  });
});
