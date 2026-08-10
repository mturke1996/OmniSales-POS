import { describe, expect, it } from "vitest";
import { topSellerProductIds } from "./pos-top-sellers";
import type { Order, Product } from "./types";

function product(id: string, name: string, price: number): Product {
  return {
    id,
    branch_id: "b1",
    category_id: "c1",
    sku: id,
    barcode: id,
    name,
    cost_price: price * 0.5,
    retail_price: price,
    wholesale_price: price * 0.8,
    unit_type: "piece",
    track_stock: true,
    stock_quantity: 100,
    min_stock: 0,
    is_active: true,
  };
}

const products = [product("p-a", "A", 10), product("p-b", "B", 20)];

function order(productId: string, qty: number, unitPrice: number): Order {
  return {
    id: `o-${productId}-${qty}`,
    order_number: `INV-${productId}`,
    type: "pos_walk_in",
    status: "completed",
    items: [
      {
        product_id: productId,
        name: productId,
        quantity: qty,
        unit_price: unitPrice,
        unit_type: "piece",
      },
    ],
    subtotal: unitPrice * qty,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: unitPrice * qty,
    payment_method: "cash",
    created_at: new Date().toISOString(),
  };
}

describe("topSellerProductIds", () => {
  it("returns empty when no orders", () => {
    expect(topSellerProductIds([], [], products)).toEqual([]);
  });

  it("ranks products by revenue in the last 7 days", () => {
    const orders = [order("p-a", 1, 10), order("p-b", 3, 30)];
    expect(topSellerProductIds(orders, [], products, 2)).toEqual(["p-b", "p-a"]);
  });
});
