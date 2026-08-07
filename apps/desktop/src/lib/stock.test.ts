import { describe, expect, it } from "vitest";
import {
  assertStockAvailable,
  cartDemandByProduct,
  findStockIssues,
} from "./stock";
import type { CartLine, Product } from "./types";

const product = (partial: Partial<Product> & Pick<Product, "id" | "name">): Product => ({
  branch_id: "b1",
  category_id: "c1",
  sku: "S",
  barcode: "1",
  cost_price: 1,
  retail_price: 2,
  wholesale_price: 1.5,
  unit_type: "piece",
  track_stock: true,
  stock_quantity: 5,
  min_stock: 1,
  is_active: true,
  ...partial,
});

describe("stock guards", () => {
  it("aggregates cart demand", () => {
    const lines: CartLine[] = [
      {
        product_id: "a",
        name: "A",
        unit_price: 1,
        quantity: 2,
        unit_type: "piece",
      },
      {
        product_id: "a",
        name: "A",
        unit_price: 1,
        quantity: 3,
        unit_type: "piece",
      },
    ];
    expect(cartDemandByProduct(lines).get("a")).toBe(5);
  });

  it("flags oversell", () => {
    const lines: CartLine[] = [
      {
        product_id: "a",
        name: "A",
        unit_price: 1,
        quantity: 6,
        unit_type: "piece",
      },
    ];
    const issues = findStockIssues(lines, [product({ id: "a", name: "A", stock_quantity: 5 })]);
    expect(issues).toHaveLength(1);
    expect(() =>
      assertStockAvailable(lines, [product({ id: "a", name: "A", stock_quantity: 5 })])
    ).toThrow(/مخزون/);
  });

  it("ignores untracked products", () => {
    const lines: CartLine[] = [
      {
        product_id: "a",
        name: "A",
        unit_price: 1,
        quantity: 100,
        unit_type: "piece",
      },
    ];
    expect(
      findStockIssues(lines, [
        product({ id: "a", name: "A", track_stock: false, stock_quantity: 0 }),
      ])
    ).toHaveLength(0);
  });
});
