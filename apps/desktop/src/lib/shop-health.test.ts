import { describe, expect, it } from "vitest";
import { buildActivityFeed, buildShopAlerts, computeShopHealth } from "./shop-health";
import type { Customer, Order, Product, Purchase, ReturnRecord } from "./types";

const product: Product = {
  id: "p1",
  branch_id: "b1",
  category_id: "c1",
  sku: "S1",
  barcode: "6291",
  name: "زيت",
  cost_price: 10,
  retail_price: 20,
  wholesale_price: 15,
  unit_type: "piece",
  track_stock: true,
  stock_quantity: 0,
  min_stock: 2,
  is_active: true,
};

const order: Order = {
  id: "o1",
  order_number: "INV-1",
  type: "pos_walk_in",
  status: "completed",
  customer_name: "أحمد",
  items: [],
  subtotal: 40,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 40,
  payment_method: "cash",
  created_at: "2026-08-12T10:00:00Z",
};

const ret: ReturnRecord = {
  id: "r1",
  return_number: "RET-1",
  order_id: "o1",
  order_number: "INV-1",
  refund_method: "cash",
  total_refund: 5,
  created_at: "2026-08-12T11:00:00Z",
  items: [],
};

const customer: Customer = {
  id: "c1",
  name: "أحمد",
  phone: "091",
  balance: 90,
  credit_limit: 100,
  created_at: "",
};

const purchase: Purchase = {
  id: "pu1",
  purchase_number: "PO-9",
  supplier_id: "s1",
  supplier_name: "مورد النور",
  items: [],
  total_cost: 70,
  status: "draft",
  created_at: "2026-08-12T09:00:00Z",
};

describe("buildShopAlerts", () => {
  it("flags out of stock, credit risk, drafts, and missing shift", () => {
    const alerts = buildShopAlerts({
      orders: [order],
      returns: [],
      products: [product],
      customers: [customer],
      expenses: [],
      purchases: [purchase],
      suppliers: [{ id: "s1", name: "مورد النور", phone: "1", balance: 40, created_at: "" }],
      openShift: null,
      workMode: "shift_based",
      pendingSync: 3,
    });
    const ids = alerts.map((a) => a.id);
    expect(ids).toContain("no-shift");
    expect(ids).toContain("out-of-stock");
    expect(ids).toContain("credit-risk");
    expect(ids).toContain("draft-purchases");
    expect(ids).toContain("payables");
    expect(ids).toContain("sync");
    expect(alerts.find((a) => a.id === "out-of-stock")?.tab).toBe("inventory");
    expect(alerts.find((a) => a.id === "credit-risk")?.customerId).toBe("c1");
  });

  it("flags a foreign open shift from the cloud", () => {
    const alerts = buildShopAlerts({
      orders: [],
      returns: [],
      products: [],
      customers: [],
      expenses: [],
      extraOpenShifts: 1,
      workMode: "open_sales",
    });
    expect(alerts.some((a) => a.id === "shift-conflict")).toBe(true);
  });
});

describe("buildActivityFeed", () => {
  it("merges sales, returns, expenses, and purchases newest first", () => {
    const feed = buildActivityFeed({
      orders: [order],
      returns: [ret],
      expenses: [
        {
          id: "e1",
          category: "إيجار",
          amount: 10,
          note: "",
          created_at: "2026-08-12T12:00:00Z",
        },
      ],
      purchases: [purchase],
    });
    expect(feed[0]?.kind).toBe("expense");
    expect(feed.some((i) => i.kind === "sale" && i.focusId === "o1")).toBe(true);
    expect(feed.some((i) => i.kind === "return" && i.tab === "returns")).toBe(true);
    expect(feed.some((i) => i.kind === "purchase" && i.focusId === "pu1")).toBe(true);
  });
});

describe("computeShopHealth", () => {
  it("returns today snapshot plus alerts", () => {
    const health = computeShopHealth({
      orders: [order],
      returns: [ret],
      products: [product],
      customers: [customer],
      expenses: [],
      openShift: null,
      workMode: "open_sales",
    });
    expect(health.today.returnsTotal).toBe(5);
    expect(health.criticalCount).toBeGreaterThan(0);
    expect(health.activity.length).toBeGreaterThan(0);
  });
});
