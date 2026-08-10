import { describe, expect, it } from "vitest";
import { searchCommandResults, flattenCommandResults } from "./command-search";
import { NAV_ITEMS } from "./nav-config";
import type { Customer, Order, Product } from "./types";

const orders: Order[] = [
  {
    id: "o1",
    order_number: "INV-1001",
    type: "pos_walk_in",
    status: "completed",
    customer_name: "أحمد علي",
    items: [],
    subtotal: 50,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 50,
    payment_method: "cash",
    created_at: "2026-01-01T10:00:00Z",
  },
];

const customers: Customer[] = [
  {
    id: "c1",
    name: "أحمد علي",
    phone: "0912345678",
    balance: 25,
    credit_limit: 100,
    created_at: "2026-01-01T10:00:00Z",
  },
];

const products: Product[] = [
  {
    id: "p1",
    branch_id: "b1",
    category_id: "cat1",
    sku: "SKU-1",
    barcode: "6291000001",
    name: "زيت محرك",
    cost_price: 10,
    retail_price: 15,
    wholesale_price: 12,
    unit_type: "قطعة",
    track_stock: true,
    stock_quantity: 5,
    min_stock: 2,
    is_active: true,
  },
];

describe("searchCommandResults", () => {
  it("returns all nav items when query is empty", () => {
    const groups = searchCommandResults("", NAV_ITEMS, orders, customers, products);
    expect(groups.navigation.length).toBe(NAV_ITEMS.length);
    expect(groups.invoices).toHaveLength(0);
  });

  it("finds invoices, customers, and products by query", () => {
    const groups = searchCommandResults("أحمد", NAV_ITEMS, orders, customers, products);
    expect(groups.invoices).toHaveLength(1);
    expect(groups.customers).toHaveLength(1);
    expect(groups.invoices[0]?.orderId).toBe("o1");
    expect(groups.customers[0]?.customerId).toBe("c1");
  });

  it("finds products by barcode fragment", () => {
    const groups = searchCommandResults("6291", NAV_ITEMS, orders, customers, products);
    expect(groups.products).toHaveLength(1);
    expect(groups.products[0]?.productId).toBe("p1");
  });

  it("flattens groups in stable order", () => {
    const groups = searchCommandResults("أحمد", NAV_ITEMS, orders, customers, products);
    const flat = flattenCommandResults(groups);
    expect(flat.some((r) => r.kind === "invoice")).toBe(true);
    expect(flat.some((r) => r.kind === "customer")).toBe(true);
  });
});
