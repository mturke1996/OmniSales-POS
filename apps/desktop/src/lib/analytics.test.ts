import { describe, expect, it } from "vitest";
import { computeAnalytics } from "./analytics";
import type { Order, Product, Purchase, Supplier } from "./types";

const product: Product = {
  id: "p1",
  branch_id: "b1",
  category_id: "c1",
  sku: "S1",
  barcode: "B1",
  name: "منتج",
  cost_price: 10,
  retail_price: 20,
  wholesale_price: 15,
  unit_type: "piece",
  track_stock: true,
  stock_quantity: 1,
  min_stock: 5,
  is_active: true,
};

const completed: Order = {
  id: "o1",
  order_number: "INV-1",
  type: "pos_walk_in",
  status: "completed",
  items: [
    {
      product_id: "p1",
      name: "منتج",
      unit_price: 20,
      quantity: 2,
      unit_type: "piece",
    },
  ],
  subtotal: 40,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 40,
  payment_method: "cash",
  created_at: new Date().toISOString(),
};

const openDelivery: Order = {
  ...completed,
  id: "o2",
  order_number: "DEL-1",
  type: "delivery",
  status: "in_prep",
  total_amount: 30,
  items: [],
};

describe("computeAnalytics shop links", () => {
  it("counts completed gross, open deliveries, and low stock", () => {
    const snap = computeAnalytics({
      period: "today",
      orders: [completed, openDelivery],
      returns: [],
      products: [product],
      customers: [{ id: "c1", name: "أ", phone: "1", balance: 90, credit_limit: 100, created_at: "" }],
      expenses: [],
    });
    expect(snap.completedGross).toBe(40);
    expect(snap.openDeliveryCount).toBe(1);
    expect(snap.lowStock).toHaveLength(1);
    expect(snap.creditRiskCount).toBe(1);
    expect(snap.grossSales).toBe(70);
  });

  it("sums received purchases and supplier payables", () => {
    const purchases: Purchase[] = [
      {
        id: "pu1",
        purchase_number: "PO-1",
        supplier_id: "s1",
        supplier_name: "مورد",
        items: [],
        total_cost: 200,
        status: "received",
        created_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
        paid_amount: 50,
        payment_status: "partial",
      },
      {
        id: "pu2",
        purchase_number: "PO-2",
        supplier_id: "s1",
        supplier_name: "مورد",
        items: [],
        total_cost: 80,
        status: "draft",
        created_at: new Date().toISOString(),
      },
    ];
    const suppliers: Supplier[] = [
      { id: "s1", name: "مورد", phone: "091", balance: 150, created_at: "" },
    ];
    const snap = computeAnalytics({
      period: "today",
      orders: [],
      returns: [],
      products: [],
      customers: [],
      expenses: [],
      purchases,
      suppliers,
    });
    expect(snap.purchasesTotal).toBe(200);
    expect(snap.purchasesCount).toBe(1);
    expect(snap.unpaidPurchaseCount).toBe(1);
    expect(snap.draftPurchaseCount).toBe(1);
    expect(snap.supplierPayables).toBe(150);
  });
});
