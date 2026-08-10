import { describe, expect, it, beforeEach } from "vitest";
import {
  getPinnedProductIds,
  getAutoPinnedProductIds,
  getDisplayPinnedProductIds,
  setAutoPinnedProductIds,
  togglePinnedProductId,
} from "./pos-product-memory";
import { syncAutoPinnedTopSellers } from "./pos-auto-pin";
import type { Order, Product } from "./types";

function mockStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
}

function product(id: string, price: number): Product {
  return {
    id,
    branch_id: "b1",
    category_id: "c1",
    sku: id,
    barcode: id,
    name: id,
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

function order(productId: string, qty: number, unitPrice: number): Order {
  return {
    id: `o-${productId}`,
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

describe("pos-auto-pin", () => {
  beforeEach(() => {
    mockStorage();
    localStorage.clear();
  });

  it("auto-pins top sellers without evicting manual pins", () => {
    togglePinnedProductId("manual-1");
    const products = [product("manual-1", 10), product("top-a", 20), product("top-b", 30)];
    const orders = [order("top-a", 5, 20), order("top-b", 3, 30)];

    const display = syncAutoPinnedTopSellers(orders, [], products, 2);

    expect(getPinnedProductIds()).toEqual(["manual-1"]);
    expect(getAutoPinnedProductIds()).toEqual(["top-a", "top-b"]);
    expect(display[0]).toBe("manual-1");
    expect(display).toContain("top-b");
  });

  it("removes auto pin when user unpins", () => {
    setAutoPinnedProductIds(["auto-1"]);
    togglePinnedProductId("auto-1");
    expect(getAutoPinnedProductIds()).toEqual([]);
    expect(getDisplayPinnedProductIds()).toEqual([]);
  });
});
