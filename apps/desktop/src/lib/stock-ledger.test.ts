import { describe, expect, it } from "vitest";
import {
  applyStockDelta,
  countDelta,
  mergeProductInventory,
} from "./stock-ledger";
import type { Product } from "./types";

const base = (partial: Partial<Product> = {}): Product => ({
  id: "p1",
  branch_id: "b1",
  category_id: "c1",
  sku: "S",
  barcode: "1",
  name: "صنف",
  cost_price: 1,
  retail_price: 2,
  wholesale_price: 1.5,
  unit_type: "piece",
  track_stock: true,
  stock_quantity: 10,
  min_stock: 2,
  is_active: true,
  stock_version: 3,
  updated_at: "2026-01-01T00:00:00.000Z",
  ...partial,
});

describe("applyStockDelta", () => {
  it("decrements on sale and bumps version", () => {
    const { product, movement } = applyStockDelta({
      product: base(),
      delta: -3,
      reason: "sale",
      branch_id: "b1",
      reference_type: "order",
      reference_id: "o1",
    });
    expect(product.stock_quantity).toBe(7);
    expect(product.stock_version).toBe(4);
    expect(movement.qty_before).toBe(10);
    expect(movement.qty_after).toBe(7);
    expect(movement.delta).toBe(-3);
  });

  it("blocks negative stock", () => {
    expect(() =>
      applyStockDelta({
        product: base({ stock_quantity: 2 }),
        delta: -5,
        reason: "sale",
        branch_id: "b1",
      })
    ).toThrow(/مخزون/);
  });
});

describe("countDelta", () => {
  it("computes counted - system", () => {
    expect(countDelta(10, 8)).toBe(-2);
    expect(countDelta(10, 12.5)).toBe(2.5);
  });
});

describe("mergeProductInventory", () => {
  it("prefers higher stock_version for qty", () => {
    const local = base({
      stock_quantity: 9,
      stock_version: 5,
      name: "محلي",
      updated_at: "2026-02-01T00:00:00.000Z",
    });
    const remote = base({
      stock_quantity: 4,
      stock_version: 4,
      name: "سحابي",
      updated_at: "2026-03-01T00:00:00.000Z",
    });
    const merged = mergeProductInventory(local, remote);
    expect(merged.stock_quantity).toBe(9);
    expect(merged.stock_version).toBe(5);
    // catalog field from newer updated_at (remote)
    expect(merged.name).toBe("سحابي");
  });

  it("takes remote qty when remote version is ahead", () => {
    const local = base({ stock_quantity: 9, stock_version: 2 });
    const remote = base({ stock_quantity: 4, stock_version: 6 });
    const merged = mergeProductInventory(local, remote);
    expect(merged.stock_quantity).toBe(4);
    expect(merged.stock_version).toBe(6);
  });

  it("prefers the lower qty when versions tie (anti-oversell)", () => {
    const local = base({ stock_quantity: 8, stock_version: 3 });
    const remote = base({ stock_quantity: 5, stock_version: 3 });
    expect(mergeProductInventory(local, remote).stock_quantity).toBe(5);
  });
});
