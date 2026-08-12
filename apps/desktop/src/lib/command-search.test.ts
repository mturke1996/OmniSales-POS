import { describe, expect, it } from "vitest";
import { searchCommandResults, flattenCommandResults } from "./command-search";
import { NAV_ITEMS } from "./nav-config";
import type { Customer, Order, Product, ReturnRecord } from "./types";

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
  {
    id: "o2",
    order_number: "DEL-2002",
    type: "delivery",
    status: "in_prep",
    customer_name: "سارة",
    customer_phone: "0911111111",
    delivery_address: "طرابلس وسط",
    items: [],
    subtotal: 80,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 85,
    payment_method: "cash",
    created_at: "2026-01-02T10:00:00Z",
  },
];

const returns: ReturnRecord[] = [
  {
    id: "r1",
    return_number: "RET-501",
    order_id: "o1",
    order_number: "INV-1001",
    refund_method: "cash",
    total_refund: 10,
    created_at: "2026-01-03T10:00:00Z",
    items: [],
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
    const groups = searchCommandResults("", NAV_ITEMS, orders, customers, products, returns);
    expect(groups.navigation.length).toBe(NAV_ITEMS.length);
    expect(groups.invoices).toHaveLength(0);
  });

  it("finds invoices, customers, and products by query", () => {
    const groups = searchCommandResults("أحمد", NAV_ITEMS, orders, customers, products, returns);
    expect(groups.invoices).toHaveLength(1);
    expect(groups.customers).toHaveLength(1);
    expect(groups.invoices[0]?.orderId).toBe("o1");
    expect(groups.customers[0]?.customerId).toBe("c1");
  });

  it("finds active delivery orders", () => {
    const groups = searchCommandResults("DEL-2002", NAV_ITEMS, orders, customers, products, returns);
    expect(groups.deliveries).toHaveLength(1);
    expect(groups.deliveries[0]?.orderId).toBe("o2");
  });

  it("finds returns by number", () => {
    const groups = searchCommandResults("RET-501", NAV_ITEMS, orders, customers, products, returns);
    expect(groups.returns).toHaveLength(1);
    expect(groups.returns[0]?.orderId).toBe("o1");
  });

  it("finds products by barcode fragment", () => {
    const groups = searchCommandResults("6291", NAV_ITEMS, orders, customers, products, returns);
    expect(groups.products).toHaveLength(1);
    expect(groups.products[0]?.productId).toBe("p1");
    expect(groups.products[0]?.subtitle).toContain("مخزون");
  });

  it("finds purchases and suppliers", () => {
    const groups = searchCommandResults(
      "النور",
      NAV_ITEMS,
      orders,
      customers,
      products,
      returns,
      [
        {
          id: "pu1",
          purchase_number: "PO-88",
          supplier_id: "s1",
          supplier_name: "مورد النور",
          items: [],
          total_cost: 40,
          status: "draft",
          created_at: "2026-01-01T10:00:00Z",
        },
      ],
      [{ id: "s1", name: "مورد النور", phone: "092222", balance: 12, created_at: "" }]
    );
    expect(groups.purchases).toHaveLength(1);
    expect(groups.purchases[0]?.purchaseId).toBe("pu1");
    expect(groups.suppliers).toHaveLength(1);
    expect(groups.suppliers[0]?.supplierId).toBe("s1");
  });

  it("flattens groups in stable order", () => {
    const groups = searchCommandResults("أحمد", NAV_ITEMS, orders, customers, products, returns);
    const flat = flattenCommandResults(groups);
    expect(flat.some((r) => r.kind === "invoice")).toBe(true);
    expect(flat.some((r) => r.kind === "customer")).toBe(true);
  });

  it("surfaces lock, sync, and held-cart actions", () => {
    const groups = searchCommandResults("قفل", NAV_ITEMS, orders, customers, products, returns);
    expect(groups.actions.some((a) => a.action === "lock")).toBe(true);
  });

  it("lists register actions before navigation when the query is empty", () => {
    const groups = searchCommandResults("", NAV_ITEMS, orders, customers, products, returns, [], [], 2, 4);
    expect(groups.actions.map((a) => a.action)).toEqual(["lock", "sync", "held"]);
    expect(groups.actions.find((a) => a.action === "held")?.subtitle).toContain("2");
    const flat = flattenCommandResults(groups);
    expect(flat[0]?.kind).toBe("action");
  });
});
